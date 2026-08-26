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
import { canEdit } from "@/lib/profiles/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

type ClientRow = {
  id: string;
  client_name: string;
  client_slug: string | null;
  created_at: string;
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const session = await getCachedSessionProfile();
  const editable = canEdit(session?.permissions);

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, client_name, client_slug, created_at")
    .order("client_name");

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rows.map((client) => {
              const href = client.client_slug
                ? `/dashboard/clients/${client.client_slug}`
                : "#";

              return (
                <Link
                  key={client.id}
                  href={href}
                  className="hover:cursor-pointer"
                >
                  <Card className="group">
                    <CardHeader>
                      <div className="flex flex-col w-fit">
                        <CardTitle>{client.client_name}</CardTitle>
                        <div className="h-px w-full origin-left bg-primary transition-transform duration-200 scale-x-0 group-hover:scale-x-100" />
                      </div>
                    </CardHeader>
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
