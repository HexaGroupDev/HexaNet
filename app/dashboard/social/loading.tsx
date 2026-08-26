import { SocialMediaWallSkeleton } from "@/components/dashboard_components/social-media-wall";

export default function SocialLoading() {
  return (
    <div className="flex flex-col gap-10">
      <SocialMediaWallSkeleton />
    </div>
  );
}
