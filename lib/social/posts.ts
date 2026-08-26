import type {
  SocialPlatform,
  SocialPost,
  SocialPostRow,
} from "@/lib/social/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PLATFORMS = new Set<SocialPlatform>(["linkedin", "instagram", "tiktok"]);

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asMediaType(value: unknown): SocialPost["mediaType"] {
  return value === "image" || value === "video" ? value : undefined;
}

export function postId(platform: SocialPlatform, externalId: string) {
  return `${platform}:${externalId}`;
}

export function toSocialPost(row: SocialPostRow): SocialPost {
  return {
    id: postId(row.platform, row.external_id),
    platform: row.platform,
    author: row.author_name,
    text: row.text ?? undefined,
    mediaUrl: row.media_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    mediaType: row.media_type ?? undefined,
    postUrl: row.post_url,
    createdAt: row.created_at,
    likes: row.likes ?? undefined,
    comments: row.comments ?? undefined,
  };
}

function parseRow(value: unknown): SocialPost | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const platform = asString(row.platform);
  const externalId = asString(row.external_id);
  const author = asString(row.author_name);
  const postUrl = asString(row.post_url);
  const createdAt = asString(row.created_at);

  if (
    !platform ||
    !PLATFORMS.has(platform as SocialPlatform) ||
    !externalId ||
    !author ||
    !postUrl ||
    !createdAt
  ) {
    return null;
  }

  return toSocialPost({
    platform: platform as SocialPlatform,
    external_id: externalId,
    author_name: author,
    text: asString(row.text) ?? null,
    media_url: asString(row.media_url) ?? null,
    thumbnail_url: asString(row.thumbnail_url) ?? null,
    media_type: asMediaType(row.media_type) ?? null,
    post_url: postUrl,
    created_at: createdAt,
    likes: asNumber(row.likes) ?? null,
    comments: asNumber(row.comments) ?? null,
  });
}

export function toSocialPostRow(post: SocialPost): SocialPostRow {
  const [, ...rest] = post.id.split(":");
  const externalId = rest.join(":") || post.id;

  return {
    platform: post.platform,
    external_id: externalId,
    author_name: post.author,
    text: post.text?.trim() ? post.text.trim() : null,
    media_url: post.mediaUrl ?? null,
    thumbnail_url: post.thumbnailUrl ?? null,
    media_type: post.mediaType ?? null,
    post_url: post.postUrl,
    created_at: post.createdAt,
    likes: post.likes ?? null,
    comments: post.comments ?? null,
    fetched_at: new Date().toISOString(),
  };
}

export async function getRecentSocialPosts(limit = 8): Promise<SocialPost[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_posts")
      .select(
        "platform, external_id, author_name, text, media_url, thumbnail_url, media_type, post_url, created_at, likes, comments",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to load social posts:", error.message);
      return [];
    }

    return (data ?? []).flatMap((row) => {
      const post = parseRow(row);
      return post ? [post] : [];
    });
  } catch (error) {
    console.error("Failed to load social posts:", error);
    return [];
  }
}

export async function upsertSocialPosts(posts: SocialPost[]) {
  if (posts.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("social_posts").upsert(
    posts.map(toSocialPostRow),
    { onConflict: "platform,external_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert social posts: ${error.message}`);
  }
}
