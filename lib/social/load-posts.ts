import { fetchInstagramPosts } from "@/lib/social/instagram";
import { fetchLinkedInPosts } from "@/lib/social/linkedin";
import { fetchTikTokPosts } from "@/lib/social/tiktok";
import type { SocialPost } from "@/lib/social/types";

function perPlatformLimit(total: number) {
  return Math.min(20, Math.max(total, 8));
}

function byNewest(a: SocialPost, b: SocialPost) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export async function loadSocialPosts(limit = 8): Promise<SocialPost[]> {
  const count = perPlatformLimit(limit);
  const settled = await Promise.allSettled([
    fetchInstagramPosts(count),
    fetchTikTokPosts(count),
    fetchLinkedInPosts(count),
  ]);

  const posts: SocialPost[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      posts.push(...result.value);
      continue;
    }

    const message =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error("Social feed fetch failed:", message);
  }

  return posts.sort(byNewest).slice(0, limit);
}
