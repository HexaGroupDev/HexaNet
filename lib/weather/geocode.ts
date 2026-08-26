import type { WeatherLocation } from "@/lib/weather/location";

export type GeocodedPlace = WeatherLocation & {
  id: number;
  admin1: string | null;
  country: string | null;
};

type GeocodingResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  admin1?: string;
  country?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

export function placeSubtitle(place: GeocodedPlace) {
  return [place.admin1, place.country].filter(Boolean).join(", ");
}

export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  const name = query.trim();
  if (name.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to search locations");
  }

  const data = (await response.json()) as GeocodingResponse;
  const places: GeocodedPlace[] = [];

  for (const result of data.results ?? []) {
    if (
      typeof result.id !== "number" ||
      typeof result.name !== "string" ||
      typeof result.latitude !== "number" ||
      typeof result.longitude !== "number" ||
      typeof result.timezone !== "string" ||
      !result.timezone
    ) {
      continue;
    }

    places.push({
      id: result.id,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
      admin1: result.admin1?.trim() || null,
      country: result.country?.trim() || null,
    });
  }

  return places;
}
