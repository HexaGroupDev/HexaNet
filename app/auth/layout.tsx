import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Suspense fallback={<Skeleton className="h-40 rounded-lg" />}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
