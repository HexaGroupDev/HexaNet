"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ellipsis, ImageIcon, PenLine, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

const STORAGE_KEY = "hexanet.quick-links";

type QuickLink = {
  id: string;
  title: string;
  url: string;
};

function stripProtocol(value: string) {
  return value.trim().replace(/^https?:\/\//i, "");
}

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

function isQuickLink(value: unknown): value is QuickLink {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.url === "string"
  );
}

function readStoredLinks(): QuickLink[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQuickLink);
  } catch {
    return [];
  }
}

function LinkFavicon({ url, title }: { url: string; title: string }) {
  const src = faviconUrl(url);
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return <ImageIcon className="size-6 text-muted-foreground" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={title}
      width={32}
      height={32}
      className="size-8"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function QuickLinkItem({
  link,
  onEdit,
  onDelete,
}: {
  link: QuickLink;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative size-10 shrink-0 rounded-md transition-all duration-200 hover:bg-primary/10 hover:text-primary has-[[aria-expanded=true]]:bg-primary/10">
      <a
        href={toHref(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.title}
        title={link.title}
        className="flex size-10 items-center justify-center rounded-md"
      >
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-muted">
          <LinkFavicon url={link.url} title={link.title} />
        </div>
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Actions for ${link.title}`}
              className="absolute top-0 right-0 z-10 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 pointer-events-none transition-opacity hover:cursor-pointer hover:bg-background hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover:pointer-events-auto group-hover:opacity-100 aria-expanded:pointer-events-auto aria-expanded:opacity-100"
            >
              <Ellipsis className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuItem onClick={onEdit}>
            <PenLine />
            Edit link
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Delete link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function QuickLinks() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    setLinks(readStoredLinks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }, [hydrated, links]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateOverflow();

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    el.addEventListener("scroll", updateOverflow, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateOverflow);
    };
  }, [links, updateOverflow]);

  function resetForm() {
    setTitle("");
    setUrl("");
    setError(null);
    setEditingId(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  function handleEdit(link: QuickLink) {
    setEditingId(link.id);
    setTitle(link.title);
    setUrl(link.url);
    setError(null);
    setOpen(true);
  }

  function handleDelete(id: string) {
    setLinks((prev) => prev.filter((link) => link.id !== id));
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedUrl = stripProtocol(url);

    if (!trimmedTitle) {
      setError("Enter a title for the link.");
      return;
    }
    if (!trimmedUrl) {
      setError("Enter a website URL.");
      return;
    }

    setLinks((prev) => {
      if (editingId) {
        return prev.map((link) =>
          link.id === editingId
            ? { ...link, title: trimmedTitle, url: trimmedUrl }
            : link,
        );
      }
      return [
        ...prev,
        { id: crypto.randomUUID(), title: trimmedTitle, url: trimmedUrl },
      ];
    });
    handleOpenChange(false);
  }

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollRef}
        className="no-scrollbar overflow-x-auto"
      >
        <div className="flex w-max flex-nowrap items-center gap-1">
        {links.map((link) => (
          <QuickLinkItem
            key={link.id}
            link={link}
            onEdit={() => handleEdit(link)}
            onDelete={() => handleDelete(link.id)}
          />
        ))}
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger
            render={
              <button
                type="button"
                className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed opacity-50 transition-all duration-200 hover:cursor-pointer hover:border-primary hover:bg-primary/10 hover:text-primary hover:opacity-100"
              />
            }
          >
            <Plus className="size-5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {editingId ? "Edit quick link" : "Add a quick link"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {editingId
                  ? "Update this shortcut on your dashboard."
                  : "Save a shortcut that will appear on your dashboard."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="quick-link-title">Title</FieldLabel>
                <Input
                  id="quick-link-title"
                  placeholder="Intranet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="quick-link-url">Website URL</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>https://</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="quick-link-url"
                    placeholder="example.com"
                    value={url}
                    onChange={(e) => setUrl(stripProtocol(e.target.value))}
                  />
                </InputGroup>
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="button" onClick={handleSave}>
                {editingId ? "Save" : "Add"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
