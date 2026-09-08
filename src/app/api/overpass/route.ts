import { NextRequest, NextResponse } from "next/server";

// Cache in server memory for 1 hour
interface CacheEntry {
  timestamp: number;
  data: any[];
}

const serverCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const s = searchParams.get("s");
  const w = searchParams.get("w");
  const n = searchParams.get("n");
  const e = searchParams.get("e");

  if (!s || !w || !n || !e) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  // Round coordinates to 2 decimal places to maximize cache hits
  const roundedS = Number(parseFloat(s).toFixed(2));
  const roundedW = Number(parseFloat(w).toFixed(2));
  const roundedN = Number(parseFloat(n).toFixed(2));
  const roundedE = Number(parseFloat(e).toFixed(2));

  const cacheKey = `${roundedS}_${roundedW}_${roundedN}_${roundedE}`;
  const cached = serverCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  }

  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](${roundedS},${roundedW},${roundedN},${roundedE});
      node["amenity"="clinic"]["healthcare:free"="yes"](${roundedS},${roundedW},${roundedN},${roundedE});
      node["amenity"="clinic"]["operator:type"="public"](${roundedS},${roundedW},${roundedN},${roundedE});
      node["amenity"="clinic"]["operator:type"="government"](${roundedS},${roundedW},${roundedN},${roundedE});
      node["healthcare"="centre"](${roundedS},${roundedW},${roundedN},${roundedE});
      node["healthcare"="hospital"](${roundedS},${roundedW},${roundedN},${roundedE});
      way["amenity"="hospital"](${roundedS},${roundedW},${roundedN},${roundedE});
      way["healthcare"="centre"](${roundedS},${roundedW},${roundedN},${roundedE});
    );
    out center 150;
  `;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SUMA-Health-Platform/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) continue;

      const data = await resp.json();
      const facilities: any[] = [];
      const seen = new Set<string>();

      for (const el of data.elements || []) {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng) continue;

        const name = el.tags?.name || el.tags?.["name:es"] || "Centro de Salud";
        const key = `${name}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let type = "health_centre";
        if (el.tags?.amenity === "hospital" || el.tags?.healthcare === "hospital") {
          type = "hospital";
        } else if (el.tags?.amenity === "clinic") {
          type = "clinic";
        }

        facilities.push({
          id: el.id,
          name,
          type,
          lat,
          lng,
          address: el.tags?.["addr:street"]
            ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}`
            : undefined,
          phone: el.tags?.phone || el.tags?.["contact:phone"],
          operator: el.tags?.operator,
          emergency: el.tags?.emergency === "yes",
        });
      }

      serverCache.set(cacheKey, { timestamp: Date.now(), data: facilities });

      return NextResponse.json(facilities, {
        headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      });
    } catch {
      // Try next endpoint
    }
  }

  // Fallback to empty array gracefully
  return NextResponse.json([]);
}
