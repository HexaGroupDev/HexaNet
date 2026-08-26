"use client";

import { useEffect, useRef, useState } from "react";
import { Cake, Languages, MapPin, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  formatBirthdayLabel,
  formatLanguagesLabel,
  languageLabel,
  parseDateOnly,
  parseLanguages,
  PROFILE_LANGUAGES,
  MAX_PROFILE_LANGUAGES,
  toDateOnly,
  type ProfileInformation,
} from "@/lib/profiles/profile-information";
import { normalizeSpotifyUrl } from "@/lib/spotify/oembed";
import { SpotifyEmbed } from "@/components/profile_components/spotify-embed";

function stripProtocol(value: string) {
  return value.trim().replace(/^https?:\/\//i, "");
}

export function EditInformationDialog({
  initial,
  onSave,
}: {
  initial: ProfileInformation;
  onSave: (next: ProfileInformation) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthday, setBirthday] = useState<Date | undefined>(
    parseDateOnly(initial.birthday),
  );
  const [languages, setLanguages] = useState(() =>
    parseLanguages(initial.languages),
  );
  const [languageSelectKey, setLanguageSelectKey] = useState(0);
  const [hometown, setHometown] = useState(initial.hometown ?? "");
  const [songUrl, setSongUrl] = useState(
    stripProtocol(initial.favoriteSpotifyUrl ?? ""),
  );

  const availableLanguages = PROFILE_LANGUAGES.filter(
    (language) => !languages.includes(language.code),
  );

  function resetForm() {
    setBirthday(parseDateOnly(initial.birthday));
    setLanguages(parseLanguages(initial.languages));
    setLanguageSelectKey((key) => key + 1);
    setHometown(initial.hometown ?? "");
    setSongUrl(stripProtocol(initial.favoriteSpotifyUrl ?? ""));
    setError(null);
    setCalendarOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) resetForm();
  }

  function addLanguage(code: string | null) {
    if (!code || languages.includes(code)) return;
    setLanguages((current) => {
      if (current.length >= MAX_PROFILE_LANGUAGES) return current;
      return [...current, code];
    });
    setLanguageSelectKey((key) => key + 1);
  }

  function handleSave() {
    setError(null);

    const nextHometown = hometown.trim();
    const nextSong = songUrl.trim();
    let favoriteSpotifyUrl: string | null = null;

    if (nextSong) {
      favoriteSpotifyUrl = normalizeSpotifyUrl(
        nextSong.startsWith("http") ? nextSong : `https://${nextSong}`,
      );
      if (!favoriteSpotifyUrl) {
        setError("Enter a Spotify track, album, or playlist link.");
        return;
      }
    }

    setOpen(false);
    void onSave({
      birthday: birthday ? toDateOnly(birthday) : null,
      languages: languages.slice(0, MAX_PROFILE_LANGUAGES),
      hometown: nextHometown || null,
      favoriteSpotifyUrl,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit information"
                />
              }
            />
          }
        >
          <Pencil />
        </TooltipTrigger>
        <TooltipContent>Edit information</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit information</DialogTitle>
          <DialogDescription>
            Birthday, languages, hometown, and a favorite Spotify track.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="birthday">Birthday</FieldLabel>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    id="birthday"
                    className="w-full justify-start font-normal"
                  />
                }
              >
                {birthday ? birthday.toLocaleDateString() : "Select date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthday}
                  defaultMonth={birthday}
                  captionLayout="dropdown"
                  startMonth={new Date(1920, 0)}
                  endMonth={new Date()}
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    setBirthday(date);
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </Field>
          <Field>
            <FieldLabel htmlFor="languages">Languages</FieldLabel>
            {languages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {languages.map((code) => (
                  <Badge key={code} variant="secondary">
                    <button
                      type="button"
                      aria-label={`Remove ${languageLabel(code)}`}
                      className="inline-flex hover:cursor-pointer"
                      onClick={() =>
                        setLanguages((current) =>
                          current.filter((item) => item !== code),
                        )
                      }
                    >
                      <X className="size-3" />
                    </button>
                    {code}
                  </Badge>
                ))}
              </div>
            ) : null}
            <Select
              key={languageSelectKey}
              disabled={
                languages.length >= MAX_PROFILE_LANGUAGES ||
                availableLanguages.length === 0
              }
              onValueChange={addLanguage}
            >
              <SelectTrigger id="languages" className="w-full">
                <SelectValue placeholder="Add a language" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                {availableLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.name} ({language.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="hometown">Hometown</FieldLabel>
            <Input
              id="hometown"
              placeholder="Enter hometown"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="favorite-song">Favorite song</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="favorite-song"
                placeholder="Paste a Spotify link"
                value={songUrl}
                onChange={(e) => setSongUrl(stripProtocol(e.target.value))}
              />
              <InputGroupAddon>
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Paste a Spotify track, album, or playlist link.
            </FieldDescription>
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileInformationCard({
  profileId,
  initial,
  canEdit = true,
}: {
  profileId: string;
  initial: ProfileInformation;
  canEdit?: boolean;
}) {
  const [information, setInformation] = useState(initial);
  const [syncError, setSyncError] = useState<string | null>(null);
  const informationRef = useRef(initial);
  const [prevInitial, setPrevInitial] = useState(initial);

  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setInformation(initial);
    informationRef.current = initial;
  }

  useEffect(() => {
    informationRef.current = information;
  }, [information]);

  async function persist(next: ProfileInformation) {
    const previous = informationRef.current;
    informationRef.current = next;
    setInformation(next);
    setSyncError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        birthday: next.birthday,
        languages: next.languages,
        hometown: next.hometown,
        favorite_spotify_url: next.favoriteSpotifyUrl,
      })
      .eq("id", profileId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      informationRef.current = previous;
      setInformation(previous);
      setSyncError(
        error?.message ??
          "Could not save. You may not have permission to update this profile.",
      );
    }
  }

  const infoTiles = [
    { icon: Cake, label: formatBirthdayLabel(information.birthday) },
    { icon: Languages, label: formatLanguagesLabel(information.languages) },
    { icon: MapPin, label: information.hometown },
  ].filter(
    (item): item is { icon: typeof Cake; label: string } => item.label !== null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex w-full justify-between">
          <CardTitle>Information</CardTitle>
          {canEdit ? (
            <EditInformationDialog initial={information} onSave={persist} />
          ) : null}
        </div>
        <CardDescription>Personal details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          {infoTiles.length > 0 ? (
            <div className="flex w-full gap-2 lg:contents">
              {infoTiles.map((item) => (
                <div
                  key={item.label}
                  className="flex h-20 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-muted/40 px-3 ring-1 ring-foreground/10 lg:w-auto lg:flex-none lg:px-5"
                >
                  <item.icon className="size-5 text-muted-foreground" />
                  <p className="max-w-full text-center font-medium leading-tight">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {information.favoriteSpotifyUrl ? (
            <div className="relative h-20 w-full min-w-0 overflow-hidden rounded-xl ring-1 ring-foreground/10 lg:flex-1">
              <SpotifyEmbed url={information.favoriteSpotifyUrl} />
            </div>
          ) : null}
        </div>
        {syncError ? (
          <p className="mt-2 text-sm text-destructive">{syncError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
