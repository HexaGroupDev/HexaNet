import { WeatherDialog } from "@/components/dashboard_components/weather-dialog";
import type { WeatherSnapshot } from "@/components/dashboard_components/weather-types";
import { loadWeather } from "@/lib/weather/load-weather";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/location";
import { Skeleton } from "@/components/ui/skeleton";

export function WeatherSkeleton() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-busy="true">
      <Skeleton className="size-10 rounded-lg" />
      <Skeleton className="h-5 w-12" />
      <Skeleton className="size-4 rounded-sm" />
    </div>
  );
}

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
