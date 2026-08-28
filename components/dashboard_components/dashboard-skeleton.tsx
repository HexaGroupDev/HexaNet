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
        grid grid-cols-1 md:gap-4
        md:grid-cols-[minmax(0,1fr)_260px]
        lg:grid-cols-[minmax(0,1fr)_400px]
        "
      >
        <div className="flex flex-col gap-3">
          <QuickLinksSkeleton />
          <NewsFeedSkeleton />
          <SocialMediaWallSkeleton />
        </div>
        <div className="flex flex-col gap-3">
          <CalendarSkeleton />
          <EmployeeLookupSkeleton />
        </div>
      </div>
    </main>
  );
}
