import { fetchLatestFacebookPostFromGraph } from "@/lib/social/facebook-graph";
import { toPost, type FacebookPost } from "@/lib/social/facebook";
import {
  isEphemeralFacebookMediaUrl,
  persistFacebookMedia,
} from "@/lib/social/persist-facebook-media";
import { createAdminClient } from "@/lib/supabase/admin";
import { withJwtSkewRetry } from "@/lib/supabase/jwt-skew";
import { createClient } from "@/lib/supabase/server";

const SYNC_ID = "facebook";
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;
const EPOCH = "1970-01-01T00:00:00.000Z";

function tryAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error("Facebook cache write skipped:", error);
    return null;
  }
}

async function getSocialReadClient() {
  return tryAdminClient() ?? (await createClient());
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rowToPost(row: Record<string, unknown>): FacebookPost | null {
  const postId = asString(row.external_id);
  if (!postId) return null;

  const mediaType = asString(row.media_type);
  const mediaUrl = asString(row.media_url);
  const thumbnailUrl = asString(row.thumbnail_url);

  return toPost(postId, {
    caption: asString(row.text),
    thumbnailUrl:
      thumbnailUrl ?? (mediaType === "video" ? null : mediaUrl),
    videoUrl: mediaType === "video" ? mediaUrl : null,
    postUrl: asString(row.post_url),
    authorName: asString(row.author_name) ?? undefined,
    handle: asString(row.author_name),
    publishedAt: asString(row.created_at) ?? undefined,
  });
}

function isPersisted(url: string | null) {
  return Boolean(url) && !isEphemeralFacebookMediaUrl(url);
}

function hasPlayableMedia(post: FacebookPost) {
  return isPersisted(post.videoUrl) || isPersisted(post.thumbnailUrl);
}

function hasEphemeralMedia(post: FacebookPost) {
  return (
    (Boolean(post.videoUrl) && isEphemeralFacebookMediaUrl(post.videoUrl)) ||
    (Boolean(post.thumbnailUrl) && isEphemeralFacebookMediaUrl(post.thumbnailUrl))
  );
}

async function loadCachedPosts(): Promise<FacebookPost[]> {
  const supabase = await getSocialReadClient();
  const { data, error } = await withJwtSkewRetry(() =>
    supabase
      .from("social_posts")
      .select(
        "external_id, author_name, text, media_url, thumbnail_url, media_type, post_url, created_at, fetched_at",
      )
      .eq("platform", "facebook")
      .order("fetched_at", { ascending: false }),
  );

  if (error) {
    console.error("Failed to load cached Facebook posts:", error.message);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const post = rowToPost(row as Record<string, unknown>);
    return post ? [post] : [];
  });
}

async function cachePost(post: FacebookPost) {
  const admin = tryAdminClient();
  if (!admin) return false;

  const wantedVideo = Boolean(post.videoUrl);
  const persisted = await persistFacebookMedia(admin, post);
  if (hasEphemeralMedia(persisted)) {
    console.error("Facebook post still has ephemeral media after persist.");
    return false;
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("social_posts").upsert(
    {
      platform: "facebook",
      external_id: persisted.postId,
      author_name: persisted.authorName,
      text: persisted.caption,
      media_url: persisted.videoUrl ?? persisted.thumbnailUrl,
      thumbnail_url: persisted.thumbnailUrl,
      media_type: persisted.videoUrl ? "video" : null,
      post_url: persisted.postUrl,
      created_at: persisted.publishedAt,
      fetched_at: now,
    },
    { onConflict: "platform,external_id" },
  );

  if (error) {
    console.error("Failed to cache Facebook post:", error.message);
    return false;
  }

  if (wantedVideo && !isPersisted(persisted.videoUrl)) {
    await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: EPOCH,
    });
    return false;
  }
  return true;
}

async function syncIfStale(cached: FacebookPost[]) {
  const admin = tryAdminClient();
  if (!admin) return;

  const { data, error } = await admin
    .from("social_sync_state")
    .select("last_updated")
    .eq("id", SYNC_ID)
    .maybeSingle();

  if (error) {
    console.error("Failed to read Facebook sync state:", error.message);
    return;
  }

  if (!data) {
    const { error: insertError } = await admin
      .from("social_sync_state")
      .insert({ id: SYNC_ID, last_updated: EPOCH });
    if (insertError && insertError.code !== "23505") {
      console.error("Failed to create Facebook sync state:", insertError.message);
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
    const post = await fetchLatestFacebookPostFromGraph();
    if (!post) {
      console.warn(
        "Facebook Graph API returned no post. Check FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN.",
      );
      return;
    }

    if (!(await cachePost(post))) return;

    const { error: stampError } = await admin.from("social_sync_state").upsert({
      id: SYNC_ID,
      last_updated: new Date().toISOString(),
    });
    if (stampError) {
      console.error("Failed to stamp Facebook sync:", stampError.message);
    }
  } catch (syncError) {
    console.error("Facebook Graph API sync failed:", syncError);
  }
}

export async function loadFacebookPosts(): Promise<FacebookPost[]> {
  const cached = await loadCachedPosts();
  await syncIfStale(cached);
  return loadCachedPosts();
}
