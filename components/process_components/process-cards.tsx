import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, CirclePlus, Workflow } from "lucide-react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import {
  AddProcess,
  type ProcessOption,
} from "@/components/process_components/add-process";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ProcessNode = ProcessOption & { children: ProcessNode[] };

function buildProcessTree(processes: ProcessOption[]): ProcessNode[] {
  const nodes = new Map<number, ProcessNode>();
  for (const process of processes) {
    nodes.set(process.id, { ...process, children: [] });
  }

  const roots: ProcessNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id != null && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function ProcessBoardCard({
  node,
  processOptions,
  depth = 0,
}: {
  node: ProcessNode;
  processOptions: ProcessOption[];
  depth?: number;
}) {
  const hasChildren = node.children.length > 0;
  const href = node.process_slug
    ? `/dashboard/process/${node.process_slug}`
    : "#";
  const isRoot = depth === 0;

  return (
    <Collapsible
      defaultOpen={depth < 2}
      className="group/process min-w-0 w-full"
    >
      <Card
        className={cn(
          "relative flex w-full flex-col gap-0 overflow-hidden",
          isRoot ? "bg-card" : "bg-background shadow-none ring-border/60",
        )}
      >
        <div
          className={cn(
            "group/process-header relative flex items-start justify-between gap-2",
            isRoot ? "px-(--card-spacing) pb-3" : "px-3 py-2.5",
          )}
        >
          <Link
            href={href}
            className="absolute inset-0 z-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={node.process_name}
          />
          <div className="pointer-events-none relative z-10 min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              {hasChildren ? (
                <CollapsibleTrigger
                  className="pointer-events-auto mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:cursor-pointer hover:bg-muted hover:text-foreground"
                  aria-label={`Toggle ${node.process_name} sub-processes`}
                >
                  <ChevronDown className="size-4 transition-transform duration-200 group-data-[open]/process:rotate-180" />
                </CollapsibleTrigger>
              ) : null}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "leading-snug wrap-break-word",
                    isRoot ? "font-medium" : "text-sm font-medium",
                  )}
                >
                  {node.process_name}
                </p>
                <div className="mt-0.5 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover/process-header:scale-x-100 group-focus-within/process-header:scale-x-100" />
                {node.process_labels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {node.process_labels.map((label) => (
                      <Badge key={label} className={cn(!isRoot && "text-[10px]")}>
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {hasChildren ? (
                  <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                    {node.children.length} sub-process
                    {node.children.length === 1 ? "" : "es"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="pointer-events-auto relative z-10 shrink-0">
            <AddProcess
              trigger={<CirclePlus />}
              parentId={node.id}
              processes={processOptions}
              triggerVariant="ghost"
              triggerSize="icon-sm"
              triggerClassName="text-muted-foreground hover:text-foreground"
              ariaLabel="Add sub-process"
            />
          </div>
        </div>

        {hasChildren ? (
          <CollapsibleContent>
            <div
              className={cn(
                "flex flex-col gap-2 border-t border-border/50 bg-muted/25",
                isRoot ? "px-(--card-spacing) py-3" : "px-2.5 py-2",
              )}
            >
              {node.children.map((child) => (
                <ProcessBoardCard
                  key={child.id}
                  node={child}
                  processOptions={processOptions}
                  depth={depth + 1}
                />
              ))}
            </div>
          </CollapsibleContent>
        ) : null}
      </Card>
    </Collapsible>
  );
}

export function ProcessCards({
  processes = [],
  processOptions,
}: {
  processes?: ProcessOption[];
  processOptions?: ProcessOption[];
}) {
  const options = processOptions ?? processes;

  if (processes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Workflow />
          </EmptyMedia>
          <EmptyTitle>No Processes Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any processes yet. Get started by creating
            your first process.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <AddProcess trigger="Create Process" processes={options} />
        </EmptyContent>
      </Empty>
    );
  }

  const tree = buildProcessTree(processes);

  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tree.map((node) => (
        <ProcessBoardCard
          key={node.id}
          node={node}
          processOptions={options}
        />
      ))}
    </div>
  );
}
