import { normalizeSpotifyUrl } from "@/lib/spotify/oembed";

export const MAX_PROFILE_LANGUAGES = 3;

export const PROFILE_LANGUAGES = [
  { code: "EN", name: "English" },
  { code: "FR", name: "French" },
  { code: "ES", name: "Spanish" },
  { code: "DE", name: "German" },
  { code: "IT", name: "Italian" },
  { code: "PT", name: "Portuguese" },
  { code: "NL", name: "Dutch" },
  { code: "ZH", name: "Chinese" },
  { code: "JA", name: "Japanese" },
  { code: "KO", name: "Korean" },
  { code: "AR", name: "Arabic" },
  { code: "HI", name: "Hindi" },
  { code: "RU", name: "Russian" },
  { code: "PL", name: "Polish" },
  { code: "TR", name: "Turkish" },
  { code: "VI", name: "Vietnamese" },
  { code: "TH", name: "Thai" },
  { code: "SV", name: "Swedish" },
  { code: "NO", name: "Norwegian" },
  { code: "DA", name: "Danish" },
  { code: "FI", name: "Finnish" },
  { code: "EL", name: "Greek" },
  { code: "HE", name: "Hebrew" },
  { code: "ID", name: "Indonesian" },
  { code: "MS", name: "Malay" },
] as const;

export type ProfileLanguageCode = (typeof PROFILE_LANGUAGES)[number]["code"];

const LANGUAGE_BY_CODE = new Map(
  PROFILE_LANGUAGES.map((language) => [language.code, language]),
);

const LANGUAGE_CODE_BY_ALIAS = new Map<string, ProfileLanguageCode>(
  PROFILE_LANGUAGES.flatMap((language) => [
    [language.code.toLowerCase(), language.code],
    [language.name.toLowerCase(), language.code],
  ]),
);

export function languageLabel(code: string) {
  return LANGUAGE_BY_CODE.get(code as ProfileLanguageCode)?.name ?? code;
}

export function normalizeLanguageCode(value: string): ProfileLanguageCode | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return LANGUAGE_CODE_BY_ALIAS.get(trimmed.toLowerCase()) ?? null;
}

export function parseLanguages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const code = normalizeLanguageCode(item);
    if (!code || codes.includes(code)) continue;
    codes.push(code);
    if (codes.length >= MAX_PROFILE_LANGUAGES) break;
  }
  return codes;
}

export function parseOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseDateOnly(value: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatBirthdayLabel(value: string | null) {
  const date = parseDateOnly(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatLanguagesLabel(languages: string[]) {
  const codes = parseLanguages(languages);
  return codes.length > 0 ? codes.join(" · ") : null;
}

export function parseFavoriteSpotifyUrl(value: unknown) {
  const text = parseOptionalText(value);
  return text ? normalizeSpotifyUrl(text) : null;
}
