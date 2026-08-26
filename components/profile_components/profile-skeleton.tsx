import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfilePageSkeleton() {
  return (
    <main className="flex w-full justify-center" aria-busy="true">
      <div className="w-full max-w-4xl">
        <Skeleton className="h-12 w-48" />
        <div className="mt-8 flex flex-col gap-8">
          <div className="flex flex-col gap-5 md:flex-row">
            <Skeleton className="h-44 w-full shrink-0 rounded-md md:h-[250px] md:w-[200px]" />
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-end justify-between gap-2">
                      <Skeleton className="h-7 w-40" />
                      <Skeleton className="size-8 rounded-md" />
                    </div>
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-px" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-px" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="size-4 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex w-full justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="size-8 rounded-md" />
              </div>
              <Skeleton className="h-3 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
                <div className="flex w-full gap-2 lg:contents">
                  <Skeleton className="h-20 min-w-0 flex-1 rounded-xl lg:w-28 lg:flex-none" />
                  <Skeleton className="h-20 min-w-0 flex-1 rounded-xl lg:w-28 lg:flex-none" />
                  <Skeleton className="h-20 min-w-0 flex-1 rounded-xl lg:w-32 lg:flex-none" />
                </div>
                <Skeleton className="h-20 w-full rounded-xl lg:flex-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="ml-8 flex items-center gap-3 sm:ml-auto">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="size-4" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
