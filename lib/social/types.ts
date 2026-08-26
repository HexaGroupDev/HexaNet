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

export type SocialPostRow = {
  platform: SocialPlatform;
  external_id: string;
  author_name: string;
  text: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  media_type: SocialMediaType | null;
  post_url: string;
  created_at: string;
  likes: number | null;
  comments: number | null;
  fetched_at?: string;
};
