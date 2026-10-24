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
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="mt-auto h-10 w-full rounded-b-xl" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
