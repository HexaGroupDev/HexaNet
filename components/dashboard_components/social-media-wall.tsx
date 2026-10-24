import { Skeleton } from "@/components/ui/skeleton";
import { SocialCarousel } from "@/components/dashboard_components/social-carousel";
import { loadFacebookPosts } from "@/lib/social/load-facebook";
import { loadInstagramPosts } from "@/lib/social/load-instagram";
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
    <section className="flex min-w-0 flex-col gap-3" aria-busy="true">
      <Skeleton className="h-5 w-16" />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="w-full min-w-0 overflow-hidden">
          <div className="relative left-1/2 flex w-max -translate-x-1/2 items-center gap-2">
            <Skeleton className="aspect-[9/16] h-[24rem] w-[13.5rem] origin-center scale-[0.82] rounded-xl opacity-70" />
            <Skeleton className="aspect-[9/16] h-[24rem] w-[13.5rem] rounded-xl" />
            <Skeleton className="aspect-[9/16] h-[24rem] w-[13.5rem] origin-center scale-[0.82] rounded-xl opacity-70" />
          </div>
        </div>
        <div className="flex justify-center gap-1.5">
          <Skeleton className="h-1.5 w-4 rounded-full" />
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className="size-1.5 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function firstPost<T>(result: PromiseSettledResult<T[]>): T | null {
  if (result.status === "rejected") {
    console.error("Social platform load failed:", result.reason);
    return null;
  }
  return result.value[0] ?? null;
}

export async function SocialMediaWall() {
  const [tiktokResult, instagramResult, facebookResult] = await Promise.allSettled([
    loadTikTokPosts(),
    loadInstagramPosts(),
    loadFacebookPosts(),
  ]);
  const tiktok = firstPost(tiktokResult);
  const instagram = firstPost(instagramResult);
  const facebook = firstPost(facebookResult);

  const slides: SocialSlide[] = SOCIAL_PLATFORMS.map(({ platform, label }) => {
    if (platform === "instagram" && instagram) {
      return {
        platform,
        label,
        postUrl: instagram.postUrl,
        caption: instagram.caption,
        thumbnailUrl: instagram.thumbnailUrl,
        videoUrl: instagram.videoUrl,
        authorName: instagram.authorName,
        handle: instagram.handle,
        publishedAt: instagram.publishedAt,
      };
    }
    if (platform === "tiktok" && tiktok) {
      return {
        platform,
        label,
        postUrl: tiktok.postUrl,
        caption: tiktok.caption,
        thumbnailUrl: tiktok.thumbnailUrl,
        videoUrl: null,
        embedUrl: tiktok.embedUrl,
        authorName: tiktok.authorName,
        handle: tiktok.handle,
        publishedAt: tiktok.publishedAt,
      };
    }
    if (platform === "facebook" && facebook) {
      return {
        platform,
        label,
        postUrl: facebook.postUrl,
        caption: facebook.caption,
        thumbnailUrl: facebook.thumbnailUrl,
        videoUrl: facebook.videoUrl,
        authorName: facebook.authorName,
        handle: facebook.handle,
        publishedAt: facebook.publishedAt,
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
