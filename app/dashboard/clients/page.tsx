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
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AddClient } from "@/components/project_components/add-client";
import { parseClientData, type ClientData } from "@/lib/clients/client-data";
import { canEdit } from "@/lib/profiles/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import {
  Building2,
  FolderHeart,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import Link from "next/link";

type ClientRow = {
  id: string;
  client_name: string;
  client_slug: string | null;
  created_at: string;
  client_data: unknown;
};

type DetailIcon = typeof MapPin;

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});

function contactSubtitle(data: ClientData) {
  const contact = data.client_contact;
  if (contact.kind === "personal" && contact.personal.name) {
    return contact.personal.job
      ? `${contact.personal.name} · ${contact.personal.job}`
      : contact.personal.name;
  }
  return data.financial_service || null;
}

function clientDetails(data: ClientData) {
  const details: {
    key: string;
    icon: DetailIcon;
    text: string;
    clamp?: boolean;
  }[] = [];
  const contact = data.client_contact;
  const selected =
    contact.kind === "personal" ? contact.personal : contact.company;
  const financialIsSubtitle = !(
    contact.kind === "personal" && contact.personal.name
  );

  if (data.address) {
    details.push({
      key: "address",
      icon: MapPin,
      text: data.address,
      clamp: true,
    });
  }
  if (selected.email) {
    details.push({ key: "email", icon: Mail, text: selected.email });
  }
  if (selected.phone) {
    details.push({ key: "phone", icon: Phone, text: selected.phone });
  }
  if (data.financial_service && !financialIsSubtitle) {
    details.push({
      key: "financial-service",
      icon: Landmark,
      text: data.financial_service,
    });
  }

  return details;
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const session = await getCachedSessionProfile();
  const editable = canEdit(session?.permissions);

  const [{ data: clients, error }, { data: projectRows, error: projectsError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, client_name, client_slug, created_at, client_data")
        .order("client_name"),
      supabase.from("projects").select("client_id"),
    ]);

  if (projectsError) {
    console.error("Failed to load client projects:", projectsError.message);
  }

  const projectCountByClient = new Map<string, number>();
  for (const row of projectRows ?? []) {
    const clientId = row.client_id as string | null;
    if (!clientId) continue;
    projectCountByClient.set(
      clientId,
      (projectCountByClient.get(clientId) ?? 0) + 1,
    );
  }

  if (error) {
    console.error("Failed to load clients:", error.message);
    return (
      <p className="text-sm text-muted-foreground">
        Could not load clients. {error.message}
      </p>
    );
  }

  const rows = (clients ?? []) as ClientRow[];

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
              <BreadcrumbPage>Clients</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4">
          <h1>Clients</h1>
          {editable ? <AddClient /> : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>No clients yet</EmptyTitle>
            <EmptyDescription>
              Get started by creating your first client.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {editable ? (
              <AddClient
                trigger={
                  <span className="flex items-center gap-2">
                    <Plus className="size-4" />
                    New client
                  </span>
                }
              />
            ) : null}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col">
            <p className="opacity-50">All clients ({rows.length})</p>
            <Separator />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {rows.map((client) => {
              const href = client.client_slug
                ? `/dashboard/clients/${client.client_slug}`
                : "#";
              const details = parseClientData(client.client_data);
              const subtitle = contactSubtitle(details);
              const lines = clientDetails(details);
              const projectCount = projectCountByClient.get(client.id) ?? 0;
              const added = new Date(client.created_at);
              const addedLabel = Number.isNaN(added.getTime())
                ? null
                : dateFormatter.format(added);

              return (
                <Link
                  key={client.id}
                  href={href}
                  className="block h-full min-w-0 hover:cursor-pointer"
                >
                  <Card className="group h-full">
                    <CardHeader>
                      <div className="min-w-0">
                        <div className="flex w-fit max-w-full flex-col">
                          <CardTitle className="truncate">
                            {client.client_name}
                          </CardTitle>
                          <div className="h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100" />
                        </div>
                        {subtitle ? (
                          <p className="truncate text-muted-foreground">
                            {subtitle}
                          </p>
                        ) : null}
                      </div>
                    </CardHeader>
                    {lines.length > 0 ? (
                      <CardContent className="flex flex-1 flex-col gap-1.5">
                        {lines.map((line) => (
                          <div
                            key={line.key}
                            className="flex min-w-0 items-start gap-2 text-muted-foreground"
                          >
                            <line.icon className="mt-0.5 size-3.5 shrink-0" />
                            <span
                              className={
                                line.clamp ? "line-clamp-2" : "truncate"
                              }
                            >
                              {line.text}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    ) : subtitle ? null : (
                      <CardContent className="flex-1">
                        <p className="text-muted-foreground">
                          No contact details yet.
                        </p>
                      </CardContent>
                    )}
                    <CardFooter className="mt-auto justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <FolderHeart className="size-3.5" />
                        {projectCount}{" "}
                        {projectCount === 1 ? "project" : "projects"}
                      </span>
                      {addedLabel ? <span>Added {addedLabel}</span> : null}
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
