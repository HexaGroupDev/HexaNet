export type WeatherLocation = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  name: "Houston",
  latitude: 29.737679,
  longitude: -95.470105,
  timezone: "America/Chicago",
};

const STORAGE_KEY = "hexanet.weather-location";

function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.latitude === "number" &&
    Number.isFinite(item.latitude) &&
    typeof item.longitude === "number" &&
    Number.isFinite(item.longitude) &&
    typeof item.timezone === "string" &&
    item.timezone.trim().length > 0
  );
}

export function sameWeatherLocation(
  a: WeatherLocation,
  b: WeatherLocation,
) {
  return (
    Math.abs(a.latitude - b.latitude) < 0.0001 &&
    Math.abs(a.longitude - b.longitude) < 0.0001
  );
}

export function readWeatherLocation(): WeatherLocation | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isWeatherLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeWeatherLocation(location: WeatherLocation) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}
