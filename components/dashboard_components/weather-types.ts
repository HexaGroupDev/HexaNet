import type { WeatherLocation } from "@/lib/weather/location";

export type HourlySlot =
  | {
      kind: "hour";
      timeMs: number;
      timeLabel: string;
      temperature: number;
      weatherCode: number;
      isDay: number;
    }
  | {
      kind: "sunrise" | "sunset";
      timeMs: number;
      timeLabel: string;
      eventLabel: string;
    };

export type WeatherSnapshot = {
  location: WeatherLocation;
  temperature: number;
  condition: string;
  weatherCode: number;
  isDay: number;
  high: number;
  low: number;
  summary: string;
  hours: HourlySlot[];
};
