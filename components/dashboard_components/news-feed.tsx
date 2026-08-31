import { NewsFeedClient } from "@/components/dashboard_components/news-feed-client";
import { Card } from "@/components/ui/card";
import { loadNewsArticles } from "@/lib/news/load-news";
import { canAdmin } from "@/lib/profiles/permissions";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import { Skeleton } from "@/components/ui/skeleton";

export function NewsFeedSkeleton() {
  return (
    <Card className="border" aria-busy="true">
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <Skeleton className="h-5 w-24" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-1.5 rounded-full" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export async function NewsFeed() {
  const [articles, session] = await Promise.all([
    loadNewsArticles(),
    getCachedSessionProfile(),
  ]);
  const canPublish = canAdmin(session?.permissions);

  return <NewsFeedClient articles={articles} canPublish={canPublish} />;
}
