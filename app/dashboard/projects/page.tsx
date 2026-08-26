import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ProjectCards from "@/components/project_components/project-cards";
import { AddProject } from "@/components/project_components/add-project";
import type { ClientOption } from "@/components/project_components/add-project";
import { createClient } from "@/lib/supabase/server";
import { Filter } from "lucide-react";
import Link from "next/link";
import { canEdit } from "@/lib/profiles/permissions";
import { getCachedSessionProfile } from "@/lib/supabase/cached-session-profile";

export default async function Projects() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, client_name")
    .order("client_name");

  const clientOptions = (clients ?? []) as ClientOption[];
  const session = await getCachedSessionProfile();
  const editable = canEdit(session?.permissions);

  return (
    <div className="flex flex-col gap-10">
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
              <BreadcrumbPage>Projects</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <h1>Projects</h1>
          <div className="flex">
            <Button variant="ghost">
              <Filter />
            </Button>
            {editable ? <AddProject clients={clientOptions} /> : null}
          </div>
        </div>
      </div>
      <ProjectCards clients={clientOptions} />
    </div>
  );
}
