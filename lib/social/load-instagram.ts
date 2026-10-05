import {
  ensureFreshInstagramToken,
  loadInstagramGraphAccount,
  syncLatestInstagramMediaFromGraph,
} from "@/lib/social/instagram-graph";
import { toPost, type InstagramPost } from "@/lib/social/instagram";
import {
  isEphemeralInstagramMediaUrl,
  persistInstagramMedia,
} from "@/lib/social/persist-instagram-media";
import { createAdminClient } from "@/lib/supabase/admin";
import { withJwtSkewRetry } from "@/lib/supabase/jwt-skew";
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

async function getSocialReadClient() {
  return tryAdminClient() ?? (await createClient());
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rowToPost(row: Record<string, unknown>): InstagramPost | null {
  const postId = asString(row.external_id);
  if (!postId) return null;

  const mediaType = asString(row.media_type);
  const mediaUrl = asString(row.media_url);
  const thumbnailUrl = asString(row.thumbnail_url);
  const authorName = asString(row.author_name) ?? "hexagroupdigital";
  const handle = authorName.replace(/^@/, "");

  return toPost(handle, postId, {
    caption: asString(row.text),
    thumbnailUrl:
      thumbnailUrl ?? (mediaType === "video" ? null : mediaUrl),
    videoUrl: mediaType === "video" ? mediaUrl : null,
    postUrl: asString(row.post_url) ?? undefined,
    authorName,
    publishedAt: asString(row.created_at) ?? undefined,
  });
}

function isPersisted(url: string | null) {
  return Boolean(url) && !isEphemeralInstagramMediaUrl(url);
}

function hasPlayableMedia(post: InstagramPost) {
  return isPersisted(post.videoUrl) || isPersisted(post.thumbnailUrl);
}

function hasEphemeralMedia(post: InstagramPost) {
  return (
    (Boolean(post.videoUrl) && isEphemeralInstagramMediaUrl(post.videoUrl)) ||
    (Boolean(post.thumbnailUrl) && isEphemeralInstagramMediaUrl(post.thumbnailUrl))
  );
}

async function loadCachedPosts(): Promise<InstagramPost[]> {
  const supabase = await getSocialReadClient();
  const { data, error } = await withJwtSkewRetry(() =>
    supabase
      .from("social_posts")
      .select(
        "external_id, author_name, text, media_url, thumbnail_url, media_type, post_url, created_at, fetched_at",
      )
      .eq("platform", "instagram")
      .order("fetched_at", { ascending: false }),
  );

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

  const wantedVideo = Boolean(post.videoUrl);
  const wantedImage = Boolean(post.thumbnailUrl) && !post.videoUrl;
  const persisted = await persistInstagramMedia(admin, post);
  if (hasEphemeralMedia(persisted)) {
    console.error("Instagram post still has ephemeral media after persist.");
    return false;
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("social_posts").upsert(
    {
      platform: "instagram",
      external_id: persisted.postId,
      author_name: persisted.authorName,
      text: persisted.caption,
      media_url: persisted.videoUrl ?? persisted.thumbnailUrl,
      thumbnail_url: persisted.thumbnailUrl,
      media_type: persisted.videoUrl
        ? "video"
        : persisted.thumbnailUrl
          ? "image"
          : null,
      post_url: persisted.postUrl,
      created_at: persisted.publishedAt,
      fetched_at: now,
    },
    { onConflict: "platform,external_id" },
  );

  if (error) {
    console.error("Failed to cache Instagram post:", error.message);
    return false;
  }

  if (wantedVideo && !isPersisted(persisted.videoUrl)) {
    await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: EPOCH,
    });
    return false;
  }
  if (wantedImage && !isPersisted(persisted.thumbnailUrl)) {
    await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: EPOCH,
    });
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
  const incomplete =
    cached.length === 0 ||
    cached.some((post) => hasEphemeralMedia(post) || !hasPlayableMedia(post));
  if (fresh && !incomplete) return;

  try {
    const post = await syncLatestInstagramMediaFromGraph();
    if (!post) {
      console.warn(
        "Instagram Graph API returned no media. Check INSTAGRAM_ACCOUNT_ID or INSTAGRAM_ACCESS_TOKEN.",
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

  try {
    const account = await loadInstagramGraphAccount();
    if (account) await ensureFreshInstagramToken(account);
  } catch (refreshError) {
    console.error(
      "Instagram token refresh failed:",
      refreshError instanceof Error ? refreshError.message : refreshError,
    );
  }

  await syncIfStale(cached);
  return latestPerHandle(await loadCachedPosts());
}
