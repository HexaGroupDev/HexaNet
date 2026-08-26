import { ProcessTreeSkeleton } from "@/components/process_components/process-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-44" />
        <div className="flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-36" />
            <div className="flex items-center gap-1">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
          <ProcessTreeSkeleton />
        </div>
      </div>
    </main>
  );
}
