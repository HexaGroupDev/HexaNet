import { Suspense } from "react";
import { Calendar } from "@/components/dashboard_components/calendar";
import { EmployeeLookup } from "@/components/dashboard_components/employee-lookup";
import {
  Greeting,
  GreetingSkeleton,
} from "@/components/dashboard_components/greeting";
import {
  NewsFeed,
  NewsFeedSkeleton,
} from "@/components/dashboard_components/news-feed";
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
        grid grid-cols-1 gap-3
        md:gap-4
        md:grid-cols-[minmax(0,1fr)_260px]
        lg:grid-cols-[minmax(0,1fr)_400px]
        "
      >
        <div className="contents md:flex md:min-w-0 md:flex-col md:gap-3">
          <div className="order-3 min-w-0">
            <Suspense fallback={<NewsFeedSkeleton />}>
              <NewsFeed />
            </Suspense>
          </div>
          <div className="order-4 min-w-0">
            <Suspense fallback={<SocialMediaWallSkeleton />}>
              <SocialMediaWall />
            </Suspense>
          </div>
        </div>
        <div className="contents md:flex md:flex-col md:gap-3">
          <div className="order-1 min-w-0">
            <Calendar />
          </div>
          <div className="order-2 min-w-0">
            <QuickLinks />
          </div>
          <div className="order-5 min-w-0">
            <EmployeeLookup />
          </div>
        </div>
      </div>
    </main>
  );
}
