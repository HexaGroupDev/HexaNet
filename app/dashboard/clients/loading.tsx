import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-px w-full" />
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Skeleton className="h-20 rounded-xl border bg-muted/50" />
          <Skeleton className="h-20 rounded-xl border bg-muted/50" />
          <Skeleton className="h-20 rounded-xl border bg-muted/50" />
          <Skeleton className="h-20 rounded-xl border bg-muted/50" />
        </div>
      </div>
    </main>
  );
}
