import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { FolderHeart, Plus } from "lucide-react";
import Link from "next/link";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AddProject } from "@/components/project_components/add-project";
import type { ClientOption } from "@/components/project_components/add-project";
import { memberIdsFromProjectMembers } from "@/lib/projects/project-members";
import { canEdit } from "@/lib/profiles/permissions";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";

type ClientEmbed = {
  id: string;
  client_name: string;
  client_slug: string | null;
} | null;

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type ProjectRow = {
  project_id: string;
  project_name: string;
  project_slug: string;
  project_label: string | null;
  project_description: string | null;
  owner_id: string;
  created_at: string;
  clients: ClientEmbed;
  project_members: unknown;
};

const MAX_VISIBLE_AVATARS = 3;

function initials(username: string | null) {
  if (!username?.trim()) return "?";
  return username.trim().slice(0, 2).toUpperCase();
}

function normalizeClient(
  clients: ClientEmbed | ClientEmbed[] | null | undefined,
): ClientEmbed {
  if (!clients) return null;
  return Array.isArray(clients) ? (clients[0] ?? null) : clients;
}

export default async function ProjectCards({
  clients = [],
}: {
  clients?: ClientOption[];
}) {
  const supabase = await createClient();
  const session = await getCachedSessionProfile();
  const editable = canEdit(session?.permissions);

  // Projects + clients via FK. Member ids live in jsonb, so profiles is a second query.
  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      project_id,
      project_name,
      project_slug,
      project_label,
      project_description,
      project_members,
      owner_id,
      created_at,
      clients ( id, client_name, client_slug )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load projects:", error.message);
    return (
      <p className="text-sm text-muted-foreground">
        Could not load projects. {error.message}
      </p>
    );
  }

  const rows: ProjectRow[] = (projects ?? []).map((project) => ({
    project_id: project.project_id,
    project_name: project.project_name,
    project_slug: project.project_slug,
    project_label: project.project_label,
    project_description: project.project_description,
    owner_id: project.owner_id,
    created_at: project.created_at,
    clients: normalizeClient(project.clients),
    project_members: project.project_members,
  }));

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderHeart />
          </EmptyMedia>
          <EmptyTitle>No Projects Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any projects yet. Get started by creating
            your first project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          {editable ? (
            <AddProject trigger="Create Project" clients={clients} />
          ) : null}
        </EmptyContent>
      </Empty>
    );
  }

  const memberIdsByProject = new Map<string, string[]>();
  for (const project of rows) {
    memberIdsByProject.set(
      project.project_id,
      memberIdsFromProjectMembers(project.project_members),
    );
  }

  const profileIds = [
    ...new Set([
      ...rows.map((row) => row.owner_id),
      ...rows.flatMap((row) => memberIdsByProject.get(row.project_id) ?? []),
    ]),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", profileIds);

  const profileById = new Map<string, ProfileRow>(
    (profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]),
  );

  const groups = new Map<
    string,
    { clientName: string; clientSlug: string | null; projects: ProjectRow[] }
  >();

  for (const project of rows) {
    const clientId = project.clients?.id ?? "unknown";
    const clientName = project.clients?.client_name ?? "No client";
    const clientSlug = project.clients?.client_slug ?? null;
    const group = groups.get(clientId) ?? {
      clientName,
      clientSlug,
      projects: [],
    };
    group.projects.push(project);
    groups.set(clientId, group);
  }

  return (
    <div className="flex flex-col gap-10">
      {[...groups.entries()].map(([clientId, group]) => (
        <div key={clientId} className="flex flex-col gap-5">
          <div className="flex flex-col">
            <p className="opacity-50 transition-opacity group-hover:opacity-100">
              {group.clientName}
            </p>
            <div className="h-px w-full origin-left bg-primary transition-transform duration-200 scale-x-0 group-hover:scale-x-100" />
            <Separator />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.projects.map((project) => {
              const peopleIds = [
                ...new Set([
                  project.owner_id,
                  ...(memberIdsByProject.get(project.project_id) ?? []),
                ]),
              ];
              const people = peopleIds
                .map((id) => profileById.get(id))
                .filter((profile): profile is ProfileRow => !!profile);
              const visible = people.slice(0, MAX_VISIBLE_AVATARS);
              const hasMore = people.length > MAX_VISIBLE_AVATARS;

              return (
                <Link
                  key={project.project_id}
                  href={`/dashboard/projects/${project.project_slug}`}
                  className="hover:cursor-pointer"
                >
                  <Card className="group">
                    <CardHeader>
                      <div className="flex flex-col w-fit">
                        <CardTitle>{project.project_name}</CardTitle>
                        <div
                          className="
                          h-px
                          w-full
                          origin-left
                          bg-primary
                          transition-transform
                          duration-200
                          scale-x-0 group-hover:scale-x-100"
                        />
                      </div>
                      <CardAction>
                        <Badge>{project.project_label ?? "Untitled"}</Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-3">
                        {project.project_description?.trim()
                          ? project.project_description
                          : "No description yet."}
                      </CardDescription>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      {group.clientName}
                      <AvatarGroup className="*:data-[slot=avatar]:ring-[color-mix(in_oklch,var(--muted)_50%,var(--card))] *:data-[slot=avatar-group-count]:ring-[color-mix(in_oklch,var(--muted)_50%,var(--card))]">
                        {visible.map((person) => (
                          <Avatar key={person.id}>
                            {person.avatar_url ? (
                              <AvatarImage
                                src={person.avatar_url}
                                alt={person.username ?? "Member"}
                              />
                            ) : null}
                            <AvatarFallback>
                              {initials(person.username)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {hasMore ? (
                          <AvatarGroupCount>
                            <Plus />
                          </AvatarGroupCount>
                        ) : null}
                      </AvatarGroup>
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
