import Link from "next/link";
import { Suspense } from "react";
import { SocialMediaWall } from "@/components/dashboard_components/social-media-wall";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

function SocialPageSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-xl" />
      ))}
    </div>
  );
}

export default function SocialPage() {
  return (
    <main className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Social Media</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1>Social Media</h1>
      </div>
      <Suspense fallback={<SocialPageSkeleton />}>
        <SocialMediaWall
          limit={24}
          showViewAll={false}
          showHeading={false}
          columns={3}
        />
      </Suspense>
    </main>
  );
}
