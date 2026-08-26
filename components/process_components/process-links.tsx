"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleX, ImageIcon, Link2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  AddProjectLink,
  ProjectLinkDialog,
} from "@/components/project_components/add-project-link";
import type { ProcessLink } from "@/lib/processes/process";

function toHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(toHref(url));
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}

function LinkFavicon({ url, title }: { url: string; title: string }) {
  const src = faviconUrl(url);
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return <ImageIcon className="size-4 text-muted-foreground" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={title}
      width={20}
      height={20}
      className="size-5"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function ProcessLinks({
  processId,
  initialLinks,
}: {
  processId: number;
  initialLinks: ProcessLink[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const linksRef = useRef(initialLinks);
  const [prevInitialLinks, setPrevInitialLinks] = useState(initialLinks);

  if (initialLinks !== prevInitialLinks) {
    setPrevInitialLinks(initialLinks);
    setLinks(initialLinks);
  }

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  async function persistLinks(next: ProcessLink[], previous: ProcessLink[]) {
    linksRef.current = next;
    setLinks(next);
    setSyncError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("processes")
      .update({ process_links: next })
      .eq("id", processId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      linksRef.current = previous;
      setLinks(previous);
      setSyncError(
        error?.message ??
          "Could not save links. You may not have permission to update this process.",
      );
    }
  }

  async function handleAdd(link: ProcessLink) {
    const previous = linksRef.current;
    await persistLinks([...previous, link], previous);
  }

  async function handleEdit(link: ProcessLink) {
    if (editingIndex === null) return;
    const previous = linksRef.current;
    const next = previous.map((item, index) =>
      index === editingIndex ? link : item,
    );
    setEditingIndex(null);
    await persistLinks(next, previous);
  }

  async function handleDelete(index: number) {
    const previous = linksRef.current;
    const next = previous.filter((_, i) => i !== index);
    await persistLinks(next, previous);
  }

  const editingLink =
    editingIndex !== null ? (links[editingIndex] ?? null) : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">Links</p>
        <Separator className="flex-1" />
        <AddProjectLink onAdd={handleAdd} />
      </div>
      {syncError ? (
        <p className="text-sm text-destructive">{syncError}</p>
      ) : null}
      {links.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Link2 />
            </EmptyMedia>
            <EmptyTitle>No links yet</EmptyTitle>
            <EmptyDescription>
              Add a link to keep related resources with this process.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddProjectLink onAdd={handleAdd} trigger="Add Link" />
          </EmptyContent>
        </Empty>
      ) : (
        links.map((item, index) => (
          <div
            key={`${item.link}-${index}`}
            className="group flex items-center justify-between rounded-xl px-2 py-2 duration-100 hover:bg-muted/50"
          >
            <Link
              href={toHref(item.link)}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-3 hover:cursor-pointer"
            >
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                <LinkFavicon url={item.link} title={item.title} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.link}</p>
              </div>
            </Link>
            <div className="invisible shrink-0 duration-100 group-hover:visible">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${item.title}`}
                onClick={() => setEditingIndex(index)}
              >
                <PenLine />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${item.title}`}
                onClick={() => void handleDelete(index)}
              >
                <CircleX />
              </Button>
            </div>
          </div>
        ))
      )}
      <ProjectLinkDialog
        open={editingIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEditingIndex(null);
        }}
        initialLink={editingLink}
        dialogTitle="Edit Link"
        submitLabel="Save"
        onSubmit={handleEdit}
      />
    </div>
  );
}
