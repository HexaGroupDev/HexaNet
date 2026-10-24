"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AddProcess } from "@/components/process_components/add-process";
import type { ProcessOption } from "@/lib/processes/process";
import { cn } from "@/lib/utils";
import { Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ProcessNode = ProcessOption & { children: ProcessNode[] };

function processHref(node: ProcessOption) {
  return node.process_slug ? `/dashboard/process/${node.process_slug}` : "#";
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

function scrollMask(start: boolean, end: boolean) {
  if (start && end) {
    return "linear-gradient(to right, transparent, #000 1.25rem, #000 calc(100% - 1.25rem), transparent)";
  }
  if (end) {
    return "linear-gradient(to right, #000 calc(100% - 1.25rem), transparent)";
  }
  if (start) {
    return "linear-gradient(to right, transparent, #000 1.25rem)";
  }
  return undefined;
}

function ProcessLabels({
  labels,
  compact = false,
  href,
}: {
  labels: string[];
  compact?: boolean;
  href?: string;
}) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ x: 0, left: 0, moved: false });
  const [edges, setEdges] = useState({ start: false, end: false });

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      const overflow = el.scrollWidth - el.clientWidth > 1;
      const start = overflow && el.scrollLeft > 1;
      const end =
        overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [labels]);

  if (labels.length === 0) return null;

  const mask = scrollMask(edges.start, edges.end);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = { x: event.clientX, left: el.scrollLeft, moved: false };
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el || !el.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - dragRef.current.x;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.left - dx;
  }

  function onClick() {
    if (dragRef.current.moved || !href || href === "#") return;
    router.push(href);
  }

  return (
    <div className="pointer-events-none relative z-10 min-w-0 flex-1">
      <div
        ref={scrollerRef}
        style={
          mask
            ? { maskImage: mask, WebkitMaskImage: mask }
            : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onClick={onClick}
        className="pointer-events-auto relative flex w-max max-w-full cursor-pointer touch-pan-x gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {labels.map((label) => (
          <span
            key={label}
            className={cn(
              "inline-flex shrink-0 items-center rounded-md bg-primary/15 font-medium whitespace-nowrap text-primary",
              compact
                ? "px-1.5 py-px text-[10px] leading-4"
                : "px-1.5 py-0.5 text-[11px] leading-4",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProcessTitleRow({
  title,
  labels,
  titleClassName,
  compact = false,
  href,
  headingId,
}: {
  title: string;
  labels: string[];
  titleClassName?: string;
  compact?: boolean;
  href?: string;
  headingId?: string;
}) {
  const className = cn(
    "truncate",
    labels.length > 0 ? "max-w-[60%] shrink-0" : "min-w-0",
    titleClassName,
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <p id={headingId} title={title} className={className}>
        {title}
      </p>
      <ProcessLabels labels={labels} compact={compact} href={href} />
    </div>
  );
}

function AddSubprocessButton({
  parentId,
  processes,
  name,
  prominent = false,
}: {
  parentId: number;
  processes: ProcessOption[];
  name: string;
  prominent?: boolean;
}) {
  if (prominent) {
    return (
      <AddProcess
        trigger={
          <>
            <Plus />
            Add sub-process
          </>
        }
        parentId={parentId}
        processes={processes}
        triggerVariant="ghost"
        triggerSize="sm"
        triggerClassName="w-full justify-start px-2 text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-white/8"
        ariaLabel={`Add a sub-process to ${name}`}
      />
    );
  }

  return (
    <AddProcess
      trigger={<Plus />}
      parentId={parentId}
      processes={processes}
      triggerVariant="ghost"
      triggerSize="icon-xs"
      triggerClassName="text-muted-foreground/80 hover:bg-foreground/8 hover:text-foreground"
      ariaLabel={`Add a sub-process to ${name}`}
    />
  );
}

const NEST_INDENT = ["", "ml-3", "ml-6", "ml-9", "ml-12"] as const;

function NestedProcess({
  node,
  processOptions,
  depth = 0,
}: {
  node: ProcessNode;
  processOptions: ProcessOption[];
  depth?: number;
}) {
  return (
    <div>
      <div className="group/nested relative flex items-center gap-0.5 rounded-md hover:bg-foreground/5">
        <Link
          href={processHref(node)}
          className="absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={node.process_name}
        />
        <div
          className={cn(
            "pointer-events-none relative z-10 min-w-0 flex-1 py-1.5 pr-1",
            depth > 0 && "border-l border-foreground/10 pl-2",
            NEST_INDENT[Math.min(depth, NEST_INDENT.length - 1)],
          )}
        >
          <div className="min-w-0 px-1.5">
            <ProcessTitleRow
              title={node.process_name}
              labels={node.process_labels}
              compact
              href={processHref(node)}
              titleClassName="text-xs leading-snug font-medium group-hover/nested:underline"
            />
          </div>
        </div>
        <div className="relative z-20 shrink-0">
          <AddSubprocessButton
            parentId={node.id}
            processes={processOptions}
            name={node.process_name}
          />
        </div>
      </div>
      {node.children.length > 0
        ? node.children.map((child) => (
            <NestedProcess
              key={child.id}
              node={child}
              processOptions={processOptions}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  );
}

function ProcessCard({
  node,
  processOptions,
}: {
  node: ProcessNode;
  processOptions: ProcessOption[];
}) {
  return (
    <article className="rounded-lg bg-background shadow-sm ring-1 ring-foreground/10 transition-[box-shadow,ring-color] hover:shadow-md hover:ring-primary/35 dark:bg-muted dark:shadow-none dark:ring-white/8">
      <div className="group/card relative flex items-center gap-1 px-2.5 py-2.5">
        <Link
          href={processHref(node)}
          className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={node.process_name}
        />
        <div className="pointer-events-none relative z-10 min-w-0 flex-1">
          <ProcessTitleRow
            title={node.process_name}
            labels={node.process_labels}
            href={processHref(node)}
            titleClassName="text-sm leading-snug font-medium group-hover/card:underline"
          />
        </div>
        <div className="relative z-20 shrink-0">
          <AddSubprocessButton
            parentId={node.id}
            processes={processOptions}
            name={node.process_name}
          />
        </div>
      </div>
      {node.children.length > 0 ? (
        <div className="mx-2.5 mb-1.5 rounded-md bg-black/5 py-0.5 dark:bg-black/25">
          {node.children.map((child) => (
            <NestedProcess
              key={child.id}
              node={child}
              processOptions={processOptions}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ProcessColumn({
  node,
  processOptions,
  idPrefix,
}: {
  node: ProcessNode;
  processOptions: ProcessOption[];
  idPrefix: string;
}) {
  const headingId = `process-list-${idPrefix}-${node.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col rounded-xl bg-muted p-2 ring-1 ring-foreground/10 dark:bg-card dark:ring-white/10"
    >
      <header className="group/column relative flex items-center gap-2 px-1.5 pt-1 pb-2">
        <Link
          href={processHref(node)}
          className="absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={node.process_name}
        />
        <div className="pointer-events-none relative z-10 min-w-0 flex-1">
          <ProcessTitleRow
            title={node.process_name}
            labels={node.process_labels}
            href={processHref(node)}
            headingId={headingId}
            titleClassName="rounded-sm text-sm leading-snug font-semibold tracking-tight group-hover/column:text-primary group-hover/column:underline"
          />
        </div>
        {node.children.length > 0 ? (
          <span className="pointer-events-none relative z-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/80 px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums dark:bg-black/30">
            {node.children.length}
          </span>
        ) : null}
      </header>
      {node.children.length > 0 ? (
        <div className="flex flex-col gap-2">
          {node.children.map((child) => (
            <ProcessCard
              key={child.id}
              node={child}
              processOptions={processOptions}
            />
          ))}
        </div>
      ) : null}
      <footer className={cn("px-0.5", node.children.length > 0 && "pt-2")}>
        <AddSubprocessButton
          parentId={node.id}
          processes={processOptions}
          name={node.process_name}
          prominent
        />
      </footer>
    </section>
  );
}

function splitColumns(nodes: ProcessNode[], count: number) {
  const columns: ProcessNode[][] = Array.from({ length: count }, () => []);
  nodes.forEach((node, index) => {
    columns[index % count].push(node);
  });
  return columns;
}

function ProcessBoard({
  nodes,
  columnCount,
  className,
  options,
  idPrefix,
}: {
  nodes: ProcessNode[];
  columnCount: number;
  className: string;
  options: ProcessOption[];
  idPrefix: string;
}) {
  const columns = splitColumns(nodes, columnCount);

  return (
    <div className={className}>
      {columns.map((column, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-3">
          {column.map((node) => (
            <ProcessColumn
              key={node.id}
              node={node}
              processOptions={options}
              idPrefix={idPrefix}
            />
          ))}
        </div>
      ))}
    </div>
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
    <div className="w-full min-w-0">
      <ProcessBoard
        nodes={tree}
        columnCount={1}
        options={options}
        idPrefix="1"
        className="grid grid-cols-1 items-start gap-3 md:hidden"
      />
      <ProcessBoard
        nodes={tree}
        columnCount={2}
        options={options}
        idPrefix="2"
        className="hidden items-start gap-3 md:grid md:grid-cols-2 xl:hidden"
      />
      <ProcessBoard
        nodes={tree}
        columnCount={3}
        options={options}
        idPrefix="3"
        className="hidden items-start gap-3 xl:grid xl:grid-cols-3"
      />
    </div>
  );
}
