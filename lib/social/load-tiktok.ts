import { scrapeLatestTikTokVideo } from "@/lib/social/scrape-tiktok";
import {
  isTikTokUrl,
  parseTikTokVideoUrl,
  toPost,
  type TikTokPost,
} from "@/lib/social/tiktok";
import { createAdminClient } from "@/lib/supabase/admin";
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
    videoUrl: asString(row.media_url),
    authorName: asString(row.author_name) ?? parsed.handle,
    publishedAt: asString(row.created_at) ?? undefined,
  });
}

function hasMedia(post: TikTokPost) {
  return Boolean(post.videoUrl || post.thumbnailUrl);
}

async function loadProfileUrls() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_embed_urls")
    .select("url")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load TikTok profile URLs:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => asString((row as { url?: unknown }).url))
    .filter((url): url is string => !!url && isTikTokUrl(url));
}

async function loadCachedPosts(): Promise<TikTokPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select(
      "author_name, text, media_url, thumbnail_url, post_url, created_at, fetched_at",
    )
    .eq("platform", "tiktok")
    .order("fetched_at", { ascending: false });

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

  const now = new Date().toISOString();
  const { error } = await admin.from("social_posts").upsert(
    {
      platform: "tiktok",
      external_id: post.videoId,
      author_name: post.authorName,
      text: post.caption,
      media_url: post.videoUrl,
      thumbnail_url: post.thumbnailUrl,
      media_type: "video",
      post_url: post.postUrl,
      created_at: post.publishedAt,
      fetched_at: now,
    },
    { onConflict: "platform,external_id" },
  );

  if (error) {
    console.error("Failed to cache TikTok post:", error.message);
    return false;
  }
  return true;
}

async function syncIfStale(profileUrls: string[], cached: TikTokPost[]) {
  const admin = tryAdminClient();
  if (!admin || profileUrls.length === 0) return;

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
  const incomplete = cached.length === 0 || cached.some((post) => !hasMedia(post));
  if (fresh && !incomplete) return;

  try {
    let saved = 0;
    for (const profileUrl of profileUrls) {
      const post = await scrapeLatestTikTokVideo(profileUrl);
      if (!post) continue;
      if (await cachePost(post)) saved += 1;
    }

    if (saved === 0) {
      console.error("TikTok scrape returned no videos.");
      return;
    }

    const { error: stampError } = await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: new Date().toISOString(),
    });
    if (stampError) {
      console.error("Failed to stamp TikTok sync:", stampError.message);
    }
  } catch (syncError) {
    console.error("TikTok scrape failed:", syncError);
  }
}

export async function loadTikTokPosts(): Promise<TikTokPost[]> {
  const profileUrls = await loadProfileUrls();
  const cached = latestPerHandle(await loadCachedPosts());
  await syncIfStale(profileUrls, cached);
  return latestPerHandle(await loadCachedPosts());
}
