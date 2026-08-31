export type InstagramPost = {
  platform: "instagram";
  postId: string;
  handle: string;
  postUrl: string;
  caption: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  authorName: string;
  publishedAt: string;
};

const PROFILE =
  /^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/i;
const POST =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i;

const RESERVED_HANDLES = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "stories",
  "explore",
  "accounts",
  "direct",
  "about",
  "legal",
  "developer",
]);

export function parseInstagramProfileUrl(value: string) {
  const match = value.trim().match(PROFILE);
  if (!match) return null;

  const handle = match[1].replace(/^@/, "");
  if (RESERVED_HANDLES.has(handle.toLowerCase())) return null;
  return handle;
}

export function parseInstagramPostUrl(value: string) {
  const match = value.trim().match(POST);
  if (!match) return null;
  return { shortcode: match[1] };
}

export function toPost(
  handle: string,
  postId: string,
  extras: Partial<
    Omit<InstagramPost, "platform" | "postId" | "handle" | "postUrl">
  > & { postPath?: "p" | "reel" | "tv" },
): InstagramPost {
  const cleanHandle = handle.replace(/^@/, "");
  const path = extras.postPath ?? (extras.videoUrl ? "reel" : "p");

  return {
    platform: "instagram",
    postId,
    handle: cleanHandle,
    postUrl: `https://www.instagram.com/${path}/${postId}/`,
    caption: extras.caption ?? null,
    thumbnailUrl: extras.thumbnailUrl ?? null,
    videoUrl: extras.videoUrl ?? null,
    authorName: extras.authorName?.trim() || cleanHandle,
    publishedAt: extras.publishedAt ?? new Date().toISOString(),
  };
}

export function isInstagramUrl(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./i, "");
    return host === "instagram.com";
  } catch {
    return false;
  }
}
