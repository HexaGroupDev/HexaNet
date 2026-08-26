import { Skeleton } from "@/components/ui/skeleton";

export default function WikiLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <div className="flex items-center gap-1">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
