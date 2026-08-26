const OEMBED_ENDPOINT = "https://open.spotify.com/oembed";
const SPOTIFY_HOSTS = new Set([
  "open.spotify.com",
  "play.spotify.com",
  "spotify.link",
]);
const SPOTIFY_URI =
  /^spotify:(album|track|playlist|artist|show|episode):([A-Za-z0-9]+)$/;
const EMBED_TYPES = new Set([
  "album",
  "track",
  "playlist",
  "artist",
  "show",
  "episode",
]);
const IFRAME_SRC = /src=(["'])(.*?)\1/i;

export type SpotifyOEmbed = {
  title: string;
  iframeUrl: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function toSpotifyEmbedUrl(input: string) {
  const spotifyUrl = normalizeSpotifyUrl(input);
  if (!spotifyUrl) return null;

  try {
    const url = new URL(spotifyUrl);
    const host = url.hostname.replace(/^www\./i, "");
    if (host === "spotify.link") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const typeIndex = parts.findIndex((part) => EMBED_TYPES.has(part));
    if (typeIndex === -1) return null;

    const id = parts[typeIndex + 1];
    if (!id) return null;

    return `https://open.spotify.com/embed/${parts[typeIndex]}/${id}`;
  } catch {
    return null;
  }
}

export function normalizeSpotifyUrl(input: string) {
  const trimmed = input.trim();
  const uri = trimmed.match(SPOTIFY_URI);
  if (uri) {
    return `https://open.spotify.com/${uri[1]}/${uri[2]}`;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.replace(/^www\./i, "");
    if (!SPOTIFY_HOSTS.has(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isAllowedEmbedUrl(src: string) {
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname === "open.spotify.com" &&
      url.pathname.startsWith("/embed/")
    );
  } catch {
    return false;
  }
}

function embedUrlFromHtml(html: string) {
  const match = html.match(IFRAME_SRC);
  return match?.[2] ? match[2] : null;
}

export async function fetchSpotifyOEmbed(
  input: string,
): Promise<SpotifyOEmbed | null> {
  const spotifyUrl = normalizeSpotifyUrl(input);
  if (!spotifyUrl) return null;

  try {
    const response = await fetch(
      `${OEMBED_ENDPOINT}?url=${encodeURIComponent(spotifyUrl)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86_400 },
      },
    );

    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return null;

    const record = data as Record<string, unknown>;
    const iframeUrl =
      asString(record.iframe_url) || embedUrlFromHtml(asString(record.html));

    if (!iframeUrl || !isAllowedEmbedUrl(iframeUrl)) return null;

    return {
      title: asString(record.title),
      iframeUrl,
    };
  } catch {
    return null;
  }
}
