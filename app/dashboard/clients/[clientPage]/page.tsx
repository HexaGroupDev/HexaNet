import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddProject } from "@/components/project_components/add-project";
import { ClientSettings } from "@/components/project_components/client-settings";
import { ProjectEngagementList } from "@/components/project_components/project-engagement-list";
import { parseClientData } from "@/lib/clients/client-data";
import { canEdit } from "@/lib/profiles/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientCards } from "@/components/clients_components/client-cards";

type ClientRow = {
  id: string;
  client_name: string;
  client_slug: string;
  created_at: string;
  client_data: unknown;
};

type ProjectRow = {
  project_id: string;
  project_name: string;
  project_slug: string;
  project_label: string | null;
  owner_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

export default async function ClientPage({
  params,
}: {
  params: Promise<{ clientPage: string }>;
}) {
  const { clientPage } = await params;
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, client_name, client_slug, created_at, client_data")
    .eq("client_slug", clientPage)
    .maybeSingle<ClientRow>();

  if (error) {
    console.error("Failed to load client:", error.message);
  }

  if (!client) {
    notFound();
  }

  const details = parseClientData(client.client_data);

  const { data: projectData, error: projectsError } = await supabase
    .from("projects")
    .select(
      "project_id, project_name, project_slug, project_label, owner_id, created_at",
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Failed to load client projects:", projectsError.message);
  }

  const projects = (projectData ?? []) as ProjectRow[];
  const ownerIds = [...new Set(projects.map((project) => project.owner_id))];
  const { data: profileData } =
    ownerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds)
      : { data: [] };
  const profileById = new Map<string, ProfileRow>(
    (profileData ?? []).map((profile) => [profile.id, profile as ProfileRow]),
  );
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
              <BreadcrumbLink render={<Link href="/dashboard/clients" />}>
                Clients
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{client.client_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4">
          <h1>{client.client_name}</h1>
          {editable ? (
            <ClientSettings
              clientId={client.id}
              clientName={client.client_name}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <ClientCards
          clientId={client.id}
          clientData={details}
          editable={editable}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Projects
              <Badge variant="secondary">{projects.length}</Badge>
            </CardTitle>
            <CardDescription>
              Active and past engagements with {client.client_name}
            </CardDescription>
            <CardAction>
              {editable ? (
                <AddProject
                  clients={[{ id: client.id, client_name: client.client_name }]}
                  trigger={
                    <span className="flex items-center gap-2">
                      <Plus className="size-4" />
                      New project
                    </span>
                  }
                />
              ) : null}
            </CardAction>
          </CardHeader>
          <CardContent>
            <ProjectEngagementList
              projects={projects}
              profileById={profileById}
              emptyTitle="No projects yet"
              emptyDescription={`Create the first project for ${client.client_name}.`}
              emptyAction={
                editable ? (
                  <AddProject
                    clients={[
                      { id: client.id, client_name: client.client_name },
                    ]}
                    trigger={
                      <span className="flex items-center gap-2">
                        <Plus className="size-4" />
                        New project
                      </span>
                    }
                  />
                ) : null
              }
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
