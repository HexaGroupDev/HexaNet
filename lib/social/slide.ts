export type SocialPlatform = "instagram" | "tiktok" | "linkedin";

export type SocialSlide = {
  platform: SocialPlatform;
  label: string;
  postUrl: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  authorName: string | null;
  handle: string | null;
  publishedAt: string | null;
};

export const SOCIAL_PLATFORMS: {
  platform: SocialPlatform;
  label: string;
}[] = [
  { platform: "instagram", label: "Instagram" },
  { platform: "tiktok", label: "TikTok" },
  { platform: "linkedin", label: "LinkedIn" },
];
