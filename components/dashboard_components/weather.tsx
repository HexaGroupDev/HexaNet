import { WeatherDialog } from "@/components/dashboard_components/weather-dialog";
import type { WeatherSnapshot } from "@/components/dashboard_components/weather-types";
import { loadWeather } from "@/lib/weather/load-weather";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/location";

export async function Weather() {
  let snapshot: WeatherSnapshot | null = null;

  try {
    snapshot = await loadWeather(DEFAULT_WEATHER_LOCATION);
  } catch (error) {
    console.error("Failed to load weather:", error);
  }

  if (!snapshot) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Weather unavailable
      </p>
    );
  }

  return <WeatherDialog snapshot={snapshot} />;
}
