"use client";

import { useEffect, useState } from "react";

const TIME_ZONE = "America/Chicago";

function formatTime(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}

function timePartsInZone(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return { hour: value("hour"), minute: value("minute") };
}

function AnalogClock({ now }: { now: Date }) {
  const { hour, minute } = timePartsInZone(now);

  return (
    <svg viewBox="0 0 32 32" className="size-4 shrink-0" aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" className="stroke-foreground/25" strokeWidth="1.25" />
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
        transform={`rotate(${((hour % 12) + minute / 60) * 30} 16 16)`}
      />
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
        transform={`rotate(${minute * 6} 16 16)`}
      />
    </svg>
  );
}

export function Time() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5" suppressHydrationWarning>
      <AnalogClock now={now} />
      <p className="tracking-tight" suppressHydrationWarning>
        {formatTime(now)}
      </p>
    </div>
  );
}
