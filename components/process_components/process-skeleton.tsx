import { Skeleton } from "@/components/ui/skeleton";

function ProcessRowSkeleton({
  titleWidth = "w-40",
  showBadge = true,
}: {
  titleWidth?: string;
  showBadge?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-xl border px-4 py-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className={`h-4 ${titleWidth}`} />
      </div>
      <div className="flex items-center gap-2">
        {showBadge ? (
          <Skeleton className="h-5 w-16 rounded-full" />
        ) : null}
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-7 rounded-md" />
      </div>
    </div>
  );
}

export function ProcessTreeSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <ProcessRowSkeleton titleWidth="w-44" />
      <div className="flex min-w-0">
        <div className="w-6 shrink-0" />
        <ProcessRowSkeleton titleWidth="w-32" showBadge={false} />
      </div>
      <ProcessRowSkeleton titleWidth="w-52" />
      <div className="flex min-w-0">
        <div className="w-6 shrink-0" />
        <ProcessRowSkeleton titleWidth="w-36" />
      </div>
      <ProcessRowSkeleton titleWidth="w-28" showBadge={false} />
    </div>
  );
}
