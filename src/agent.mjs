import { Agent, BedrockModel, tool } from "@strands-agents/sdk";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { randomUUID } from "crypto";
import { z } from "zod";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});

// Resolved once per warm Lambda instance. Tries SSM first; falls back to the
// GOOGLE_MAPS_API_KEY env var so local/.env workflows work without SSM access.
// Production path: create /nube/google-maps-key via ssm:PutParameter and grant
// the execution role ssm:GetParameter — the env-var fallback is never needed there.
let resolvedMapsKey = null;
async function getMapsApiKey() {
  if (resolvedMapsKey) return resolvedMapsKey;
  try {
    const resp = await ssm.send(new GetParameterCommand({
      Name: "/nube/google-maps-key",
      WithDecryption: true,
    }));
    resolvedMapsKey = resp.Parameter.Value;
  } catch {
    // SSM unavailable or parameter missing — fall back to environment variable.
    resolvedMapsKey = process.env.GOOGLE_MAPS_API_KEY ?? null;
  }
  return resolvedMapsKey;
}

const model = new BedrockModel({
  modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
});

// ---------- Memory: same load/save as Module 2 ----------

async function loadHistory(sessionId) {
  const resp = await ddb.send(new GetCommand({
    TableName: process.env.SESSIONS_TABLE,
    Key: { sessionId },
  }));
  return resp.Item ? JSON.parse(resp.Item.messages) : [];
}

async function saveHistory(sessionId, messages) {
  await ddb.send(new PutCommand({
    TableName: process.env.SESSIONS_TABLE,
    Item: {
      sessionId,
      messages: JSON.stringify(messages),
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    },
  }));
}

// ---------- Trip history ----------

export async function saveTripRecord(userId, trip) {
  const record = await ddb.send(new GetCommand({
    TableName: process.env.SESSIONS_TABLE,
    Key: { sessionId: `trips#${userId}` },
  }));
  const trips = record.Item ? JSON.parse(record.Item.messages) : [];
  trips.unshift({ id: randomUUID(), savedAt: new Date().toISOString(), ...trip });
  await ddb.send(new PutCommand({
    TableName: process.env.SESSIONS_TABLE,
    Item: { sessionId: `trips#${userId}`, messages: JSON.stringify(trips) },
  }));
  return trips;
}

export async function getTrips(userId) {
  const record = await ddb.send(new GetCommand({
    TableName: process.env.SESSIONS_TABLE,
    Key: { sessionId: `trips#${userId}` },
  }));
  return record.Item ? JSON.parse(record.Item.messages) : [];
}

// ---------- Tools ----------

const getTransitRoute = tool({
  name: "get_transit_route",
  description: "Get public transit route, time, and transfers between two points in CDMX",
  inputSchema: z.object({
    origin: z.string().describe("Starting address or landmark in CDMX, e.g. 'Reforma 222, CDMX'"),
    destination: z.string().describe("Destination address or landmark in CDMX, e.g. 'Ángel de la Independencia, CDMX'"),
    departure_time: z.string().optional().describe("Desired departure time in ISO 8601 format, e.g. '2026-08-08T09:00:00-06:00'"),
  }),
  callback: async ({ origin, destination, departure_time }) => {
    const apiKey = await getMapsApiKey();
    if (!apiKey) return "Error: Google Maps API key not found. Set GOOGLE_MAPS_API_KEY in .env (local) or create the SSM parameter /nube/google-maps-key (production).";

    let departureEpoch = "now";
    if (departure_time) {
      const ts = Math.floor(new Date(departure_time).getTime() / 1000);
      if (isNaN(ts)) return `Error: departure_time '${departure_time}' is not a valid ISO 8601 date.`;
      departureEpoch = ts;
    }

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("mode", "transit");
    url.searchParams.set("departure_time", String(departureEpoch));
    url.searchParams.set("language", "es");
    url.searchParams.set("region", "mx");
    url.searchParams.set("key", apiKey);

    let data;
    try {
      const resp = await fetch(url.toString());
      data = await resp.json();
    } catch (err) {
      return `Error contacting Google Maps API: ${err.message}`;
    }

    if (data.status === "REQUEST_DENIED") return `Google Maps API error: ${data.error_message ?? "invalid or missing API key."}`;
    if (data.status === "OVER_QUERY_LIMIT") return "Google Maps API error: rate limit exceeded, try again later.";
    if (data.status === "NOT_FOUND" || data.status === "ZERO_RESULTS") return `No transit route found from '${origin}' to '${destination}'.`;
    if (data.status !== "OK") return `Google Maps API returned status: ${data.status}.`;

    const route = data.routes[0];
    const leg = route.legs[0];

    const steps = leg.steps
      .filter((s) => s.travel_mode === "TRANSIT")
      .map((s) => {
        const t = s.transit_details;
        return {
          mode: t.line?.vehicle?.name ?? "Transit",
          line: t.line?.short_name ?? t.line?.name ?? "?",
          from: t.departure_stop?.name,
          to: t.arrival_stop?.name,
          stops: t.num_stops,
          duration: s.duration?.text,
        };
      });

    const fare = route.fare ? `${route.fare.text}` : null;

    return JSON.stringify({
      duration: leg.duration?.text,
      distance: leg.distance?.text,
      departure: leg.departure_time?.text,
      arrival: leg.arrival_time?.text,
      transfers: Math.max(0, steps.length - 1),
      steps,
      ...(fare && { fare }),
    });
  },
});

const SYSTEM_PROMPT =
  "You are a travel planning agent for trips within CDMX. " +
  "Given an origin, destination, and target time, calculate total travel time, " +
  "estimated cost, and a scheduled itinerary. " +
  "Use your tools to get route distance/time, weather forecast, and fare estimates — never invent these values. " +
  "Support intermediate stops (eating, showering, errands) with user-given or reasonable default durations, and recalculate the full itinerary when any stop changes. " +
  "Factor in weather: adjust travel time and cost for rain or extreme heat, and warn the user. " +
  "Always offer at least 2 route options (fastest and cheapest) with a clear time/cost/weather-exposure tradeoff. " +
  "If the user gives an arrival deadline, work backward to the required departure time. " +
  "Be transparent when a number is an estimate, not a guarantee. " +
  "Keep responses short and scannable: a one-line summary, then the itinerary with concrete times.";

export async function* answerWith(message, sessionId, userId) {
  const history = await loadHistory(sessionId);

  const saveTripTool = tool({
    name: "save_trip",
    description: "Save a completed trip to the user's history. Call this when the user confirms a trip is done or asks to save it.",
    inputSchema: z.object({
      origin: z.string().describe("Starting point of the trip"),
      destination: z.string().describe("End point of the trip"),
      date: z.string().describe("Date of the trip in ISO 8601 format"),
      duration: z.string().optional().describe("Total travel duration, e.g. '45 min'"),
      summary: z.string().describe("One-line summary of the trip"),
    }),
    callback: async ({ origin, destination, date, duration, summary }) => {
      await saveTripRecord(userId, { origin, destination, date, duration, summary });
      return "Viaje guardado en tu historial.";
    },
  });

  const agent = new Agent({
    model,
    systemPrompt: SYSTEM_PROMPT,
    messages: history,
    tools: [getTransitRoute, saveTripTool],
    printer: false,
  });

  for await (const ev of agent.stream(message)) {
    if (ev.type === "modelStreamUpdateEvent" &&
        ev.event.type === "modelContentBlockDeltaEvent" &&
        ev.event.delta?.type === "textDelta") {
      yield { type: "token", text: ev.event.delta.text };
    } else if (ev.type === "beforeToolCallEvent") {
      yield { type: "tool", name: ev.toolUse?.name ?? "tool" };
    }
  }

  await saveHistory(sessionId, agent.messages);
}