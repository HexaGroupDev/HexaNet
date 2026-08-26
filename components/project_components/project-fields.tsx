"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Match global h1 (text-5xl = 3rem) with a fixed line box so edit/view don’t shift layout. */
const titleClassName =
  "block h-12 max-w-full -translate-x-[3px] truncate text-5xl font-normal leading-none tracking-tight";

const descriptionClassName =
  "w-full resize-none appearance-none border-0 bg-transparent p-0 text-sm leading-normal text-muted-foreground shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0";

export function ProjectTitle({
  projectId,
  initialName,
}: {
  projectId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurSkipRef = useRef(false);
  const [prevInitialName, setPrevInitialName] = useState(initialName);

  if (initialName !== prevInitialName && !editing) {
    setPrevInitialName(initialName);
    setName(initialName);
    setDraft(initialName);
  }

  useEffect(() => {
    if (!editing) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(name);
    setError(null);
  }, [name]);

  const save = useCallback(async () => {
    const next = draft.trim();
    if (!next) {
      setError("Project name is required.");
      blurSkipRef.current = false;
      return;
    }
    if (next === name) {
      setEditing(false);
      setError(null);
      blurSkipRef.current = false;
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("projects")
      .update({ project_name: next })
      .eq("project_id", projectId)
      .select("project_name")
      .maybeSingle();

    setPending(false);
    blurSkipRef.current = false;

    if (updateError || !data) {
      setError(
        updateError?.message ??
          "Could not update the name. You may not have permission.",
      );
      return;
    }

    setName(data.project_name);
    setDraft(data.project_name);
    setEditing(false);
    router.refresh();
  }, [draft, name, projectId, router]);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="relative flex h-12 w-fit max-w-full items-center">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            disabled={pending}
            aria-label="Project name"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (blurSkipRef.current) return;
              cancelEdit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                blurSkipRef.current = true;
                void save();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                blurSkipRef.current = true;
                cancelEdit();
                requestAnimationFrame(() => {
                  blurSkipRef.current = false;
                });
              }
            }}
            className={`${titleClassName} w-fit min-w-[8rem] cursor-text appearance-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 disabled:opacity-50`}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setError(null);
              setEditing(true);
            }}
            className="group flex h-12 w-fit max-w-full cursor-pointer items-center text-left"
          >
            <span className={titleClassName}>{name}</span>
            <Pencil
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-[calc(100%+0.25rem)] size-[1.15rem] -translate-y-1/2 opacity-0 duration-150 group-hover:opacity-100"
            />
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function ProjectDescription({
  projectId,
  initialDescription,
}: {
  projectId: string;
  initialDescription: string | null;
}) {
  const router = useRouter();
  const saved = initialDescription?.trim() ?? "";
  const [description, setDescription] = useState(saved);
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurSkipRef = useRef(false);
  const [prevInitialDescription, setPrevInitialDescription] = useState(
    initialDescription,
  );

  if (initialDescription !== prevInitialDescription && !editing) {
    const next = initialDescription?.trim() ?? "";
    setPrevInitialDescription(initialDescription);
    setDescription(next);
    setDraft(next);
  }

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (!editing) return;
    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      // Place caret at end instead of select-all for longer text
      const el = textareaRef.current;
      if (el) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
      syncTextareaHeight();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing, syncTextareaHeight]);

  useEffect(() => {
    if (editing) syncTextareaHeight();
  }, [draft, editing, syncTextareaHeight]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(description);
    setError(null);
  }, [description]);

  const save = useCallback(async () => {
    const next = draft.trim();
    if (next === description) {
      setEditing(false);
      setError(null);
      blurSkipRef.current = false;
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("projects")
      .update({ project_description: next })
      .eq("project_id", projectId)
      .select("project_description")
      .maybeSingle();

    setPending(false);
    blurSkipRef.current = false;

    if (updateError || !data) {
      setError(
        updateError?.message ??
          "Could not update the description. You may not have permission.",
      );
      return;
    }

    const savedNext =
      typeof data.project_description === "string"
        ? data.project_description.trim()
        : "";
    setDescription(savedNext);
    setDraft(savedNext);
    setEditing(false);
    router.refresh();
  }, [description, draft, projectId, router]);

  const display = description || "No description yet.";

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          disabled={pending}
          aria-label="Project description"
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (blurSkipRef.current) return;
            cancelEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              blurSkipRef.current = true;
              void save();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              blurSkipRef.current = true;
              cancelEdit();
              requestAnimationFrame(() => {
                blurSkipRef.current = false;
              });
            }
          }}
          className={`${descriptionClassName} cursor-text disabled:opacity-50`}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(description);
            setError(null);
            setEditing(true);
          }}
          className="w-full cursor-pointer text-left"
        >
          <span
            className={`${descriptionClassName} block whitespace-pre-wrap ${description ? "" : "opacity-70"}`}
          >
            {display}
          </span>
        </button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
