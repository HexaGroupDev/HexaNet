import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientPageLoading() {
  return (
    <main className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-72" />
        <Skeleton className="h-8 w-48" />
      </div>

      <section className="flex flex-col gap-5">
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-4 shrink-0" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, cardIndex) => (
            <Card key={cardIndex}>
              <CardHeader className="border-b">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: cardIndex === 0 ? 4 : 3 }).map(
                  (_, index) => (
                    <div key={index} className="flex gap-3">
                      <Skeleton className="size-4 shrink-0" />
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-2.5 w-12" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
