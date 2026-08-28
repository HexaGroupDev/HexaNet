import { Skeleton } from "@/components/ui/skeleton";
import { SocialCarousel } from "@/components/dashboard_components/social-carousel";
import { SOCIAL_PLATFORMS, type SocialSlide } from "@/lib/social/slide";
import { loadTikTokPosts } from "@/lib/social/load-tiktok";

function placeholderSlide(
  platform: SocialSlide["platform"],
  label: string,
): SocialSlide {
  return {
    platform,
    label,
    postUrl: null,
    caption: null,
    thumbnailUrl: null,
    videoUrl: null,
    authorName: null,
    handle: null,
    publishedAt: null,
  };
}

export function SocialMediaWallSkeleton() {
  return (
    <section className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-2">
        <Skeleton className="mx-auto h-[24rem] aspect-[9/16] rounded-xl" />
        <div className="flex justify-center gap-1.5">
          <Skeleton className="h-1.5 w-4 rounded-full" />
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="size-1.5 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export async function SocialMediaWall() {
  const tiktok = (await loadTikTokPosts())[0] ?? null;

  const slides: SocialSlide[] = SOCIAL_PLATFORMS.map(({ platform, label }) => {
    if (platform === "tiktok" && tiktok) {
      return {
        platform,
        label,
        postUrl: tiktok.postUrl,
        caption: tiktok.caption,
        thumbnailUrl: tiktok.thumbnailUrl,
        videoUrl: tiktok.videoUrl,
        authorName: tiktok.authorName,
        handle: tiktok.handle,
        publishedAt: tiktok.publishedAt,
      };
    }
    return placeholderSlide(platform, label);
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-base font-medium">Social</h2>
      <SocialCarousel slides={slides} />
    </section>
  );
}
