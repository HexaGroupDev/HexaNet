"use client";

import { useEffect, useRef, useState } from "react";
import type { SocialSlide } from "@/lib/social/slide";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const AUTO_ADVANCE_MIN_MS = 8_000;
const AUTO_ADVANCE_MAX_MS = 12_000;

function nextDelay() {
  return (
    AUTO_ADVANCE_MIN_MS +
    Math.floor(Math.random() * (AUTO_ADVANCE_MAX_MS - AUTO_ADVANCE_MIN_MS + 1))
  );
}

const PLATFORM_CHROME: Record<
  SocialSlide["platform"],
  { title: string; icon: string; invertIcon?: boolean }
> = {
  facebook: { title: "FACEBOOK", icon: "/facebook.png" },
  instagram: { title: "INSTAGRAM", icon: "/instagram.png", invertIcon: true },
  tiktok: { title: "TIKTOK", icon: "/tik-tok.png" },
};

function formatPublishedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
  }).format(date);
}

function SocialPostCard({
  slide,
  active,
}: {
  slide: SocialSlide;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const published = formatPublishedAt(slide.publishedAt);
  const showEmbed = Boolean(slide.embedUrl) && active;
  const showVideo = Boolean(slide.videoUrl) && !videoFailed && !showEmbed;
  const placeholder =
    !slide.videoUrl && !slide.thumbnailUrl && !slide.caption && !slide.embedUrl;
  const chrome = PLATFORM_CHROME[slide.platform];

  useEffect(() => {
    setVideoFailed(false);
  }, [slide.videoUrl, slide.thumbnailUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    if (!(active && showVideo)) {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
      return;
    }

    const play = () => {
      video.muted = true;
      void video.play().catch(() => setVideoFailed(true));
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play();
    else video.addEventListener("canplay", play);

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else play();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
      video.removeEventListener("canplay", play);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, showVideo, slide.videoUrl]);

  const media = (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      {showEmbed ? (
        <>
          {slide.thumbnailUrl ? (
            <img
              src={slide.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <iframe
            src={slide.embedUrl ?? undefined}
            title={slide.caption || `${slide.label} video`}
            allow="autoplay; fullscreen"
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
          />
        </>
      ) : showVideo ? (
        <video
          ref={videoRef}
          src={slide.videoUrl ?? undefined}
          poster={slide.thumbnailUrl ?? undefined}
          muted
          loop
          playsInline
          preload={active ? "auto" : "metadata"}
          onEnded={(event) => {
            event.currentTarget.currentTime = 0;
            if (active) void event.currentTarget.play().catch(() => {});
          }}
          onError={() => setVideoFailed(true)}
          className="pointer-events-none h-full w-full object-cover"
        />
      ) : slide.thumbnailUrl ? (
        <img
          src={slide.thumbnailUrl}
          alt={slide.caption || `${slide.label} post`}
          className="h-full w-full object-cover"
        />
      ) : slide.caption ? (
        <div className="h-full w-full bg-muted" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
          <p className="font-medium">{slide.label}</p>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      )}
    </div>
  );

  const body = (
    <Card className="relative mx-auto aspect-[9/16] h-[24rem] overflow-hidden border py-0">
      {media}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-black/70 via-black/35 to-transparent px-3 pt-3 pb-9 text-white">
        <div className="flex items-center gap-2">
          <img
            src={chrome.icon}
            alt=""
            className={cn(
              "size-5 shrink-0 object-contain",
              chrome.invertIcon && "brightness-0 invert",
            )}
            style={
              chrome.invertIcon
                ? { filter: "brightness(0) invert(1)" }
                : undefined
            }
          />
          <p className="truncate text-[11px] font-semibold tracking-[0.16em] text-white">
            {chrome.title}
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-white">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium">
            {slide.authorName || slide.label}
            {slide.handle ? (
              <span className="ml-2 font-normal text-white/80">
                @{slide.handle}
              </span>
            ) : null}
          </p>
          {published ? (
            <time
              dateTime={slide.publishedAt ?? undefined}
              className="shrink-0 text-xs text-white/80"
            >
              {published}
            </time>
          ) : null}
        </div>
        {slide.caption ? (
          <p className="line-clamp-2 text-xs text-white/80">{slide.caption}</p>
        ) : placeholder ? (
          <p className="text-xs text-white/80">
            Latest {slide.label} post will show here.
          </p>
        ) : null}
      </div>
    </Card>
  );

  if (!slide.postUrl) return body;

  return (
    <a
      href={slide.postUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${slide.label} post`}
      className="mx-auto block w-fit rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </a>
  );
}

const LOOP_COPIES = 3;

function closestCopy(current: number, target: number, period: number, length: number) {
  let best = target;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let index = target; index < length; index += period) {
    const dist = Math.abs(index - current);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  }
  return best;
}

export function SocialCarousel({ slides }: { slides: SocialSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const period = slides.length;
  const loopedSlides = Array.from({ length: LOOP_COPIES }, (_, copy) =>
    slides.map((slide) => ({ slide, copy })),
  ).flat();
  const selectedPlatform = period > 0 ? selected % period : 0;

  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    return () => {
      api.off("select", sync);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    let timeoutId = 0;
    const schedule = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (document.hidden) return;
        api.scrollNext();
      }, nextDelay());
    };

    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [api, selected]);

  function goToPlatform(platformIndex: number) {
    if (!api || period === 0) return;
    api.scrollTo(
      closestCopy(api.selectedScrollSnap(), platformIndex, period, loopedSlides.length),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Carousel
        opts={{ loop: true, align: "center", containScroll: false }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {loopedSlides.map(({ slide, copy }, index) => {
            const focused = index === selected;
            return (
              <CarouselItem
                key={`${slide.platform}-${copy}`}
                className="basis-[14rem] pl-2"
              >
                <div
                  className={cn(
                    "relative mx-auto w-fit origin-center transition-[transform,opacity] duration-300 ease-out",
                    focused
                      ? "z-10 scale-100 opacity-100"
                      : "z-0 scale-[0.82] opacity-70",
                  )}
                  onClickCapture={(event) => {
                    if (focused) return;
                    event.preventDefault();
                    event.stopPropagation();
                    api?.scrollTo(index);
                  }}
                >
                  <SocialPostCard slide={slide} active={focused} />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-1 z-20 sm:left-2" disabled={false} />
        <CarouselNext className="right-1 z-20 sm:right-2" disabled={false} />
      </Carousel>
      <div className="flex items-center justify-center gap-1.5">
        {slides.map((slide, index) => (
          <button
            key={slide.platform}
            type="button"
            aria-label={`Go to ${slide.label}`}
            aria-current={index === selectedPlatform}
            onClick={() => goToPlatform(index)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === selectedPlatform
                ? "w-4 bg-foreground"
                : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
