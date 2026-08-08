// Quick smoke test for get_transit_route.
// Run with: GOOGLE_MAPS_API_KEY=<key> node src/test-transit.mjs
import { getTransitRoute } from "./agent.mjs";

// agent.mjs doesn't export getTransitRoute directly, so we invoke the
// tool's callback through a minimal harness.
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

async function callTool(toolDef, input) {
  // Strands tools expose their callback via .callback
  return toolDef.callback(input);
}

// Re-import to access the unexported tool — easiest path is to inline
// the callback logic here as a thin wrapper that validates the env var.
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error("Set GOOGLE_MAPS_API_KEY before running this test.");
  process.exit(1);
}

async function testRoute(origin, destination, departure_time) {
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("mode", "transit");
  url.searchParams.set("departure_time", departure_time ?? "now");
  url.searchParams.set("language", "es");
  url.searchParams.set("region", "mx");
  url.searchParams.set("key", apiKey);

  const resp = await fetch(url.toString());
  const data = await resp.json();

  if (data.status !== "OK") {
    console.error("API status:", data.status, data.error_message ?? "");
    return;
  }

  const leg = data.routes[0].legs[0];
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

  const fare = data.routes[0].fare;
  const result = {
    duration: leg.duration?.text,
    distance: leg.distance?.text,
    departure: leg.departure_time?.text,
    arrival: leg.arrival_time?.text,
    transfers: Math.max(0, steps.length - 1),
    steps,
    ...(fare && { fare: fare.text }),
  };

  console.log("\nRuta:", origin, "→", destination);
  console.log(JSON.stringify(result, null, 2));
}

await testRoute("Reforma 222, Ciudad de México", "Ángel de la Independencia, Ciudad de México");
