import { Skeleton } from "@/components/ui/skeleton";

function ProcessColumnSkeleton({
  titleWidth = "w-36",
  cards = 1,
}: {
  titleWidth?: string;
  cards?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-muted p-2 ring-1 ring-foreground/8 dark:bg-card">
      <div className="flex items-center justify-between gap-2 px-1.5 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className={`h-4 ${titleWidth}`} />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <Skeleton className="size-5 rounded-full" />
      </div>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg bg-background p-3 shadow-sm ring-1 ring-foreground/10 dark:bg-muted"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-14 rounded-md" />
        </div>
      ))}
      <Skeleton className="h-7 w-full rounded-lg" />
    </div>
  );
}

export function ProcessTreeSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-3">
        <ProcessColumnSkeleton titleWidth="w-40" cards={2} />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <ProcessColumnSkeleton titleWidth="w-28" cards={1} />
        <ProcessColumnSkeleton titleWidth="w-36" cards={1} />
      </div>
      <div className="hidden min-w-0 flex-col gap-3 xl:flex">
        <ProcessColumnSkeleton titleWidth="w-32" cards={1} />
      </div>
    </div>
  );
}
