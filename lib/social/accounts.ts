import type { SocialPlatform } from "@/lib/social/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type SocialAccountCredentials = {
  source: "env" | "database";
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envCredentials(platform: SocialPlatform): SocialAccountCredentials | null {
  if (platform === "instagram") {
    const accessToken = readEnv("INSTAGRAM_ACCESS_TOKEN");
    if (!accessToken) return null;
    return {
      source: "env",
      platform,
      accountId: readEnv("INSTAGRAM_USER_ID") ?? "me",
      accountName: readEnv("INSTAGRAM_ACCOUNT_NAME") ?? "Instagram",
      accessToken,
    };
  }

  if (platform === "tiktok") {
    const accessToken = readEnv("TIKTOK_ACCESS_TOKEN");
    if (!accessToken) return null;
    return {
      source: "env",
      platform,
      accountId: readEnv("TIKTOK_OPEN_ID") ?? "tiktok",
      accountName: readEnv("TIKTOK_ACCOUNT_NAME") ?? "TikTok",
      accessToken,
      refreshToken: readEnv("TIKTOK_REFRESH_TOKEN"),
    };
  }

  const accessToken = readEnv("LINKEDIN_ACCESS_TOKEN");
  const accountId = readEnv("LINKEDIN_ORGANIZATION_ID");
  if (!accessToken || !accountId) return null;
  return {
    source: "env",
    platform,
    accountId,
    accountName: readEnv("LINKEDIN_ACCOUNT_NAME") ?? "LinkedIn",
    accessToken,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export async function getPlatformCredentials(
  platform: SocialPlatform,
): Promise<SocialAccountCredentials | null> {
  const fromEnv = envCredentials(platform);
  if (fromEnv) return fromEnv;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("social_accounts")
      .select(
        "platform, account_id, account_name, access_token, refresh_token, token_expires_at, enabled",
      )
      .eq("platform", platform)
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to load ${platform} social account:`, error.message);
      return null;
    }
    if (!isRecord(data)) return null;

    const accessToken = asString(data.access_token);
    const accountId = asString(data.account_id);
    if (!accessToken || !accountId) return null;

    return {
      source: "database",
      platform,
      accountId,
      accountName: asString(data.account_name) ?? platform,
      accessToken,
      refreshToken: asString(data.refresh_token),
      tokenExpiresAt: asString(data.token_expires_at),
    };
  } catch (error) {
    console.error(`Failed to load ${platform} social account:`, error);
    return null;
  }
}

export async function updateAccountTokens(
  credentials: SocialAccountCredentials,
  next: { accessToken: string; refreshToken?: string; expiresInSeconds?: number },
) {
  if (credentials.source !== "database") return;

  const tokenExpiresAt =
    next.expiresInSeconds != null
      ? new Date(Date.now() + next.expiresInSeconds * 1000).toISOString()
      : null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_accounts")
    .update({
      access_token: next.accessToken,
      refresh_token: next.refreshToken ?? credentials.refreshToken ?? null,
      token_expires_at: tokenExpiresAt,
    })
    .eq("platform", credentials.platform)
    .eq("account_id", credentials.accountId);

  if (error) {
    console.error(`Failed to update ${credentials.platform} tokens:`, error.message);
  }
}

export function tokenNeedsRefresh(
  expiresAt: string | undefined,
  leadMs: number,
) {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return false;
  return expires - Date.now() <= leadMs;
}
