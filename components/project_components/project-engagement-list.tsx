import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ChevronRight, FolderHeart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type ProjectEngagementRow = {
  project_id: string;
  project_name: string;
  project_slug: string;
  project_label: string | null;
  owner_id: string;
  created_at: string;
};

export type ProjectEngagementProfile = {
  id: string;
  username: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});

export function ProjectEngagementList({
  projects,
  profileById,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  projects: ProjectEngagementRow[];
  profileById: Map<string, ProjectEngagementProfile>;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  if (projects.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderHeart />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {projects.map((project) => {
        const owner = profileById.get(project.owner_id);

        return (
          <Link
            key={project.project_id}
            href={`/dashboard/projects/${project.project_slug}`}
            className="flex cursor-pointer flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10 transition-colors duration-200 hover:bg-muted sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{project.project_name}</p>
                <p className="truncate text-muted-foreground">
                  {owner?.username ?? "Unknown"} · Created{" "}
                  {dateFormatter.format(new Date(project.created_at))}
                </p>
              </div>
            </div>
            <div className="ml-8 flex items-center gap-3 sm:ml-auto">
              <Badge variant="outline">
                {project.project_label ?? "Untitled"}
              </Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
