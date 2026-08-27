import Link from "next/link";
import { Share2 } from "lucide-react";
import { SocialPostCard } from "@/components/dashboard_components/social-post-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSocialPosts } from "@/lib/social/load-posts";
import type { SocialPost } from "@/lib/social/types";
import { cn } from "@/lib/utils";

function PostGrid({
  posts,
  columns,
}: {
  posts: SocialPost[];
  columns: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
      )}
    >
      {posts.map((post) => (
        <SocialPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function EmptyWall() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Share2 />
        </EmptyMedia>
        <EmptyTitle>No posts yet</EmptyTitle>
        <EmptyDescription>
          Latest Instagram, TikTok, and LinkedIn posts will show up here once
          accounts are connected.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function SocialMediaWallSkeleton() {
  return (
    <section className="flex flex-col gap-3" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-52 rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export async function SocialMediaWall({
  limit = 8,
  showViewAll = true,
  showHeading = true,
  columns = 2,
}: {
  limit?: number;
  showViewAll?: boolean;
  showHeading?: boolean;
  columns?: 2 | 3;
}) {
  const posts = await loadSocialPosts(limit);

  return (
    <section className="flex flex-col gap-3">
      {showHeading ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-medium">Social Media</h2>
          {showViewAll ? (
            <Link
              href="/dashboard/social"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          ) : null}
        </div>
      ) : null}
      {posts.length === 0 ? (
        <EmptyWall />
      ) : (
        <PostGrid posts={posts} columns={columns} />
      )}
    </section>
  );
}
