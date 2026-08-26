import { Heart, MessageCircle, Play } from "lucide-react";
import {
  SocialPlatformIcon,
  platformLabel,
} from "@/components/dashboard_components/social-platform-icon";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/social/time";
import type { SocialPost } from "@/lib/social/types";

function previewSrc(post: SocialPost) {
  return post.thumbnailUrl ?? post.mediaUrl;
}

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

export function SocialPostCard({ post }: { post: SocialPost }) {
  const image = previewSrc(post);
  const isVideo = post.mediaType === "video" || post.platform === "tiktok";
  const time = relativeTime(post.createdAt);

  return (
    <Card className="gap-0 border py-0 transition-colors hover:bg-muted/40">
      <a
        href={post.postUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${platformLabel(post.platform)} post by ${post.author}`}
        className="flex h-full flex-col"
      >
        {image ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
            {/* CDN hosts vary and TikTok covers expire; skip next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="size-full object-cover"
            />
            {isVideo ? (
              <span className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white">
                <Play className="size-3.5 fill-current" />
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <SocialPlatformIcon platform={post.platform} />
              {platformLabel(post.platform)}
            </span>
            {time ? (
              <time
                dateTime={post.createdAt}
                className="text-xs text-muted-foreground"
              >
                {time}
              </time>
            ) : null}
          </div>

          {post.text ? (
            <p className="line-clamp-3 text-sm leading-snug">{post.text}</p>
          ) : !image ? (
            <p className="text-sm text-muted-foreground">View on {platformLabel(post.platform)}</p>
          ) : null}

          {post.likes != null || post.comments != null ? (
            <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              {post.likes != null ? (
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-3" />
                  {formatCount(post.likes)}
                </span>
              ) : null}
              {post.comments != null ? (
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  {formatCount(post.comments)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </a>
    </Card>
  );
}
