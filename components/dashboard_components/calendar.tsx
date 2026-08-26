"use client";

import { useEffect, useMemo, useState } from "react";
import { Cake, Check, Link } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

const UPCOMING_EVENTS = [
  {
    id: "romeo-weekly-status",
    title: "Romeo weekly status",
    time: "3:00 PM",
    daysFromToday: 0,
  },
];

const TIME_ZONE = "America/Chicago";
const UPCOMING_DAYS = 7;
const WISHES_STORAGE_KEY = "hexanet.birthday-wishes";

type ProfileBirthday = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  birthday: string;
};

type UpcomingBirthday = ProfileBirthday & {
  days: number;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function todayInZone(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { month: Number(match[2]), day: Number(match[3]) };
}

function daysUntilBirthday(iso: string, todayYmd: string) {
  const parsed = parseDateOnly(iso);
  if (!parsed) return null;
  const [year, month, day] = todayYmd.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  let next = Date.UTC(year, parsed.month - 1, parsed.day);
  if (next < start) {
    next = Date.UTC(year + 1, parsed.month - 1, parsed.day);
  }
  return Math.round((next - start) / 86_400_000);
}

function birthdayLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

function eventDateParts(todayYmd: string, daysFromToday: number) {
  const [year, month, day] = todayYmd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + daysFromToday));
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
    day: String(date.getUTCDate()),
  };
}

function wishKey(todayYmd: string, wisherId: string, personId: string) {
  return `${todayYmd}:${wisherId}:${personId}`;
}

function readWishedKeys() {
  try {
    const raw = window.localStorage.getItem(WISHES_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeWishedKeys(keys: Set<string>) {
  window.localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify([...keys]));
}

function WishBirthdayButton({
  personId,
  name,
  todayYmd,
  wisherId,
}: {
  personId: string;
  name: string;
  todayYmd: string;
  wisherId: string;
}) {
  const key = wishKey(todayYmd, wisherId, personId);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    setWished(readWishedKeys().has(key));
  }, [key]);

  function handleWish() {
    const next = readWishedKeys();
    next.add(key);
    writeWishedKeys(next);
    setWished(true);
  }

  if (wished) {
    return (
      <Button type="button" size="xs" variant="ghost" disabled>
        <Check />
        Wished
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      aria-label={`Wish ${name} a happy birthday`}
      onClick={handleWish}
    >
      <Cake />
      Wish
    </Button>
  );
}

export function Calendar() {
  const [people, setPeople] = useState<ProfileBirthday[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const todayYmd = todayInZone();

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadBirthdays() {
      const [{ data: sessionData }, { data: profiles, error: loadError }] =
        await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("profiles")
            .select("id, username, avatar_url, birthday")
            .not("birthday", "is", null),
        ]);

      if (!active) return;

      if (loadError) {
        console.error("Failed to load birthdays:", loadError.message);
        setError(loadError.message);
        setPeople([]);
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(false);
      setCurrentUserId(sessionData.session?.user.id ?? null);
      setPeople(
        (profiles ?? []).flatMap((profile) => {
          const birthday =
            typeof profile.birthday === "string" && profile.birthday.trim() !== ""
              ? profile.birthday.trim()
              : null;
          if (!birthday) return [];
          return [
            {
              id: profile.id,
              username:
                typeof profile.username === "string" &&
                profile.username.trim() !== ""
                  ? profile.username.trim()
                  : null,
              avatarUrl:
                typeof profile.avatar_url === "string" &&
                profile.avatar_url.trim() !== ""
                  ? profile.avatar_url.trim()
                  : null,
              birthday,
            },
          ];
        }),
      );
    }

    void loadBirthdays();
    return () => {
      active = false;
    };
  }, []);

  const upcoming = useMemo<UpcomingBirthday[]>(() => {
    return people
      .flatMap((person) => {
        const days = daysUntilBirthday(person.birthday, todayYmd);
        if (days == null || days < 0 || days > UPCOMING_DAYS) return [];
        return [{ ...person, days }];
      })
      .sort((a, b) => a.days - b.days || (a.username ?? "").localeCompare(b.username ?? ""));
  }, [people, todayYmd]);

  return (
    <Card className="border" size="sm">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Upcoming events</CardTitle>
        <Button size="icon-sm"><Link/></Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {UPCOMING_EVENTS.map((event) => {
          const date = eventDateParts(todayYmd, event.daysFromToday);
          return (
            <div key={event.id} className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                <span className="text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                  {date.weekday}
                </span>
                <span className="text-sm font-semibold tabular-nums leading-tight">
                  {date.day}
                </span>
              </div>
              <div className="min-w-0 flex-1 border-l-2 border-primary/70 py-0.5 pl-3">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.time}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
      <Separator />
      <CardHeader>
        <CardTitle>Upcoming birthdays</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <p className="text-muted-foreground">
            Could not load birthdays. {error}
          </p>
        ) : loading ? (
          <p className="text-muted-foreground">Loading birthdays…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-muted-foreground">None this week.</p>
        ) : (
          upcoming.map((person) => {
            const name = person.username ?? "Unnamed";
            const isToday = person.days === 0;
            const canWish = isToday && person.id !== currentUserId;
            return (
              <div key={person.id} className="flex items-center gap-3">
                <Avatar size="sm">
                  {person.avatarUrl ? (
                    <AvatarImage src={person.avatarUrl} alt={name} />
                  ) : null}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {birthdayLabel(person.days)}
                  </p>
                </div>
                {canWish ? (
                  <WishBirthdayButton
                    personId={person.id}
                    name={name}
                    todayYmd={todayYmd}
                    wisherId={currentUserId ?? "anon"}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
