"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const descriptionClassName =
  "w-full resize-none appearance-none border-0 bg-transparent p-0 text-sm leading-normal text-muted-foreground shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0";

export function ProcessDescription({
  processId,
  initialDescription,
}: {
  processId: number;
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
      .from("processes")
      .update({ process_description: next })
      .eq("id", processId)
      .select("process_description")
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
      typeof data.process_description === "string"
        ? data.process_description.trim()
        : "";
    setDescription(savedNext);
    setDraft(savedNext);
    setEditing(false);
    router.refresh();
  }, [description, draft, processId, router]);

  const display = description || "No description yet.";

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          disabled={pending}
          aria-label="Process description"
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
          className="group relative w-full cursor-pointer pr-7 text-left"
        >
          <span
            className={`${descriptionClassName} block whitespace-pre-wrap ${description ? "" : "opacity-70"}`}
          >
            {display}
          </span>
          <Pencil
            aria-hidden
            className="pointer-events-none absolute top-0.5 right-0 size-4 text-muted-foreground opacity-0 duration-150 group-hover:opacity-100"
          />
        </button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
