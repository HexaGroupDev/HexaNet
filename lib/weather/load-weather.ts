import { fetchWeatherApi } from "openmeteo";
import type {
  HourlySlot,
  WeatherSnapshot,
} from "@/components/dashboard_components/weather-types";
import type { WeatherLocation } from "@/lib/weather/location";

function range(start: number, stop: number, step: number) {
  return Array.from(
    { length: (stop - start) / step },
    (_, index) => start + index * step,
  );
}

function ymdInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hourInZone(date: Date, timeZone: string) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  return Number(hour);
}

function compactTime(date: Date, timeZone: string, withMinutes: boolean) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: withMinutes ? "2-digit" : undefined,
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value;
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "")
    .replaceAll(".", "")
    .replaceAll(" ", "")
    .toUpperCase();
  if (withMinutes && minute) return `${hour}:${minute}${period}`;
  return `${hour}${period}`;
}

function conditionLabel(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 56 || code === 57) return "Icy Drizzle";
  if (code === 61) return "Light Rain";
  if (code === 63 || code === 80 || code === 81) return "Rain";
  if (code === 65 || code === 82) return "Heavy Rain";
  if (code === 66 || code === 67) return "Icy Rain";
  if (code === 71 || code === 73 || code === 85) return "Snow";
  if (code === 75 || code === 86) return "Heavy Snow";
  if (code === 77) return "Snow Grains";
  if (code === 95) return "Thunderstorms";
  if (code === 96 || code === 99) return "Thunderstorms";
  return "Partly Cloudy";
}

function conditionCategory(code: number) {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
  if (code <= 86) return "snow";
  return "storm";
}

function buildSummary(
  hours: Extract<HourlySlot, { kind: "hour" }>[],
  currentCode: number,
  maxGust: number,
) {
  const parts: string[] = [];
  const upcomingChange = hours.slice(1).find(
    (hour) =>
      conditionCategory(hour.weatherCode) !== conditionCategory(currentCode),
  );

  if (upcomingChange) {
    parts.push(
      `${conditionLabel(upcomingChange.weatherCode)} conditions expected around ${upcomingChange.timeLabel}.`,
    );
  } else {
    parts.push(
      `${conditionLabel(currentCode)} conditions expected through the rest of the day.`,
    );
  }

  if (maxGust >= 5) {
    parts.push(`Wind gusts are up to ${Math.round(maxGust)} mph.`);
  }

  return parts.join(" ");
}

export async function loadWeather(
  location: WeatherLocation,
): Promise<WeatherSnapshot | null> {
  const params = {
    latitude: location.latitude,
    longitude: location.longitude,
    current: ["is_day", "temperature_2m", "weather_code", "wind_gusts_10m"],
    hourly: ["temperature_2m", "weather_code", "is_day", "wind_gusts_10m"],
    daily: ["temperature_2m_max", "temperature_2m_min", "sunrise", "sunset"],
    timezone: location.timezone,
    forecast_days: 1,
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
  };

  const responses = await fetchWeatherApi(
    "https://api.open-meteo.com/v1/forecast",
    params,
  );
  const response = responses[0];
  if (!response) return null;

  const timeZone = response.timezone() || location.timezone;
  const current = response.current();
  const hourly = response.hourly();
  const daily = response.daily();
  if (!current || !hourly || !daily) return null;

  const now = new Date();
  const today = ymdInZone(now, timeZone);
  const currentHour = hourInZone(now, timeZone);

  const temperatures = hourly.variables(0)?.valuesArray() ?? [];
  const weatherCodes = hourly.variables(1)?.valuesArray() ?? [];
  const isDayValues = hourly.variables(2)?.valuesArray() ?? [];
  const gusts = hourly.variables(3)?.valuesArray() ?? [];
  const hourlyTimes = range(
    Number(hourly.time()),
    Number(hourly.timeEnd()),
    hourly.interval(),
  ).map((timestamp) => new Date(timestamp * 1000));

  const remainingHours: Extract<HourlySlot, { kind: "hour" }>[] = [];
  let maxGust = current.variables(3)?.value() ?? 0;

  for (let index = 0; index < hourlyTimes.length; index += 1) {
    const time = hourlyTimes[index];
    if (ymdInZone(time, timeZone) !== today) continue;
    if (hourInZone(time, timeZone) < currentHour) continue;

    const gust = gusts[index] ?? 0;
    if (gust > maxGust) maxGust = gust;

    remainingHours.push({
      kind: "hour",
      timeMs: time.getTime(),
      timeLabel:
        hourInZone(time, timeZone) === currentHour
          ? "Now"
          : compactTime(time, timeZone, false),
      temperature: Math.round(temperatures[index] ?? 0),
      weatherCode: Math.round(weatherCodes[index] ?? 0),
      isDay: isDayValues[index] ?? 1,
    });
  }

  const hours: HourlySlot[] = [...remainingHours];
  const sunriseUnix = daily.variables(2)?.valuesInt64(0);
  const sunsetUnix = daily.variables(3)?.valuesInt64(0);

  if (sunriseUnix != null) {
    const sunrise = new Date(Number(sunriseUnix) * 1000);
    if (
      sunrise.getTime() >= now.getTime() &&
      ymdInZone(sunrise, timeZone) === today
    ) {
      hours.push({
        kind: "sunrise",
        timeMs: sunrise.getTime(),
        timeLabel: compactTime(sunrise, timeZone, true),
        eventLabel: "Sunrise",
      });
    }
  }

  if (sunsetUnix != null) {
    const sunset = new Date(Number(sunsetUnix) * 1000);
    if (
      sunset.getTime() >= now.getTime() &&
      ymdInZone(sunset, timeZone) === today
    ) {
      hours.push({
        kind: "sunset",
        timeMs: sunset.getTime(),
        timeLabel: compactTime(sunset, timeZone, true),
        eventLabel: "Sunset",
      });
    }
  }

  hours.sort((a, b) => a.timeMs - b.timeMs);

  const weatherCode = Math.round(current.variables(2)?.value() ?? 0);

  return {
    location: {
      ...location,
      timezone: timeZone,
    },
    temperature: Math.round(current.variables(1)?.value() ?? 0),
    condition: conditionLabel(weatherCode),
    weatherCode,
    isDay: current.variables(0)?.value() ?? 1,
    high: Math.round(daily.variables(0)?.values(0) ?? 0),
    low: Math.round(daily.variables(1)?.values(0) ?? 0),
    summary: buildSummary(remainingHours, weatherCode, maxGust),
    hours,
  };
}
