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
import {
  EditClientContact,
  EditClientInformation,
  EditFinancialServiceContact,
} from "@/components/project_components/client-edit";
import { ProjectEngagementList } from "@/components/project_components/project-engagement-list";
import { canEdit } from "@/lib/profiles/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import {
  BriefcaseBusiness,
  Building2,
  Folder,
  FolderKanban,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClientCards } from "@/components/clients_components/client-cards";

type ClientRow = {
  id: string;
  client_name: string;
  client_slug: string;
  created_at: string;
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

const EMPTY = "—";

const exampleDetails = {
  address: "15 Rue de la Paix, 75002 Paris, France",
  financial_service: "BNP Paribas Corporate Banking",
  client_contact: {
    name: "Camille Laurent",
    job: "Operations Director",
    email: "camille.laurent@example.com",
    phone: "+33 1 84 80 20 10",
  },
  financial_service_contact: {
    title: "Corporate Account Manager",
    email: "account.manager@example.com",
    phone: "+33 1 42 98 12 40",
  },
};

function displayValue(value: string) {
  return value || EMPTY;
}

function ContactDetail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words">{children}</dd>
      </div>
    </div>
  );
}

function TextValue({ value, href }: { value: string; href?: string }) {
  if (!value) return <>{EMPTY}</>;
  if (!href) return <>{value}</>;

  const isExternal = href.startsWith("http");

  return (
    <a
      className="cursor-pointer hover:underline"
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
    >
      {value}
    </a>
  );
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ clientPage: string }>;
}) {
  const { clientPage } = await params;
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, client_name, client_slug, created_at")
    .eq("client_slug", clientPage)
    .maybeSingle<ClientRow>();

  if (error) {
    console.error("Failed to load client:", error.message);
  }

  if (!client) {
    notFound();
  }

  const details = exampleDetails;

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
      <ClientCards/>
      <section className="flex flex-col gap-5">
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
      </section>
    </main>
  );
}
