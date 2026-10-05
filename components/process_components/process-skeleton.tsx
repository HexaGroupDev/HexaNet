import { Skeleton } from "@/components/ui/skeleton";

function ProcessBoxSkeleton({
  titleWidth = "w-36",
  nested = false,
}: {
  titleWidth?: string;
  nested?: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="space-y-2">
          <Skeleton className={`h-4 ${titleWidth}`} />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="size-7 rounded-md" />
      </div>
      {nested ? (
        <div className="flex flex-col gap-2 border-t bg-muted/25 px-4 py-3">
          <div className="space-y-2 rounded-xl border bg-background p-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-2 rounded-xl border bg-background p-3">
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProcessTreeSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ProcessBoxSkeleton titleWidth="w-40" nested />
      <ProcessBoxSkeleton titleWidth="w-32" />
      <ProcessBoxSkeleton titleWidth="w-44" nested />
      <ProcessBoxSkeleton titleWidth="w-28" />
      <ProcessBoxSkeleton titleWidth="w-36" />
      <ProcessBoxSkeleton titleWidth="w-24" nested />
    </div>
  );
}
