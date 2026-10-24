export type TikTokPost = {
  platform: "tiktok";
  videoId: string;
  handle: string;
  postUrl: string;
  embedUrl: string;
  caption: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  authorName: string;
  publishedAt: string;
};

const PROFILE =
  /^https?:\/\/(?:www\.)?tiktok\.com\/@([\w.]+)\/?(?:\?.*)?$/i;
const VIDEO =
  /^https?:\/\/(?:www\.)?tiktok\.com\/@([\w.]+)\/video\/(\d{10,})/i;

export function parseTikTokProfileUrl(value: string) {
  const match = value.trim().match(PROFILE);
  return match ? match[1] : null;
}

export function parseTikTokVideoUrl(value: string) {
  const match = value.trim().match(VIDEO);
  if (!match) return null;
  return { handle: match[1].replace(/^@/, ""), videoId: match[2] };
}

export function publishedAtFromVideoId(videoId: string) {
  try {
    const seconds = Number(BigInt(videoId) >> BigInt(32));
    if (!Number.isFinite(seconds) || seconds < 1_000_000_000) return null;
    return new Date(seconds * 1000).toISOString();
  } catch {
    return null;
  }
}

/** Silent looping player. TikTok's Display API does not return a video file. */
export function tikTokEmbedUrl(videoId: string) {
  const url = new URL(`https://www.tiktok.com/player/v1/${videoId}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("loop", "1");
  url.searchParams.set("muted", "1");
  url.searchParams.set("controls", "0");
  url.searchParams.set("progress_bar", "0");
  url.searchParams.set("play_button", "0");
  url.searchParams.set("volume_control", "0");
  url.searchParams.set("fullscreen_button", "0");
  url.searchParams.set("timestamp", "0");
  url.searchParams.set("music_info", "0");
  url.searchParams.set("description", "0");
  url.searchParams.set("rel", "0");
  url.searchParams.set("closed_caption", "0");
  return url.toString();
}

export function toPost(
  handle: string,
  videoId: string,
  extras: Partial<Omit<TikTokPost, "platform" | "videoId" | "handle" | "postUrl" | "embedUrl">> = {},
): TikTokPost {
  const cleanHandle = handle.replace(/^@/, "");
  return {
    platform: "tiktok",
    videoId,
    handle: cleanHandle,
    postUrl: `https://www.tiktok.com/@${cleanHandle}/video/${videoId}`,
    embedUrl: tikTokEmbedUrl(videoId),
    caption: extras.caption ?? null,
    thumbnailUrl: extras.thumbnailUrl ?? null,
    videoUrl: extras.videoUrl ?? null,
    authorName: extras.authorName?.trim() || cleanHandle,
    publishedAt:
      extras.publishedAt ??
      publishedAtFromVideoId(videoId) ??
      new Date().toISOString(),
  };
}

export function isTikTokUrl(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./i, "");
    return host === "tiktok.com" || host === "vm.tiktok.com";
  } catch {
    return false;
  }
}
