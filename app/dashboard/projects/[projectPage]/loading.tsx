import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectPageLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-52" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="size-8" />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_12rem] lg:md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-xl border p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="mt-2 h-3 w-16" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          </div>
          <div className="rounded-xl border p-6">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        </div>
        <div className="flex h-fit flex-col gap-3 rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="size-7" />
          </div>
          <div className="flex items-center gap-2 p-1">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
          <div className="flex items-center gap-2 p-1">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
          <div className="flex items-center gap-2 p-1">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
