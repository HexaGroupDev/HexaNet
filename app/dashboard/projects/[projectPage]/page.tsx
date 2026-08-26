import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectSettings } from "@/components/project_components/project-settings";
import {
  ProjectDescription,
  ProjectTitle,
} from "@/components/project_components/project-fields";
import {
  ProjectLinks,
  type ProjectLink,
} from "@/components/project_components/project-links";
import { parseProjectMembers } from "@/lib/projects/project-members";
import { canEdit } from "@/lib/profiles/permissions";
import { profilePath } from "@/lib/profiles/profile-path";
import { createClient } from "@/lib/supabase/server";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";

type ClientEmbed = {
  client_name: string;
  client_slug: string | null;
} | null;

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

function normalizeClient(
  clients: ClientEmbed | ClientEmbed[] | null | undefined,
): ClientEmbed {
  if (!clients) return null;
  return Array.isArray(clients) ? (clients[0] ?? null) : clients;
}

function parseProjectLinks(value: unknown): ProjectLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is ProjectLink =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as ProjectLink).title === "string" &&
      typeof (entry as ProjectLink).link === "string",
  );
}

function initials(username: string | null) {
  if (!username?.trim()) return "?";
  return username.trim().slice(0, 2).toUpperCase();
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectPage: string }>;
}) {
  const { projectPage } = await params;
  const supabase = await createClient();

  // Project + client via FK. Member ids live in jsonb, so profiles is a second query.
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      `
      project_id,
      project_name,
      project_description,
      project_links,
      project_members,
      owner_id,
      clients ( client_name, client_slug )
    `,
    )
    .eq("project_slug", projectPage)
    .maybeSingle();

  if (error) {
    console.error("Failed to load project:", error.message);
  }

  if (!project) {
    notFound();
  }

  const client = normalizeClient(project.clients as ClientEmbed | ClientEmbed[]);
  const links = parseProjectLinks(project.project_links);
  const members = parseProjectMembers(project.project_members).sort((a, b) => {
    if (!a.joined_at && !b.joined_at) return 0;
    if (!a.joined_at) return 1;
    if (!b.joined_at) return -1;
    return a.joined_at.localeCompare(b.joined_at);
  });
  const memberIds = [
    ...new Set([
      project.owner_id,
      ...members.map((row) => row.member_id),
    ]),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", memberIds);

  const profileById = new Map<string, ProfileRow>(
    (profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]),
  );

  const people = memberIds
    .map((id) => profileById.get(id))
    .filter((profile): profile is ProfileRow => !!profile);
  const session = await getCachedSessionProfile();
  const editable = canEdit(session?.permissions);

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
              <BreadcrumbLink render={<Link href="/dashboard/projects" />}>
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.project_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex justify-between items-center gap-4">
          <ProjectTitle
            projectId={project.project_id}
            initialName={project.project_name}
          />
          {editable ? (
            <ProjectSettings
              projectId={project.project_id}
              projectName={project.project_name}
            />
          ) : null}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_12rem] lg:md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <ProjectDescription
                projectId={project.project_id}
                initialDescription={project.project_description}
              />
            </CardHeader>
            <CardContent>
              <ProjectLinks
                projectId={project.project_id}
                initialLinks={links}
              />
            </CardContent>
          </Card>
          {/* This will link to the client's page. */}
          <Link
            href={
              client?.client_slug
                ? `/dashboard/clients/${client.client_slug}`
                : "#"
            }
          >
            <Card className="group">
              <CardHeader>
                <div className="flex flex-col w-fit">
                  <CardTitle>Client Overview</CardTitle>
                  <div className="h-px w-full origin-left bg-primary transition-transform duration-200 scale-x-0 group-hover:scale-x-100"></div>
                </div>
                <CardDescription>
                  {client?.client_name ?? "No client"}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
        <Card className="h-fit">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>People</CardTitle>
            <Button variant="ghost" size="sm">
              <UsersRound />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              people.map((person) => (
                <Link
                  key={person.id}
                  href={
                    person.username ? profilePath(person.username) : "#"
                  }
                >
                  <div className="flex items-center gap-2 hover:bg-muted/50 rounded-md duration-100 p-1">
                    <Avatar>
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
                    <div>
                      <p>{person.username ?? "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        {person.id === project.owner_id ? "Owner" : "Member"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
