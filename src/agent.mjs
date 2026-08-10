import { Agent, tool } from "@strands-agents/sdk";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getSession, putSession, getPlan, putPlan } from "./db.mjs";

// Use AnthropicModel when ANTHROPIC_API_KEY is set, Bedrock otherwise (Lambda)
let model;
if (process.env.ANTHROPIC_API_KEY) {
  const { AnthropicModel } = await import("@strands-agents/sdk/dist/src/models/anthropic.js");
  model = new AnthropicModel({ modelId: "claude-haiku-4-5-20251001" });
} else {
  const { BedrockModel } = await import("@strands-agents/sdk");
  model = new BedrockModel({ modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0" });
}

function getMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY ?? null;
}

// ---------- Memory ----------

function loadHistory(sessionId) {
  const row = getSession(sessionId);
  return row ? JSON.parse(row.messages) : [];
}

function saveHistory(sessionId, messages) {
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  putSession(sessionId, JSON.stringify(messages), expiresAt);
}

// ---------- Trip history ----------

export function saveTripRecord(userId, trip) {
  const key = `trips#${userId}`;
  const row = getSession(key);
  const trips = row ? JSON.parse(row.messages) : [];
  trips.unshift({ id: randomUUID(), savedAt: new Date().toISOString(), ...trip });
  putSession(key, JSON.stringify(trips), null);
  return trips;
}

export function getTrips(userId) {
  const row = getSession(`trips#${userId}`);
  return row ? JSON.parse(row.messages) : [];
}

export { getPlan };

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
    const apiKey = getMapsApiKey();
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

const SYSTEM_PROMPT = `Eres un agente de planificación de día para transporte público en CDMX. Ayudas al usuario a no llegar tarde planeando todo lo que necesita hacer antes de salir.

HERRAMIENTAS DISPONIBLES:
- get_weather_cdmx: clima actual en CDMX. Úsala antes de cualquier ruta.
- get_transit_route: hasta 3 opciones de ruta real (Metro, Metrobús, RTP, tramos a pie). Úsala siempre que el usuario pida una ruta.
- plan_day: genera un pipeline completo del día (pasos como bañarse, desayunar, salir, tomar transporte, llegar) y lo guarda para mostrarse en la pantalla principal. Úsala cuando el usuario describa un plan o evento futuro con destino y hora.

REGLAS:
1. Nunca inventes rutas, tiempos ni tarifas — usa únicamente los datos de las herramientas.
2. Para plan_day: llama primero a get_weather_cdmx y get_transit_route para tener tiempos reales, luego genera el pipeline retrocediendo desde la hora de llegada.
3. Cada paso del pipeline debe tener: tipo (prep/transit/walk/arrive), label, hora de inicio, duración en minutos y tolerancia sugerida.
4. Añade pasos de preparación realistas (bañarse ~20 min, desayunar ~15 min, vestirse ~10 min) antes del transporte.
5. Si llueve, agrega 10 min de tolerancia a los pasos de caminar y transporte superficial.
6. Al responder al usuario después de plan_day, confirma el plan con un resumen legible y la hora de salida calculada.`;


export async function* answerWith(message, sessionId, userId) {
  const history = loadHistory(sessionId);

  const planDayTool = tool({
    name: "plan_day",
    description: "Generate a full-day pipeline and save it as the user's active plan shown on the home screen. Call this when the user describes a future event with a destination and arrival time.",
    inputSchema: z.object({
      event_label: z.string().describe("Short name for the event, e.g. 'Palacio de Bellas Artes con novia'"),
      destination: z.string().describe("Destination address or landmark"),
      arrival_time: z.string().describe("Desired arrival time in ISO 8601, e.g. '2026-08-11T10:00:00-06:00'"),
      origin: z.string().describe("Starting address (user's home or current location)"),
      transit_duration_min: z.number().describe("Transit duration in minutes from get_transit_route"),
      transit_summary: z.string().describe("Best route summary, e.g. 'Metro Línea 2 + Metrobús L4'"),
      rain_warning: z.boolean().describe("True if weather tool reported active rain"),
      extra_notes: z.string().optional().describe("Any extra context, e.g. 'llevar paraguas, comprar flores'"),
    }),
    callback: ({ event_label, destination, arrival_time, origin, transit_duration_min, transit_summary, rain_warning, extra_notes }) => {
      const arrivalMs = new Date(arrival_time).getTime();
      const toleranceMin = rain_warning ? 15 : 10;
      const steps = [];

      // Build pipeline backwards from arrival
      let cursor = arrivalMs;

      steps.unshift({ type: "arrive", label: `Llegar a ${destination}`, start: null, duration: 0 });

      cursor -= toleranceMin * 60000;
      steps.unshift({ type: "transit", label: transit_summary, start: null, duration: transit_duration_min + toleranceMin });

      cursor -= (transit_duration_min + toleranceMin) * 60000;
      steps.unshift({ type: "walk",  label: "Caminar a la estación", start: null, duration: rain_warning ? 15 : 10 });

      cursor -= (rain_warning ? 15 : 10) * 60000;
      steps.unshift({ type: "prep",  label: "Vestirse y preparar bolso", start: null, duration: 10 });

      cursor -= 10 * 60000;
      steps.unshift({ type: "prep",  label: "Desayunar", start: null, duration: 15 });

      cursor -= 15 * 60000;
      steps.unshift({ type: "prep",  label: "Bañarse y arreglarse", start: null, duration: 20 });

      cursor -= 20 * 60000;
      steps.unshift({ type: "prep",  label: "Despertar", start: null, duration: 5 });

      // Fill start times forward from wake-up
      let t = cursor;
      for (const s of steps) {
        s.start = new Date(t).toISOString();
        t += s.duration * 60000;
      }
      // arrival step gets actual arrival time
      steps[steps.length - 1].start = arrival_time;

      const plan = {
        id: randomUUID(),
        event_label,
        destination,
        origin,
        arrival_time,
        transit_summary,
        rain_warning,
        extra_notes: extra_notes ?? null,
        wake_time: steps[0].start,
        depart_time: steps.find(s => s.type === "walk")?.start ?? null,
        steps,
        created_at: new Date().toISOString(),
      };

      putPlan(userId, plan);
      return JSON.stringify({ ok: true, wake_time: plan.wake_time, depart_time: plan.depart_time, steps: plan.steps.length });
    },
  });

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
    callback: ({ origin, destination, date, duration, summary }) => {
      saveTripRecord(userId, { origin, destination, date, duration, summary });
      return "Viaje guardado en tu historial.";
    },
  });

  const agent = new Agent({
    model,
    systemPrompt: SYSTEM_PROMPT,
    messages: history,
    tools: [getWeatherCdmx, getTransitRoute, planDayTool, saveTripTool],
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

  saveHistory(sessionId, agent.messages);
}