"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { placeSubtitle, searchPlaces, type GeocodedPlace } from "@/lib/weather/geocode";
import type { WeatherLocation } from "@/lib/weather/location";

export function WeatherLocationPicker({
  onSelect,
  onCancel,
}: {
  onSelect: (location: WeatherLocation) => void;
  onCancel: () => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = query.trim();
    if (name.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const places = await searchPlaces(name);
        if (!cancelled) setResults(places);
      } catch {
        if (!cancelled) {
          setResults([]);
          setError("Couldn't search cities. Try again.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      onCancel();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  const showList = query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full max-w-sm text-base font-normal">
      <InputGroup className="h-9 bg-background">
        <InputGroupInput
          autoFocus
          value={query}
          placeholder="Search city"
          aria-label="Search city"
          aria-controls={listId}
          aria-expanded={showList}
          aria-autocomplete="list"
          role="combobox"
          onChange={(event) => setQuery(event.target.value)}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg bg-popover p-1 text-left text-sm shadow-md ring-1 ring-foreground/10"
        >
          {searching ? (
            <li className="px-2 py-2 text-center text-muted-foreground">
              Searching…
            </li>
          ) : error ? (
            <li className="px-2 py-2 text-center text-muted-foreground">
              {error}
            </li>
          ) : results.length === 0 ? (
            <li className="px-2 py-2 text-center text-muted-foreground">
              No cities found
            </li>
          ) : (
            results.map((place) => {
              const subtitle = placeSubtitle(place);
              return (
                <li key={place.id} role="option">
                  <button
                    type="button"
                    className="flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors hover:cursor-pointer hover:bg-muted"
                    onClick={() =>
                      onSelect({
                        name: place.name,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        timezone: place.timezone,
                      })
                    }
                  >
                    <span>{place.name}</span>
                    {subtitle ? (
                      <span className="text-xs text-muted-foreground">
                        {subtitle}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
