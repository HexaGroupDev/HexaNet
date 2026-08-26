import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddProcess } from "@/components/process_components/add-process";
import { ProcessDescription } from "@/components/process_components/process-fields";
import { ProcessLinks } from "@/components/process_components/process-links";
import { ProcessSubprocesses } from "@/components/process_components/process-subprocesses";
import {
  parseProcessLinks,
  toProcessOption,
  type ProcessOption,
} from "@/lib/processes/process";
import { createClient } from "@/lib/supabase/server";

function collectDescendants(
  parentId: number,
  processes: ProcessOption[],
): ProcessOption[] {
  const children = processes.filter((process) => process.parent_id === parentId);
  return children.flatMap((child) => [
    child,
    ...collectDescendants(child.id, processes),
  ]);
}

function collectAncestors(
  process: ProcessOption,
  processes: ProcessOption[],
): ProcessOption[] {
  const byId = new Map(processes.map((row) => [row.id, row]));
  const ancestors: ProcessOption[] = [];
  const seen = new Set<number>();
  let currentId = process.parent_id;

  while (currentId != null) {
    if (seen.has(currentId)) break;
    seen.add(currentId);

    const ancestor = byId.get(currentId);
    if (!ancestor) break;

    ancestors.unshift(ancestor);
    currentId = ancestor.parent_id;
  }

  return ancestors;
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ processPage: string }>;
}) {
  const { processPage } = await params;
  const supabase = await createClient();

  const { data: processes, error } = await supabase
    .from("processes")
    .select(
      "id, process_name, process_slug, process_labels, parent_id, process_description, process_links",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load process:", error.message);
  }

  const processRow = (processes ?? []).find(
    (row) => row.process_slug === processPage,
  );

  if (!processRow) {
    notFound();
  }

  const processOptions = (processes ?? []).map(toProcessOption);
  const process = toProcessOption(processRow);
  const links = parseProcessLinks(processRow.process_links);
  const description =
    typeof processRow.process_description === "string"
      ? processRow.process_description
      : null;

  const ancestors = collectAncestors(process, processOptions);
  const descendants = collectDescendants(process.id, processOptions);

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
              <BreadcrumbLink render={<Link href="/dashboard/process" />}>
                Process
              </BreadcrumbLink>
            </BreadcrumbItem>
            {ancestors.map((ancestor) => (
              <Fragment key={ancestor.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {ancestor.process_slug ? (
                    <BreadcrumbLink
                      render={
                        <Link
                          href={`/dashboard/process/${ancestor.process_slug}`}
                        />
                      }
                    >
                      {ancestor.process_name}
                    </BreadcrumbLink>
                  ) : (
                    <span>{ancestor.process_name}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{process.process_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1>{process.process_name}</h1>
          </div>
        <AddProcess parentId={process.id} processes={processOptions} />
        </div>
            {process.process_labels.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {process.process_labels.map((label) => (
                  <Badge key={label}>{label}</Badge>
                ))}
              </div>
            ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
          <ProcessDescription
            processId={process.id}
            initialDescription={description}
          />
        </CardHeader>
        <CardContent>
          <ProcessLinks processId={process.id} initialLinks={links} />
        </CardContent>
      </Card>
      <ProcessSubprocesses
        descendants={descendants}
        processOptions={processOptions}
      />
    </main>
  );
}
