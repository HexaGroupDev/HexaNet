import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { ProcessBrowser } from "@/components/process_components/process-browser";
import { toProcessOption } from "@/lib/processes/process";
import { createClient } from "@/lib/supabase/server";

export default async function Process() {
  const supabase = await createClient();
  const { data: processes, error } = await supabase
    .from("processes")
    .select("id, process_name, process_slug, process_labels, parent_id")
    .order("created_at", { ascending: true });

  const processOptions = (processes ?? []).map(toProcessOption);

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
              <BreadcrumbPage>Process</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ProcessBrowser
          processes={processOptions}
          error={error?.message ?? null}
        />
      </div>
    </main>
  );
}
