"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatNewsExcerpt,
  splitNewsBody,
  type NewsArticle,
} from "@/lib/news/news";
import {
  loadReadArticleIds,
  markArticleRead,
} from "@/lib/news/read-state";
import { cn } from "@/lib/utils";
import { AddNewsArticle } from "@/components/dashboard_components/add-news-article";

function UnreadAlertDot() {
  return (
    <span
      className="relative flex size-2 shrink-0 items-center justify-center"
      aria-hidden
    >
      <span className="pointer-events-none absolute size-3 rounded-full bg-amber-400/50 animate-ping" />
      <span className="relative size-2 rounded-full bg-amber-600" />
    </span>
  );
}

function NewsDateMeta({
  article,
  isUnread,
}: {
  article: NewsArticle;
  isUnread: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {article.isLatest ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
          Latest
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        {isUnread ? <UnreadAlertDot /> : null}
        <span>{article.formattedDate}</span>
      </span>
    </div>
  );
}

function NewsPreviewCard({
  article,
  isUnread,
}: {
  article: NewsArticle;
  isUnread: boolean;
}) {
  const hasImage = Boolean(article.imageUrl);

  return (
    <div
      className={cn(
        "flex w-full gap-4",
        hasImage ? "flex-col lg:flex-row lg:items-center" : "flex-col",
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl!}
          alt=""
          className="order-1 aspect-[16/9] w-full shrink-0 rounded-lg object-cover lg:order-2 lg:aspect-auto lg:size-24"
        />
      ) : null}
      <div className="order-2 flex min-w-0 flex-1 flex-col justify-center gap-2 lg:order-1">
        <NewsDateMeta article={article} isUnread={isUnread} />
        <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
          {article.title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {formatNewsExcerpt(article.body)}{" "}
          <span className="font-medium text-foreground/80 transition-colors group-hover:text-primary">
            read more
          </span>
        </p>
      </div>
    </div>
  );
}

function NewsHeroImage({ article }: { article: NewsArticle }) {
  if (!article.imageUrl) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={article.imageUrl}
      alt=""
      className="aspect-[16/5] w-full border-b border-border/60 object-cover"
    />
  );
}

function OtherNewsCard({
  article,
  isUnread,
  onSelect,
}: {
  article: NewsArticle;
  isUnread: boolean;
  onSelect: () => void;
}) {
  const hasImage = Boolean(article.imageUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full gap-2.5 rounded-lg border border-border/60 bg-background/60 p-2 text-left transition-colors hover:cursor-pointer hover:bg-background",
        hasImage && "flex-row items-center",
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl!}
          alt=""
          className="order-2 size-12 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="order-1 min-w-0 flex-1">
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isUnread ? <UnreadAlertDot /> : null}
          <span>{article.formattedDate}</span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug">
          {article.title}
        </p>
      </div>
    </button>
  );
}

function NewsFeedHeader({ canPublish }: { canPublish: boolean }) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <CardTitle className="font-light">News Feed</CardTitle>
      {canPublish ? <AddNewsArticle /> : null}
    </CardHeader>
  );
}

export function NewsFeedClient({
  articles,
  canPublish = false,
}: {
  articles: NewsArticle[];
  canPublish?: boolean;
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState(articles[0]?.id ?? "");
  const [readIds, setReadIds] = useState<Set<string> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  const activeArticle =
    articles.find((article) => article.id === activeArticleId) ?? articles[0];
  const otherNews = articles
    .filter((article) => article.id !== activeArticle?.id)
    .slice(0, 2);

  useEffect(() => {
    setReadIds(loadReadArticleIds());
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    const sync = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    sync();
    carouselApi.on("select", sync);

    return () => {
      carouselApi.off("select", sync);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;

    const updateHeight = () => {
      const index = carouselApi.selectedScrollSnap();
      const slide = slideRefs.current[index];
      const viewport = viewportRef.current;
      if (!slide || !viewport) return;

      viewport.style.height = `${slide.getBoundingClientRect().height}px`;
    };

    updateHeight();
    carouselApi.on("select", updateHeight);
    carouselApi.on("reInit", updateHeight);
    window.addEventListener("resize", updateHeight);

    const slide = slideRefs.current[carouselApi.selectedScrollSnap()];
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && slide
        ? new ResizeObserver(updateHeight)
        : null;
    if (slide && resizeObserver) resizeObserver.observe(slide);

    return () => {
      carouselApi.off("select", updateHeight);
      carouselApi.off("reInit", updateHeight);
      window.removeEventListener("resize", updateHeight);
      resizeObserver?.disconnect();
    };
  }, [carouselApi, selectedIndex, articles]);

  if (articles.length === 0) {
    return (
      <Card className="border">
        <NewsFeedHeader canPublish={canPublish} />
        <CardContent>
          <p className="text-sm text-muted-foreground">No news yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (!activeArticle) {
    return (
      <Card className="border">
        <NewsFeedHeader canPublish={canPublish} />
        <CardContent>
          <p className="text-sm text-muted-foreground">No news yet.</p>
        </CardContent>
      </Card>
    );
  }

  function isUnread(articleId: string) {
    if (readIds === null) return false;
    return !readIds.has(articleId);
  }

  function markRead(articleId: string) {
    setReadIds((current) => markArticleRead(current ?? new Set(), articleId));
  }

  function openArticle(articleId: string) {
    setActiveArticleId(articleId);
    markRead(articleId);
    setOpen(true);
  }

  function selectArticle(articleId: string) {
    setActiveArticleId(articleId);
    markRead(articleId);
    const index = articles.findIndex((article) => article.id === articleId);
    if (index >= 0) {
      carouselApi?.scrollTo(index);
    }
  }

  return (
    <Card className="border">
      <NewsFeedHeader canPublish={canPublish} />
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <Carousel
            setApi={setCarouselApi}
            opts={{
              loop: articles.length > 1,
              align: "start",
              containScroll: "trimSnaps",
            }}
            className="w-full"
          >
            <div className="flex items-center gap-2">
              {articles.length > 1 ? (
                <CarouselPrevious className="static inset-auto my-0 size-8 shrink-0 translate-x-0 translate-y-0 disabled:opacity-30" />
              ) : null}
              <div
                ref={viewportRef}
                className="min-w-0 flex-1 overflow-hidden transition-[height] duration-200 ease-out"
              >
                <CarouselContent className="ml-0">
                  {articles.map((article, index) => (
                    <CarouselItem
                      key={article.id}
                      className="basis-full pl-0"
                    >
                      <div
                        ref={(element) => {
                          slideRefs.current[index] = element;
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openArticle(article.id)}
                          className="group w-full rounded-lg border border-transparent p-2 text-left transition-colors hover:cursor-pointer hover:border-border/60 hover:bg-muted/50"
                        >
                          <NewsPreviewCard
                            article={article}
                            isUnread={isUnread(article.id)}
                          />
                        </button>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </div>
              {articles.length > 1 ? (
                <CarouselNext className="static inset-auto my-0 size-8 shrink-0 translate-x-0 translate-y-0 disabled:opacity-30" />
              ) : null}
            </div>
          </Carousel>
          {articles.length > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {articles.map((article, index) => (
                <button
                  key={article.id}
                  type="button"
                  aria-label={`Go to news item ${index + 1}`}
                  aria-current={index === selectedIndex}
                  onClick={() => carouselApi?.scrollTo(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all hover:cursor-pointer",
                    index === selectedIndex
                      ? "w-4 bg-foreground"
                      : "w-1.5 bg-foreground/25 hover:bg-foreground/40",
                  )}
                />
              ))}
            </div>
          ) : null}
          <DialogContent className="flex max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <div
              key={activeArticle.id}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <NewsHeroImage article={activeArticle} />
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <DialogHeader className="gap-3 text-left">
                  <NewsDateMeta
                    article={activeArticle}
                    isUnread={isUnread(activeArticle.id)}
                  />
                  <DialogTitle className="text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
                    {activeArticle.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Full article: {activeArticle.title}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  {splitNewsBody(activeArticle.body).map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
            {otherNews.length > 0 ? (
              <footer className="shrink-0 border-t bg-muted/30 px-5 py-4 sm:px-6">
                <h4 className="mb-3 text-sm font-medium">Other news</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {otherNews.map((article) => (
                    <OtherNewsCard
                      key={article.id}
                      article={article}
                      isUnread={isUnread(article.id)}
                      onSelect={() => selectArticle(article.id)}
                    />
                  ))}
                </div>
              </footer>
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
