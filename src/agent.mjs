import { Agent, BedrockModel, tool } from "@strands-agents/sdk";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { loadProfile, saveProfile } from "./userProfile.mjs";

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

function parseSteps(steps) {
  return steps.map((s) => {
    if (s.travel_mode === "WALKING") {
      return { mode: "Caminar", duration: s.duration?.text, distance: s.distance?.text };
    }
    const t = s.transit_details;
    return {
      mode: t.line?.vehicle?.name ?? "Transporte",
      line: t.line?.short_name ?? t.line?.name ?? "?",
      color: t.line?.color ?? null,
      from: t.departure_stop?.name,
      to: t.arrival_stop?.name,
      departure: t.departure_time?.text ?? null,
      arrival: t.arrival_time?.text ?? null,
      stops: t.num_stops,
      duration: s.duration?.text,
    };
  });
}

const getTransitRoute = tool({
  name: "get_transit_route",
  description: "Get up to 3 real public transit route options (Metro, Metrobús, RTP, walking legs) between two points in CDMX, with accurate times and stop names.",
  inputSchema: z.object({
    origin: z.string().describe("Starting address or landmark in CDMX, e.g. 'Insurgentes Sur 1602, CDMX'"),
    destination: z.string().describe("Destination address or landmark in CDMX, e.g. 'Zócalo, Ciudad de México'"),
    departure_time: z.string().optional().describe("Desired departure time in ISO 8601 format, e.g. '2026-08-08T09:00:00-06:00'. Omit for 'now'."),
  }),
  callback: async ({ origin, destination, departure_time }) => {
    const apiKey = await getMapsApiKey();
    if (!apiKey) return "Error: Google Maps API key not found. Set GOOGLE_MAPS_API_KEY in .env (local) or create the SSM parameter /nube/google-maps-key (production).";

    let departureEpoch = String(Math.floor(Date.now() / 1000));
    if (departure_time) {
      const ts = Math.floor(new Date(departure_time).getTime() / 1000);
      if (isNaN(ts)) return `Error: departure_time '${departure_time}' is not a valid ISO 8601 date.`;
      departureEpoch = String(ts);
    }

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("mode", "transit");
    url.searchParams.set("alternatives", "true");
    url.searchParams.set("departure_time", departureEpoch);
    url.searchParams.set("transit_routing_preference", "fewer_transfers");
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
    if (data.status === "NOT_FOUND" || data.status === "ZERO_RESULTS") return `No se encontraron rutas de transporte público de '${origin}' a '${destination}'.`;
    if (data.status !== "OK") return `Google Maps API returned status: ${data.status}.`;

    const routes = data.routes.slice(0, 3).map((route) => {
      const leg = route.legs[0];
      const transitSteps = leg.steps.filter((s) => s.travel_mode === "TRANSIT");
      const fare = route.fare ? route.fare.text : null;
      return {
        summary: route.summary || `Opción vía ${transitSteps.map((s) => s.transit_details?.line?.short_name ?? s.transit_details?.line?.name ?? "?").join(" + ")}`,
        duration_total: leg.duration?.text,
        duration_seconds: leg.duration?.value,
        distance: leg.distance?.text,
        departure: leg.departure_time?.text ?? null,
        arrival: leg.arrival_time?.text ?? null,
        transfers: Math.max(0, transitSteps.length - 1),
        fare,
        steps: parseSteps(leg.steps),
      };
    });

    return JSON.stringify({ routes });
  },
});

const getWeatherCdmx = tool({
  name: "get_weather_cdmx",
  description: "Get current weather conditions in Mexico City (CDMX): temperature, rain probability, and a plain-language condition. Use this before estimating travel time so you can warn about rain delays or heat.",
  inputSchema: z.object({}),
  callback: async () => {
    // Open-Meteo — free, no API key required. Coords: CDMX city center.
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", "19.4326");
    url.searchParams.set("longitude", "-99.1332");
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weathercode,windspeed_10m");
    url.searchParams.set("hourly", "precipitation_probability");
    url.searchParams.set("forecast_hours", "3");
    url.searchParams.set("timezone", "America/Mexico_City");

    let data;
    try {
      const resp = await fetch(url.toString());
      data = await resp.json();
    } catch (err) {
      return `Error fetching weather: ${err.message}`;
    }

    const c = data.current;
    // WMO weather code → human label (subset covering CDMX common cases)
    const WMO = {
      0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
      45: "Niebla", 48: "Niebla con escarcha",
      51: "Llovizna ligera", 53: "Llovizna moderada", 55: "Llovizna intensa",
      61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia intensa",
      80: "Chubascos ligeros", 81: "Chubascos moderados", 82: "Chubascos intensos",
      95: "Tormenta eléctrica", 96: "Tormenta con granizo", 99: "Tormenta con granizo intenso",
    };
    const condition = WMO[c.weathercode] ?? `Código WMO ${c.weathercode}`;

    // Next-3h max rain probability from hourly data
    const rainProb = data.hourly?.precipitation_probability
      ? Math.max(...data.hourly.precipitation_probability.slice(0, 3))
      : null;

    const isRainy = c.weathercode >= 51;
    const isHot = c.temperature_2m >= 30;

    return JSON.stringify({
      condition,
      temperature_c: c.temperature_2m,
      humidity_pct: c.relative_humidity_2m,
      precipitation_mm: c.precipitation,
      wind_kmh: c.windspeed_10m,
      rain_probability_next3h_pct: rainProb,
      travel_warning: isRainy
        ? "Lluvia activa — agrega 5-10 min por trasbordos a pie y posible retraso en superficie."
        : isHot
        ? "Calor intenso — considera hidratación y rutas con más tramos bajo techo."
        : null,
    });
  },
});

const SYSTEM_PROMPT = `Eres un agente de planificación de viajes en transporte público dentro de la CDMX.

HERRAMIENTAS DISPONIBLES:
- get_transit_route: obtiene hasta 3 opciones de ruta real (Metro, Metrobús, RTP, tramos a pie) con tiempos, paradas y tarifa. Úsala siempre que el usuario pida una ruta.
- get_weather_cdmx: obtiene el clima actual en CDMX (temperatura, lluvia, condición). Úsala antes de estimar tiempos para ajustar por lluvia o calor.

REGLAS:
1. Nunca inventes rutas, tiempos, nombres de líneas ni tarifas — usa únicamente los datos que devuelven las herramientas.
2. Llama a get_weather_cdmx primero para cada consulta de ruta, luego a get_transit_route.
3. Si hay lluvia activa (precipitation_mm > 0 o weathercode ≥ 51), añade el tiempo de advertencia al total y avisa al usuario.
4. Presenta siempre las opciones de ruta devueltas (hasta 3), indicando cuál es la más rápida y cuál tiene menos transbordos.
5. Si el usuario da una hora de llegada, calcula la hora de salida necesaria restando la duración total al arribo deseado.
6. Formato de respuesta: una línea resumen, luego tabla/lista con cada opción (líneas usadas → duración → tarifa → advertencia de clima si aplica).
7. Sé explícito cuando un dato es estimado y no garantizado.`;


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
    tools: [getWeatherCdmx, getTransitRoute, saveTripTool],
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