import {
  parseInstagramPostUrl,
  toPost,
  type InstagramPost,
} from "@/lib/social/instagram";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;
/** Refresh when the token expires within this window. */
const REFRESH_WITHIN_MS = 10 * 24 * 60 * 60 * 1000;

export type InstagramGraphAccount = {
  rowId: number | null;
  accountId: string;
  accountName: string;
  accessToken: string;
  tokenExpiresAt: string | null;
};

type GraphMediaItem = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

type RefreshResponse = {
  access_token?: string;
  expires_in?: number;
  error?: { message?: string };
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function tryAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function accountFromEnv(): InstagramGraphAccount | null {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;

  const accountId = process.env.INSTAGRAM_USER_ID?.trim() || "me";
  const accountName =
    process.env.INSTAGRAM_USERNAME?.trim() ??
    process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME?.trim() ??
    "instagram";

  const expiresAt = process.env.INSTAGRAM_TOKEN_EXPIRES_AT?.trim() || null;

  return {
    rowId: null,
    accountId,
    accountName,
    accessToken,
    tokenExpiresAt: expiresAt,
  };
}

export async function loadInstagramGraphAccount(): Promise<InstagramGraphAccount | null> {
  const fromEnv = accountFromEnv();
  if (fromEnv) return fromEnv;

  const admin = tryAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("social_accounts")
    .select(
      "id, account_id, account_name, access_token, token_expires_at",
    )
    .eq("platform", "instagram")
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Instagram account:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as Record<string, unknown>;
  const accessToken = asString(row.access_token);
  const accountId = asString(row.account_id);
  if (!accessToken || !accountId) return null;

  return {
    rowId: typeof row.id === "number" ? row.id : null,
    accountId,
    accountName: asString(row.account_name) ?? "instagram",
    accessToken,
    tokenExpiresAt: asString(row.token_expires_at),
  };
}

async function persistRefreshedToken(
  account: InstagramGraphAccount,
  accessToken: string,
  expiresIn: number,
) {
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  if (account.rowId === null) {
    console.warn(
      "Instagram token refreshed but not persisted — store credentials in social_accounts for automatic renewal.",
    );
    return tokenExpiresAt;
  }

  const admin = tryAdminClient();
  if (!admin) return tokenExpiresAt;

  const { error } = await admin
    .from("social_accounts")
    .update({
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
    })
    .eq("id", account.rowId);

  if (error) {
    console.error("Failed to persist refreshed Instagram token:", error.message);
  }

  return tokenExpiresAt;
}

/**
 * Long-lived Instagram user tokens last ~60 days and can be refreshed server-side:
 * GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token
 */
export async function ensureFreshInstagramToken(
  account: InstagramGraphAccount,
): Promise<string> {
  const expiresAtMs = account.tokenExpiresAt
    ? Date.parse(account.tokenExpiresAt)
    : Number.NaN;
  const needsRefresh =
    Number.isFinite(expiresAtMs) &&
    expiresAtMs - Date.now() < REFRESH_WITHIN_MS;

  if (!needsRefresh) return account.accessToken;

  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", account.accessToken);

  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as RefreshResponse;

  if (!response.ok || !payload.access_token || !payload.expires_in) {
    console.error(
      "Instagram token refresh failed:",
      payload.error?.message ?? response.status,
    );
    return account.accessToken;
  }

  await persistRefreshedToken(account, payload.access_token, payload.expires_in);
  return payload.access_token;
}

function postFromMediaItem(
  item: GraphMediaItem,
  handle: string,
): InstagramPost | null {
  const permalink = asString(item.permalink);
  const parsed = permalink ? parseInstagramPostUrl(permalink) : null;
  const postId = parsed?.shortcode ?? asString(item.id);
  if (!postId) return null;

  const mediaType = asString(item.media_type)?.toUpperCase();
  const productType = asString(item.media_product_type)?.toUpperCase();
  const isVideo =
    mediaType === "VIDEO" ||
    productType === "REELS" ||
    Boolean(permalink?.includes("/reel/"));

  if (!isVideo) return null;

  const videoUrl = asString(item.media_url);
  const thumbnailUrl = asString(item.thumbnail_url);
  if (!videoUrl && !thumbnailUrl) return null;

  const postPath =
    productType === "REELS" || permalink?.includes("/reel/") ? "reel" : "p";

  let publishedAt: string | undefined;
  if (item.timestamp) {
    const parsedDate = Date.parse(item.timestamp);
    if (Number.isFinite(parsedDate)) {
      publishedAt = new Date(parsedDate).toISOString();
    }
  }

  return toPost(handle, postId, {
    caption: asString(item.caption),
    thumbnailUrl,
    videoUrl,
    postPath,
    authorName: handle,
    publishedAt,
  });
}

async function resolveHandle(
  token: string,
  fallback: string,
): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set("fields", "username");
  url.searchParams.set("access_token", token);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return fallback;

  const payload = (await response.json()) as { username?: string };
  return asString(payload.username) ?? fallback;
}

export async function fetchLatestInstagramVideoFromGraph(
  account: InstagramGraphAccount,
  accessToken: string,
): Promise<InstagramPost | null> {
  const handle = await resolveHandle(accessToken, account.accountName);
  const mediaPath =
    account.accountId === "me"
      ? `${GRAPH_BASE}/me/media`
      : `${GRAPH_BASE}/${encodeURIComponent(account.accountId)}/media`;

  const url = new URL(mediaPath);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp",
  );
  url.searchParams.set("limit", "25");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    console.error("Instagram Graph API media fetch failed:", response.status, body);
    return null;
  }

  const payload = (await response.json()) as { data?: GraphMediaItem[] };
  const items = Array.isArray(payload.data) ? payload.data : [];

  for (const item of items) {
    const post = postFromMediaItem(item, handle);
    if (post) return post;
  }

  return null;
}

export async function syncLatestInstagramVideoFromGraph(): Promise<InstagramPost | null> {
  const account = await loadInstagramGraphAccount();
  if (!account) return null;

  const accessToken = await ensureFreshInstagramToken(account);
  return fetchLatestInstagramVideoFromGraph(account, accessToken);
}
