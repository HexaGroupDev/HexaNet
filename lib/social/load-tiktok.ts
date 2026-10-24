import { fetchLatestTikTokPost } from "@/lib/social/tiktok-oauth";
import {
  isEphemeralTikTokMediaUrl,
  persistTikTokMedia,
} from "@/lib/social/persist-tiktok-media";
import {
  parseTikTokVideoUrl,
  toPost,
  type TikTokPost,
} from "@/lib/social/tiktok";
import { createAdminClient } from "@/lib/supabase/admin";
import { withJwtSkewRetry } from "@/lib/supabase/jwt-skew";
import { createClient } from "@/lib/supabase/server";

const SYNC_ID = "tiktok";
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;
const EPOCH = "1970-01-01T00:00:00.000Z";

function tryAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error("TikTok cache write skipped:", error);
    return null;
  }
}

/** Prefer service-role for shared social reads so Auth JWT clock skew can't block the wall. */
async function getSocialReadClient() {
  return tryAdminClient() ?? (await createClient());
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rowToPost(row: Record<string, unknown>): TikTokPost | null {
  const postUrl = asString(row.post_url);
  if (!postUrl) return null;
  const parsed = parseTikTokVideoUrl(postUrl);
  if (!parsed) return null;

  return toPost(parsed.handle, parsed.videoId, {
    caption: asString(row.text),
    thumbnailUrl: asString(row.thumbnail_url),
    authorName: asString(row.author_name) ?? parsed.handle,
    publishedAt: asString(row.created_at) ?? undefined,
  });
}

function isPersisted(url: string | null) {
  return Boolean(url) && !isEphemeralTikTokMediaUrl(url);
}

function hasPlayableCover(post: TikTokPost) {
  return isPersisted(post.thumbnailUrl);
}

async function loadCachedPosts(): Promise<TikTokPost[]> {
  const supabase = await getSocialReadClient();
  const { data, error } = await withJwtSkewRetry(() =>
    supabase
      .from("social_posts")
      .select(
        "author_name, text, thumbnail_url, post_url, created_at, fetched_at",
      )
      .eq("platform", "tiktok")
      .order("fetched_at", { ascending: false }),
  );

  if (error) {
    console.error("Failed to load cached TikTok posts:", error.message);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const post = rowToPost(row as Record<string, unknown>);
    return post ? [post] : [];
  });
}

function latestPerHandle(posts: TikTokPost[]) {
  const seen = new Set<string>();
  const latest: TikTokPost[] = [];
  for (const post of posts) {
    if (seen.has(post.handle)) continue;
    seen.add(post.handle);
    latest.push(post);
  }
  return latest;
}

async function cachePost(post: TikTokPost) {
  const admin = tryAdminClient();
  if (!admin) return false;

  const wantedCover = Boolean(post.thumbnailUrl);
  const persisted = await persistTikTokMedia(admin, post);
  const coverUrl = isPersisted(persisted.thumbnailUrl) ? persisted.thumbnailUrl : null;

  const now = new Date().toISOString();
  const { error } = await admin.from("social_posts").upsert(
    {
      platform: "tiktok",
      external_id: persisted.videoId,
      author_name: persisted.authorName,
      text: persisted.caption,
      media_url: null,
      thumbnail_url: coverUrl,
      media_type: null,
      post_url: persisted.postUrl,
      created_at: persisted.publishedAt,
      fetched_at: now,
    },
    { onConflict: "platform,external_id" },
  );

  if (error) {
    console.error("Failed to cache TikTok post:", error.message);
    return false;
  }

  if (wantedCover && !coverUrl) {
    await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: EPOCH,
    });
    return false;
  }
  return true;
}

async function syncIfStale(cached: TikTokPost[]) {
  const admin = tryAdminClient();
  if (!admin) return;

  const { data, error } = await admin
    .from("social_sync_state")
    .select("last_updated")
    .eq("id", SYNC_ID)
    .maybeSingle();

  if (error) {
    console.error("Failed to read TikTok sync state:", error.message);
    return;
  }

  if (!data) {
    const { error: insertError } = await admin
      .from("social_sync_state")
      .insert({ id: SYNC_ID, last_updated: EPOCH });
    if (insertError && insertError.code !== "23505") {
      console.error("Failed to create TikTok sync state:", insertError.message);
      return;
    }
  }

  const lastUpdated = Date.parse(String(data?.last_updated ?? EPOCH));
  const fresh =
    Number.isFinite(lastUpdated) && Date.now() - lastUpdated < STALE_AFTER_MS;
  const incomplete = cached.length === 0 || cached.some((post) => !hasPlayableCover(post));
  if (fresh && !incomplete) return;

  try {
    const post = await fetchLatestTikTokPost();
    if (!post) {
      console.warn("TikTok Display API returned no video.");
      return;
    }

    if (!(await cachePost(post))) return;

    const { error: stampError } = await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: new Date().toISOString(),
    });
    if (stampError) {
      console.error("Failed to stamp TikTok sync:", stampError.message);
    }
  } catch (syncError) {
    console.error("TikTok Display API sync failed:", syncError);
  }
}

export async function loadTikTokPosts(): Promise<TikTokPost[]> {
  const cached = latestPerHandle(await loadCachedPosts());
  await syncIfStale(cached);
  return latestPerHandle(await loadCachedPosts());
}
