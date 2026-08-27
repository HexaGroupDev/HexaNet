export const SOCIAL_PLATFORMS = ["linkedin", "instagram", "tiktok"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialMediaType = "image" | "video";

export type SocialPost = {
  id: string;
  platform: SocialPlatform;
  author: string;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  mediaType?: SocialMediaType;
  postUrl: string;
  createdAt: string;
  likes?: number;
  comments?: number;
};

export function socialPostId(platform: SocialPlatform, externalId: string) {
  return `${platform}:${externalId}`;
}
