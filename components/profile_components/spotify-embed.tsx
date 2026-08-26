"use client";

import { toSpotifyEmbedUrl } from "@/lib/spotify/oembed";

export function SpotifyEmbed({ url }: { url: string }) {
  const iframeUrl = toSpotifyEmbedUrl(url);

  if (!iframeUrl) {
    return (
      <p className="px-2 text-sm text-muted-foreground">
        Spotify preview unavailable.
      </p>
    );
  }

  return (
    <iframe
      src={iframeUrl}
      title="Spotify Embed"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
      className="absolute inset-0 size-full rounded-xl border-0"
    />
  );
}
