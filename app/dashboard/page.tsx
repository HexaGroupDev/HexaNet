import { Suspense } from "react";
import { Calendar } from "@/components/dashboard_components/calendar";
import { EmployeeLookup } from "@/components/dashboard_components/employee-lookup";
import {
  Greeting,
  GreetingSkeleton,
} from "@/components/dashboard_components/greeting";
import { NewsFeed } from "@/components/dashboard_components/news-feed";
import { QuickLinks } from "@/components/dashboard_components/quick-links";
import {
  SocialMediaWall,
  SocialMediaWallSkeleton,
} from "@/components/dashboard_components/social-media-wall";

export default function Dashboard() {
  return (
    <main>
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
      <div
        className="
        grid grid-cols-1 md:gap-4
        md:grid-cols-[minmax(0,1fr)_260px]
        lg:grid-cols-[minmax(0,1fr)_400px]
        "
      >
        <div className="flex flex-col gap-3">
          <QuickLinks />
          <NewsFeed />
          <Suspense fallback={<SocialMediaWallSkeleton />}>
            <SocialMediaWall />
          </Suspense>
        </div>
        <div className="flex flex-col gap-3">
          <Calendar />
          <EmployeeLookup />
        </div>
      </div>
    </main>
  );
}
