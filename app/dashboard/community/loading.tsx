import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl ring-1 ring-foreground/10"
          >
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-1.5 px-4 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
