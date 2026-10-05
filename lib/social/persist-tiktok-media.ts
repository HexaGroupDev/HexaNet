import type { SupabaseClient } from "@supabase/supabase-js";
import type { TikTokPost } from "@/lib/social/tiktok";

export const SOCIAL_MEDIA_BUCKET = "social-media";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** TikTok CDN URLs are session-signed and expire; they cannot be reused as <video src>. */
export function isEphemeralTikTokMediaUrl(value: string | null | undefined) {
  if (!value || !isHttpUrl(value)) return true;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.includes("tiktok.com") ||
      host.includes("tiktokcdn") ||
      host.includes("byteoversea") ||
      host.includes("byteimg") ||
      host.includes("ibyteimg") ||
      host.includes("muscdn")
    );
  } catch {
    return true;
  }
}

export function needsPersistedTikTokMedia(post: TikTokPost) {
  if (!post.videoUrl && !post.thumbnailUrl) return true;
  return (
    isEphemeralTikTokMediaUrl(post.videoUrl) ||
    isEphemeralTikTokMediaUrl(post.thumbnailUrl)
  );
}

async function downloadTikTokAsset(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "*/*",
      Referer: "https://www.tiktok.com/",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Download returned an empty file");
  }

  return { buffer, contentType };
}

function extensionFor(contentType: string | null, fallback: string) {
  if (!contentType) return fallback;
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return fallback;
}

async function uploadAsset(
  admin: SupabaseClient,
  path: string,
  buffer: Buffer,
  contentType: string,
) {
  const { error } = await admin.storage
    .from(SOCIAL_MEDIA_BUCKET)
    .upload(path, buffer, {
      cacheControl: "86400",
      upsert: true,
      contentType,
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(path);

  return `${publicUrl}?v=${Date.now()}`;
}

/**
 * Downloads ephemeral TikTok CDN media and re-hosts it in Supabase storage
 * so the dashboard can play it without hotlink/expiry failures.
 */
export async function persistTikTokMedia(
  admin: SupabaseClient,
  post: TikTokPost,
): Promise<TikTokPost> {
  if (!needsPersistedTikTokMedia(post)) return post;

  let videoUrl = post.videoUrl;
  let thumbnailUrl = post.thumbnailUrl;

  if (post.videoUrl && isEphemeralTikTokMediaUrl(post.videoUrl)) {
    try {
      const { buffer, contentType } = await downloadTikTokAsset(post.videoUrl);
      const extension = extensionFor(contentType, "mp4");
      videoUrl = await uploadAsset(
        admin,
        `tiktok/${post.videoId}/video.${extension}`,
        buffer,
        contentType || "video/mp4",
      );
    } catch (error) {
      console.error(
        "Failed to persist TikTok video:",
        error instanceof Error ? error.message : error,
      );
      videoUrl = null;
    }
  }

  if (post.thumbnailUrl && isEphemeralTikTokMediaUrl(post.thumbnailUrl)) {
    try {
      const { buffer, contentType } = await downloadTikTokAsset(post.thumbnailUrl);
      const extension = extensionFor(contentType, "jpg");
      thumbnailUrl = await uploadAsset(
        admin,
        `tiktok/${post.videoId}/cover.${extension}`,
        buffer,
        contentType || "image/jpeg",
      );
    } catch (error) {
      console.error(
        "Failed to persist TikTok thumbnail:",
        error instanceof Error ? error.message : error,
      );
      thumbnailUrl = null;
    }
  }

  return {
    ...post,
    videoUrl,
    thumbnailUrl,
  };
}
