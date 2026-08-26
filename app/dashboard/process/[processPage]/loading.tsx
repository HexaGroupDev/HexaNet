import { ProcessTreeSkeleton } from "@/components/process_components/process-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessPageLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-64" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-xl border p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="mt-2 flex items-center justify-between gap-4">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-px flex-1" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <ProcessTreeSkeleton />
      </div>
    </main>
  );
}
