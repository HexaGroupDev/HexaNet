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

const TREE_INDENT_REM = 1.5;

type ProcessNode = ProcessOption & { children: ProcessNode[] };

function TreeBranch({
  depth = 1,
  isLastSibling = true,
  guides = [],
}: {
  depth?: number;
  isLastSibling?: boolean;
  guides?: boolean[];
}) {
  if (depth <= 0) return null;

  return (
    <div
      className="relative flex shrink-0"
      style={{ width: `${depth * TREE_INDENT_REM}rem` }}
      aria-hidden
    >
      {Array.from({ length: depth }, (_, level) => {
        const isElbow = level === depth - 1;
        const showGuide = !isElbow && guides[level];
        return (
          <div
            key={level}
            className="relative h-full"
            style={{ width: `${TREE_INDENT_REM}rem` }}
          >
            {showGuide ? (
              <span className="absolute left-1/2 -top-3 -bottom-3 w-px -translate-x-1/2 bg-border" />
            ) : null}
            {isElbow ? (
              <>
                <span
                  className={cn(
                    "absolute left-1/2 w-px -translate-x-1/2 bg-border",
                    isLastSibling ? "-top-3 bottom-1/2" : "-top-3 -bottom-3",
                  )}
                />
                <span className="absolute left-1/2 top-1/2 h-px w-1/2 bg-border" />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

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

function ProcessTreeItem({
  node,
  processOptions,
  depth = 0,
  isLastSibling = true,
  guides = [],
}: {
  node: ProcessNode;
  processOptions: ProcessOption[];
  depth?: number;
  isLastSibling?: boolean;
  guides?: boolean[];
}) {
  const hasChildren = node.children.length > 0;
  const href = node.process_slug
    ? `/dashboard/process/${node.process_slug}`
    : "#";

  const card = (
    <Card
      className={cn(
        "group/card relative flex-row items-center justify-between px-(--card-spacing) py-3",
        depth > 0 ? "min-w-0 flex-1" : "w-full",
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label={node.process_name}
      />
      <div className="pointer-events-none relative z-10 flex items-center gap-2">
        <CollapsibleTrigger
          disabled={!hasChildren}
          className={cn(
            "rounded p-1",
            hasChildren
              ? "pointer-events-auto duration-100 hover:cursor-pointer hover:bg-muted/80"
              : "text-muted-foreground/40 disabled:pointer-events-none",
          )}
        >
          <ChevronDown
            className={cn(
              "size-5",
              hasChildren &&
                "transition-transform duration-200 group-data-[open]/process:-rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <div>
          <p className="font-medium">{node.process_name}</p>
          <div className="h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover/card:scale-x-100" />
        </div>
      </div>
      <div className="pointer-events-none relative z-10 flex shrink-0 items-center gap-1">
        {node.process_labels.length > 0 ? (
          <div className="mx-3 flex flex-wrap items-center justify-end gap-1">
            {node.process_labels.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground tabular-nums">
          {node.children.length} sub-processes
        </p>
        <div className="pointer-events-auto">
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
    </Card>
  );

  return (
    <Collapsible defaultOpen className="group/process w-full">
      <div className="flex flex-col gap-3">
        {depth > 0 ? (
          <div className="flex min-w-0">
            <TreeBranch
              depth={depth}
              isLastSibling={isLastSibling}
              guides={guides}
            />
            {card}
          </div>
        ) : (
          card
        )}
        <CollapsibleContent>
          {hasChildren ? (
            <div className="flex flex-col gap-3">
              {node.children.map((child, index) => (
                <ProcessTreeItem
                  key={child.id}
                  node={child}
                  processOptions={processOptions}
                  depth={depth + 1}
                  isLastSibling={index === node.children.length - 1}
                  guides={depth === 0 ? [] : [...guides, !isLastSibling]}
                />
              ))}
            </div>
          ) : null}
        </CollapsibleContent>
      </div>
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
    <div className="flex flex-col gap-3">
      {tree.map((node) => (
        <ProcessTreeItem
          key={node.id}
          node={node}
          processOptions={options}
        />
      ))}
    </div>
  );
}
