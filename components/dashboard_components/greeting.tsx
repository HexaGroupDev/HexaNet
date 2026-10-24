import { Time } from "@/components/dashboard_components/time";
import { Weather, WeatherSkeleton } from "@/components/dashboard_components/weather";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

const TIME_ZONE = "America/Chicago";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function hourInZone(now: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;

  return Number(hour);
}

export function GreetingSkeleton() {
  return (
    <div className="mb-10 flex min-w-0 items-start justify-between gap-4 sm:gap-6" aria-busy="true">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-8 w-full max-w-64 sm:h-9 sm:max-w-80" />
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <Skeleton className="h-4 min-w-0 max-w-40 flex-1" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      </div>
      <WeatherSkeleton />
    </div>
  );
}

export async function Greeting() {
  const session = await getCachedSessionProfile();
  const name = session?.username?.split(/\s+/)[0] ?? "user";
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="mb-10 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {greetingForHour(hourInZone(now))}, {name}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
          <p>{date}</p>
          <Time />
        </div>
      </div>
      <Suspense fallback={<WeatherSkeleton />}>
        <Weather />
      </Suspense>
    </div>
  );
}
