export type TikTokPost = {
  platform: "tiktok";
  videoId: string;
  handle: string;
  postUrl: string;
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

export function toPost(
  handle: string,
  videoId: string,
  extras: Partial<Omit<TikTokPost, "platform" | "videoId" | "handle" | "postUrl">> = {},
): TikTokPost {
  const cleanHandle = handle.replace(/^@/, "");
  return {
    platform: "tiktok",
    videoId,
    handle: cleanHandle,
    postUrl: `https://www.tiktok.com/@${cleanHandle}/video/${videoId}`,
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
