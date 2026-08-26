import type { SocialPlatform } from "@/lib/social/types";
import { cn } from "@/lib/utils";

const LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.15" cy="6.85" r="1.05" fill="currentColor" />
    </svg>
  );
}

function LinkedInMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.25h4.56V23H.22V8.25zM8.34 8.25h4.37v2.01h.06c.61-1.16 2.1-2.38 4.32-2.38 4.62 0 5.47 3.04 5.47 7v8.12h-4.56v-7.2c0-1.72-.03-3.93-2.4-3.93-2.4 0-2.77 1.87-2.77 3.8V23H8.34V8.25z" />
    </svg>
  );
}

function TikTokMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M14.5 3c.4 2.6 1.9 4.4 4.5 4.7v3.1c-1.5 0-2.9-.5-4.1-1.3v6.7c0 3.4-2.6 6.2-6.2 6.3-3.5.1-6.4-2.7-6.5-6.2S5.5 10 9.1 9.9c.3 0 .6 0 .9.1v3.3c-.3-.1-.6-.2-.9-.2-1.7 0-3.1 1.4-3.1 3.1s1.4 3.1 3.1 3.1 3.1-1.4 3.1-3.1V3h2.3z" />
    </svg>
  );
}

const ICONS: Record<SocialPlatform, typeof InstagramMark> = {
  instagram: InstagramMark,
  linkedin: LinkedInMark,
  tiktok: TikTokMark,
};

const TONES: Record<SocialPlatform, string> = {
  instagram: "text-[#E4405F]",
  linkedin: "text-[#0A66C2]",
  tiktok: "text-foreground",
};

export function platformLabel(platform: SocialPlatform) {
  return LABELS[platform];
}

export function SocialPlatformIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const Icon = ICONS[platform];
  return <Icon className={cn("size-3.5", TONES[platform], className)} />;
}
