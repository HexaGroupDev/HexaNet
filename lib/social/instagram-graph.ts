import {
  toPost,
  type InstagramPost,
} from "@/lib/social/instagram";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;
const DEFAULT_HANDLE = "hexagroupdigital";
/** Refresh when the token expires within this window. */
const REFRESH_WITHIN_MS = 10 * 24 * 60 * 60 * 1000;

export type InstagramGraphAccount = {
  rowId: number | null;
  accountId: string;
  accountName: string;
  accessToken: string;
  tokenExpiresAt: string | null;
  credentialSource: "social_accounts" | "env";
};

const DEFAULT_ACCOUNT_ID = "17841408485169324";
const LONG_LIVED_FALLBACK_SECONDS = 60 * 24 * 60 * 60;

type GraphAuthError = {
  message?: string;
  type?: string;
  code?: number;
};

type GraphMediaItem = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

type RefreshResponse = {
  access_token?: string;
  expires_in?: number;
  error?: GraphAuthError;
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function configuredAccountId() {
  return process.env.INSTAGRAM_ACCOUNT_ID?.trim() || DEFAULT_ACCOUNT_ID;
}

function isReauthorizationError(error?: GraphAuthError | null) {
  return error?.code === 190;
}

function logInstagramAuthFailure(
  context: string,
  error?: GraphAuthError | null,
  status?: number,
) {
  if (isReauthorizationError(error)) {
    console.error(
      "Instagram reauthorization required:",
      error?.message ?? "access revoked or token expired",
    );
    return;
  }
  console.error(context, error?.message ?? (status != null ? `HTTP ${status}` : "unknown error"));
}

function expiresAtFromSeconds(expiresIn: number) {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
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

  return {
    rowId: null,
    accountId: configuredAccountId(),
    accountName: process.env.INSTAGRAM_USERNAME?.trim() || DEFAULT_HANDLE,
    accessToken,
    tokenExpiresAt: process.env.INSTAGRAM_TOKEN_EXPIRES_AT?.trim() || null,
    credentialSource: "env",
  };
}

function rowToAccount(row: Record<string, unknown>): InstagramGraphAccount | null {
  const accessToken = asString(row.access_token);
  const accountId = asString(row.account_id);
  if (!accessToken || !accountId) return null;

  return {
    rowId: typeof row.id === "number" ? row.id : null,
    accountId,
    accountName: asString(row.account_name) ?? DEFAULT_HANDLE,
    accessToken,
    tokenExpiresAt: asString(row.token_expires_at),
    credentialSource: "social_accounts",
  };
}

async function loadDbAccount(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string,
): Promise<InstagramGraphAccount | null> {
  const { data, error } = await admin
    .from("social_accounts")
    .select("id, account_id, account_name, access_token, token_expires_at")
    .eq("platform", "instagram")
    .eq("account_id", accountId)
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Instagram account:", error.message);
    return null;
  }
  if (!data) return null;
  return rowToAccount(data as Record<string, unknown>);
}

async function persistAccountToken(
  account: InstagramGraphAccount,
  accessToken: string,
  expiresIn: number,
): Promise<InstagramGraphAccount> {
  const tokenExpiresAt = expiresAtFromSeconds(expiresIn);
  const admin = tryAdminClient();
  if (!admin) {
    return { ...account, accessToken, tokenExpiresAt };
  }

  const { data, error } = await admin
    .from("social_accounts")
    .upsert(
      {
        platform: "instagram",
        account_id: account.accountId,
        account_name: account.accountName,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        enabled: true,
      },
      { onConflict: "platform,account_id" },
    )
    .select("id, account_id, account_name, access_token, token_expires_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to persist Instagram token:", error.message);
    return { ...account, accessToken, tokenExpiresAt };
  }

  return (
    rowToAccount((data ?? {}) as Record<string, unknown>) ?? {
      ...account,
      accessToken,
      tokenExpiresAt,
      credentialSource: "social_accounts",
    }
  );
}

async function exchangeForLongLivedToken(accessToken: string) {
  const clientSecret = process.env.META_APP_SECRET?.trim();
  if (!clientSecret) return null;

  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as RefreshResponse;

  if (!response.ok || !payload.access_token || !payload.expires_in) {
    if (isReauthorizationError(payload.error)) {
      logInstagramAuthFailure("Instagram long-lived token exchange failed", payload.error, response.status);
    }
    return null;
  }

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in,
  };
}

async function seedAccountFromEnv(
  fromEnv: InstagramGraphAccount,
): Promise<InstagramGraphAccount | null> {
  const exchanged = await exchangeForLongLivedToken(fromEnv.accessToken);
  const accessToken = exchanged?.accessToken ?? fromEnv.accessToken;
  const expiresIn = exchanged?.expiresIn ?? LONG_LIVED_FALLBACK_SECONDS;
  return persistAccountToken(fromEnv, accessToken, expiresIn);
}

export async function loadInstagramGraphAccount(): Promise<InstagramGraphAccount | null> {
  const accountId = configuredAccountId();
  const admin = tryAdminClient();

  if (admin) {
    const fromDb = await loadDbAccount(admin, accountId);
    if (fromDb) return fromDb;

    const fromEnv = accountFromEnv();
    if (fromEnv) return seedAccountFromEnv(fromEnv);
  }

  return accountFromEnv();
}

/**
 * Long-lived Instagram Login tokens last ~60 days and can be refreshed server-side:
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
    logInstagramAuthFailure(
      "Instagram token refresh failed",
      payload.error,
      response.status,
    );
    return account.accessToken;
  }

  const persisted = await persistAccountToken(
    account,
    payload.access_token,
    payload.expires_in,
  );
  return persisted.accessToken;
}

function postFromMediaItem(
  item: GraphMediaItem,
  handle: string,
): InstagramPost | null {
  const postId = asString(item.id);
  const permalink = asString(item.permalink);
  if (!postId) return null;

  const mediaType = asString(item.media_type)?.toUpperCase();
  const mediaUrl = asString(item.media_url);
  const thumbnailUrl = asString(item.thumbnail_url);

  const isVideo = mediaType === "VIDEO";
  const isImage = mediaType === "IMAGE";
  const isCarousel = mediaType === "CAROUSEL_ALBUM";

  // CAROUSEL_ALBUM: use the cover image only. Do not fetch child media.
  const videoUrl = isVideo ? mediaUrl : null;
  const previewUrl = isVideo
    ? thumbnailUrl
    : thumbnailUrl ?? (isImage || isCarousel ? mediaUrl : null);

  if (!videoUrl && !previewUrl) return null;

  let publishedAt: string | undefined;
  if (item.timestamp) {
    const parsedDate = Date.parse(item.timestamp);
    if (Number.isFinite(parsedDate)) {
      publishedAt = new Date(parsedDate).toISOString();
    }
  }

  const postPath = isVideo || permalink?.includes("/reel/") ? "reel" : "p";

  return toPost(handle, postId, {
    caption: asString(item.caption),
    thumbnailUrl: previewUrl,
    videoUrl,
    postPath,
    postUrl: permalink ?? undefined,
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

export async function fetchLatestInstagramMediaFromGraph(
  account: InstagramGraphAccount,
  accessToken: string,
): Promise<InstagramPost | null> {
  const handle = await resolveHandle(accessToken, account.accountName);
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(account.accountId)}/media`,
  );
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
  );
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { cache: "no-store" });
  let payload: {
    error?: GraphAuthError;
    data?: GraphMediaItem[];
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    console.error("Instagram Graph API media fetch failed:", response.status);
    return null;
  }

  if (!response.ok || payload.error) {
    logInstagramAuthFailure(
      "Instagram Graph API media fetch failed",
      payload.error,
      response.status,
    );
    return null;
  }

  const item = Array.isArray(payload.data) ? payload.data[0] : undefined;
  if (!item) {
    console.warn("Instagram Graph API returned no media.");
    return null;
  }

  return postFromMediaItem(item, handle);
}

export async function syncLatestInstagramMediaFromGraph(): Promise<InstagramPost | null> {
  const account = await loadInstagramGraphAccount();
  if (!account) return null;

  const accessToken = await ensureFreshInstagramToken(account);
  return fetchLatestInstagramMediaFromGraph(account, accessToken);
}
