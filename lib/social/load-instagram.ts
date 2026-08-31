import {
  syncLatestInstagramVideoFromGraph,
} from "@/lib/social/instagram-graph";
import { toPost, type InstagramPost } from "@/lib/social/instagram";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SYNC_ID = "instagram";
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;
const EPOCH = "1970-01-01T00:00:00.000Z";

function tryAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error("Instagram cache write skipped:", error);
    return null;
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rowToPost(row: Record<string, unknown>): InstagramPost | null {
  const postUrl = asString(row.post_url);
  const postId = asString(row.external_id);
  if (!postUrl || !postId) return null;

  const authorName = asString(row.author_name) ?? "instagram";
  const handle = authorName.replace(/^@/, "");

  return toPost(handle, postId, {
    caption: asString(row.text),
    thumbnailUrl: asString(row.thumbnail_url),
    videoUrl: asString(row.media_url),
    authorName: asString(row.author_name) ?? handle,
    publishedAt: asString(row.created_at) ?? undefined,
  });
}

function hasMedia(post: InstagramPost) {
  return Boolean(post.videoUrl || post.thumbnailUrl);
}

async function loadCachedPosts(): Promise<InstagramPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select(
      "external_id, author_name, text, media_url, thumbnail_url, post_url, created_at, fetched_at",
    )
    .eq("platform", "instagram")
    .order("fetched_at", { ascending: false });

  if (error) {
    console.error("Failed to load cached Instagram posts:", error.message);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const post = rowToPost(row as Record<string, unknown>);
    return post ? [post] : [];
  });
}

function latestPerHandle(posts: InstagramPost[]) {
  const seen = new Set<string>();
  const latest: InstagramPost[] = [];
  for (const post of posts) {
    if (seen.has(post.handle)) continue;
    seen.add(post.handle);
    latest.push(post);
  }
  return latest;
}

async function cachePost(post: InstagramPost) {
  const admin = tryAdminClient();
  if (!admin) return false;

  const now = new Date().toISOString();
  const { error } = await admin.from("social_posts").upsert(
    {
      platform: "instagram",
      external_id: post.postId,
      author_name: post.authorName,
      text: post.caption,
      media_url: post.videoUrl,
      thumbnail_url: post.thumbnailUrl,
      media_type: post.videoUrl ? "video" : "image",
      post_url: post.postUrl,
      created_at: post.publishedAt,
      fetched_at: now,
    },
    { onConflict: "platform,external_id" },
  );

  if (error) {
    console.error("Failed to cache Instagram post:", error.message);
    return false;
  }
  return true;
}

async function syncIfStale(cached: InstagramPost[]) {
  const admin = tryAdminClient();
  if (!admin) return;

  const { data, error } = await admin
    .from("social_sync_state")
    .select("last_updated")
    .eq("id", SYNC_ID)
    .maybeSingle();

  if (error) {
    console.error("Failed to read Instagram sync state:", error.message);
    return;
  }

  if (!data) {
    const { error: insertError } = await admin
      .from("social_sync_state")
      .insert({ id: SYNC_ID, last_updated: EPOCH });
    if (insertError && insertError.code !== "23505") {
      console.error("Failed to create Instagram sync state:", insertError.message);
      return;
    }
  }

  const lastUpdated = Date.parse(String(data?.last_updated ?? EPOCH));
  const fresh =
    Number.isFinite(lastUpdated) && Date.now() - lastUpdated < STALE_AFTER_MS;
  const incomplete = cached.length === 0 || cached.some((post) => !hasMedia(post));
  if (fresh && !incomplete) return;

  try {
    const post = await syncLatestInstagramVideoFromGraph();
    if (!post) {
      console.warn(
        "Instagram Graph API returned no video. Check social_accounts or INSTAGRAM_ACCESS_TOKEN.",
      );
      return;
    }

    if (!(await cachePost(post))) return;

    const { error: stampError } = await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: new Date().toISOString(),
    });
    if (stampError) {
      console.error("Failed to stamp Instagram sync:", stampError.message);
    }
  } catch (syncError) {
    console.error("Instagram Graph API sync failed:", syncError);
  }
}

export async function loadInstagramPosts(): Promise<InstagramPost[]> {
  const cached = latestPerHandle(await loadCachedPosts());
  await syncIfStale(cached);
  return latestPerHandle(await loadCachedPosts());
}
