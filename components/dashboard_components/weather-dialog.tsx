"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { WeatherLocationPicker } from "@/components/dashboard_components/weather-location-picker";
import iconsDay from "@/public/icons/iconsDay";
import iconsNight from "@/public/icons/iconsNight";
import SunriseIcon from "@/public/icons/iconsDay/sunrise.jsx";
import SunsetIcon from "@/public/icons/iconsNight/sunset.jsx";
import type {
  HourlySlot,
  WeatherSnapshot,
} from "@/components/dashboard_components/weather-types";
import { loadWeather } from "@/lib/weather/load-weather";
import {
  readWeatherLocation,
  sameWeatherLocation,
  writeWeatherLocation,
  type WeatherLocation,
} from "@/lib/weather/location";

type WeatherIcon = ComponentType;

function iconForWeather(weatherCode: number, isDay: number) {
  const icons = (isDay ? iconsDay : iconsNight) as Record<number, WeatherIcon>;
  return icons[weatherCode] ?? icons[0];
}

function HourColumn({ slot }: { slot: HourlySlot }) {
  const Icon =
    slot.kind === "hour"
      ? iconForWeather(slot.weatherCode, slot.isDay)
      : slot.kind === "sunrise"
        ? SunriseIcon
        : SunsetIcon;

  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-2.5 px-1 text-center">
      <p
        className={
          slot.timeLabel === "Now"
            ? "whitespace-nowrap text-xs font-semibold"
            : "whitespace-nowrap text-xs font-medium text-muted-foreground"
        }
      >
        {slot.timeLabel}
      </p>
      <div className="size-12 shrink-0 [&>svg]:size-full">
        <Icon />
      </div>
      {slot.kind === "hour" ? (
        <p className="text-sm font-medium tabular-nums">{slot.temperature}°</p>
      ) : (
        <p className="text-[11px] font-medium leading-tight text-muted-foreground">
          {slot.eventLabel}
        </p>
      )}
    </div>
  );
}

export function WeatherDialog({ snapshot: initialSnapshot }: { snapshot: WeatherSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(false);
  const TriggerIcon = iconForWeather(snapshot.weatherCode, snapshot.isDay);

  const applyLocation = useCallback(async (location: WeatherLocation) => {
    setLoading(true);
    try {
      const next = await loadWeather(location);
      if (!next) throw new Error("Weather unavailable");
      writeWeatherLocation(location);
      setSnapshot(next);
      setPicking(false);
    } catch (error) {
      console.error("Failed to load weather:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readWeatherLocation();
    if (!stored || sameWeatherLocation(stored, initialSnapshot.location)) {
      return;
    }
    void applyLocation(stored);
  }, [applyLocation, initialSnapshot.location]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setPicking(false);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-0.5 rounded-lg px-1 py-0.5 transition-colors hover:cursor-pointer hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={`${snapshot.location.name} weather, ${snapshot.temperature} degrees. View hourly forecast.`}
          />
        }
      >
        <div className="size-10 shrink-0 [&>svg]:size-full">
          <TriggerIcon />
        </div>
        {snapshot.temperature}°F
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl pt-6" showCloseButton>
        <DialogHeader className="w-full items-center gap-0 text-center">
          <DialogTitle className="sr-only">
            {snapshot.location.name} weather
          </DialogTitle>
          <div className="flex w-full justify-center text-3xl font-light leading-none tracking-tight">
            {picking ? (
              <WeatherLocationPicker
                onSelect={(location) => {
                  void applyLocation(location);
                }}
                onCancel={() => setPicking(false)}
              />
            ) : (
              <button
                type="button"
                className="group inline-flex cursor-pointer items-center rounded-lg px-2 py-1 transition-colors duration-200 hover:bg-muted/60"
                aria-label={`Change weather location, currently ${snapshot.location.name}`}
                onClick={() => setPicking(true)}
              >
                <span>{snapshot.location.name}</span>
                <span
                  aria-hidden
                  className="grid grid-cols-[0fr] transition-[grid-template-columns,margin] duration-200 ease-out group-hover:ml-0.5 group-hover:grid-cols-[1fr]"
                >
                  <span className="min-w-0 overflow-hidden">
                    <ChevronDown className="size-6 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:delay-100" />
                  </span>
                </span>
              </button>
            )}
          </div>
          <p
            className={`w-full text-center translate-x-2 font-thin text-7xl -z-10 transition-opacity ${
              loading ? "opacity-40" : ""
            }`}
          >
            {snapshot.temperature}°
          </p>
          <DialogDescription className="w-full text-center text-lg font-semibold leading-tight text-foreground">
            {snapshot.condition}
          </DialogDescription>
          <p className="flex w-full justify-center mt-1 gap-2 text-center text-base font-light leading-tight text-foreground">
            <span>H:{snapshot.high}°</span>
            <span>L:{snapshot.low}°</span>
          </p>
        </DialogHeader>
        <div
          className={`overflow-hidden rounded-xl bg-muted/50 ring-1 ring-foreground/10 transition-opacity ${
            loading ? "opacity-40" : ""
          }`}
        >
          <p className="px-4 py-3 text-center text-sm text-muted-foreground">
            {snapshot.summary}
          </p>
          <Separator />
          <div className="relative">
            <div className="no-scrollbar overflow-x-auto px-2 py-3">
              <div className="flex w-max justify-center">
                {snapshot.hours.map((slot) => (
                  <HourColumn key={`${slot.kind}-${slot.timeMs}`} slot={slot} />
                ))}
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-muted/50 to-transparent"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
