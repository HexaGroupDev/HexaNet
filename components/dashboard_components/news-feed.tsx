import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NewsFeedSkeleton() {
  return (
    <Card className="border" aria-busy="true">
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-12 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NewsFeed() {
  return <Card className="flex gap-1 border">News Feed</Card>;
}
