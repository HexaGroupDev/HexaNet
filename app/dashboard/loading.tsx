import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      </div>
    </div>
  );
}
