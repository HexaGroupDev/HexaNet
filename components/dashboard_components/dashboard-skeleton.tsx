import { CalendarSkeleton } from "@/components/dashboard_components/calendar";
import { EmployeeLookupSkeleton } from "@/components/dashboard_components/employee-lookup";
import { GreetingSkeleton } from "@/components/dashboard_components/greeting";
import { NewsFeedSkeleton } from "@/components/dashboard_components/news-feed";
import { QuickLinksSkeleton } from "@/components/dashboard_components/quick-links";
import { SocialMediaWallSkeleton } from "@/components/dashboard_components/social-media-wall";

export function DashboardSkeleton() {
  return (
    <main aria-busy="true">
      <GreetingSkeleton />
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
            <NewsFeedSkeleton />
          </div>
          <div className="order-4 min-w-0">
            <SocialMediaWallSkeleton />
          </div>
        </div>
        <div className="contents md:flex md:flex-col md:gap-3">
          <div className="order-1 min-w-0">
            <CalendarSkeleton />
          </div>
          <div className="order-2 min-w-0">
            <QuickLinksSkeleton />
          </div>
          <div className="order-5 min-w-0">
            <EmployeeLookupSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
