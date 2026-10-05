import type { SupabaseClient } from "@supabase/supabase-js";
import type { InstagramPost } from "@/lib/social/instagram";
import { SOCIAL_MEDIA_BUCKET } from "@/lib/social/persist-tiktok-media";

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

function isPersistedSocialMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.pathname.includes(`/${SOCIAL_MEDIA_BUCKET}/`);
  } catch {
    return false;
  }
}

/** Instagram CDN URLs expire; only re-hosted social-media bucket URLs are durable. */
export function isEphemeralInstagramMediaUrl(value: string | null | undefined) {
  if (!value || !isHttpUrl(value)) return true;
  return !isPersistedSocialMediaUrl(value);
}

export function needsPersistedInstagramMedia(post: InstagramPost) {
  return (
    (Boolean(post.videoUrl) && isEphemeralInstagramMediaUrl(post.videoUrl)) ||
    (Boolean(post.thumbnailUrl) && isEphemeralInstagramMediaUrl(post.thumbnailUrl))
  );
}

async function downloadInstagramAsset(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "*/*",
      Referer: "https://www.instagram.com/",
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
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return fallback;
}

function storageSafeId(postId: string) {
  return postId.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureSocialMediaBucket(admin: SupabaseClient) {
  const { data } = await admin.storage.getBucket(SOCIAL_MEDIA_BUCKET);
  if (data) return;

  const { error } = await admin.storage.createBucket(SOCIAL_MEDIA_BUCKET, {
    public: true,
  });
  if (!error) return;

  const message = error.message.toLowerCase();
  if (message.includes("already exists") || message.includes("duplicate")) return;
  throw new Error(error.message);
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
 * Downloads Instagram CDN media and re-hosts it in Supabase storage
 * so the dashboard does not depend on expiring CDN URLs.
 */
export async function persistInstagramMedia(
  admin: SupabaseClient,
  post: InstagramPost,
): Promise<InstagramPost> {
  if (!needsPersistedInstagramMedia(post)) return post;

  await ensureSocialMediaBucket(admin);

  let videoUrl = post.videoUrl;
  let thumbnailUrl = post.thumbnailUrl;

  if (post.videoUrl && isEphemeralInstagramMediaUrl(post.videoUrl)) {
    try {
      const { buffer, contentType } = await downloadInstagramAsset(post.videoUrl);
      const extension = extensionFor(contentType, "mp4");
      videoUrl = await uploadAsset(
        admin,
        `instagram/${storageSafeId(post.postId)}/video.${extension}`,
        buffer,
        contentType || "video/mp4",
      );
    } catch (error) {
      console.error(
        "Failed to persist Instagram video:",
        error instanceof Error ? error.message : error,
      );
      videoUrl = null;
    }
  }

  if (post.thumbnailUrl && isEphemeralInstagramMediaUrl(post.thumbnailUrl)) {
    try {
      const { buffer, contentType } = await downloadInstagramAsset(post.thumbnailUrl);
      const extension = extensionFor(contentType, "jpg");
      thumbnailUrl = await uploadAsset(
        admin,
        `instagram/${storageSafeId(post.postId)}/preview.${extension}`,
        buffer,
        contentType || "image/jpeg",
      );
    } catch (error) {
      console.error(
        "Failed to persist Instagram preview:",
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
