import { fetchInstagramPosts } from "@/lib/social/instagram";
import { fetchLinkedInPosts } from "@/lib/social/linkedin";
import { upsertSocialPosts } from "@/lib/social/posts";
import { fetchTikTokPosts } from "@/lib/social/tiktok";
import type { SocialPlatform, SocialPost } from "@/lib/social/types";

export type SocialSyncResult = {
  synced: number;
  platforms: Record<
    SocialPlatform,
    { status: "ok" | "skipped" | "error"; count: number; error?: string }
  >;
};

const POSTS_PER_PLATFORM = 8;

function emptyResult(): SocialSyncResult["platforms"][SocialPlatform] {
  return { status: "skipped", count: 0 };
}

export async function syncSocialPosts(): Promise<SocialSyncResult> {
  const platforms: SocialSyncResult["platforms"] = {
    instagram: emptyResult(),
    tiktok: emptyResult(),
    linkedin: emptyResult(),
  };

  const settled = await Promise.allSettled([
    fetchInstagramPosts(POSTS_PER_PLATFORM),
    fetchTikTokPosts(POSTS_PER_PLATFORM),
    fetchLinkedInPosts(POSTS_PER_PLATFORM),
  ]);

  const labels = ["instagram", "tiktok", "linkedin"] as const;
  const posts: SocialPost[] = [];

  settled.forEach((result, index) => {
    const platform = labels[index];
    if (result.status === "fulfilled") {
      platforms[platform] = {
        status: result.value.length === 0 ? "skipped" : "ok",
        count: result.value.length,
      };
      posts.push(...result.value);
      return;
    }

    const message =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    platforms[platform] = { status: "error", count: 0, error: message };
    console.error(`Social sync failed for ${platform}:`, message);
  });

  await upsertSocialPosts(posts);

  return { synced: posts.length, platforms };
}
