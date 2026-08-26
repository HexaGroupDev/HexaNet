"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddWiki } from "@/components/wiki_components/add-wiki";
import { createClient } from "@/lib/supabase/client";
import type { WikiEntry } from "@/lib/wiki/wiki";

export function WikiSettings({
  entry,
  entries,
}: {
  entry: WikiEntry;
  entries: WikiEntry[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data: deleted, error: deleteError } = await supabase
      .from("wiki")
      .delete()
      .eq("id", entry.id)
      .select("id");

    if (deleteError) {
      setError(deleteError.message);
      setPending(false);
      return;
    }

    if (!deleted || deleted.length === 0) {
      setError(
        "The wiki entry wasn't deleted. You may not have permission (check the delete RLS policy).",
      );
      setPending(false);
      return;
    }

    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label={`Settings for ${entry.wiki_question}`}
        >
          <Settings2 />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PenLine />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddWiki
        entry={entry}
        entries={entries}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => {
          if (!pending) setConfirmOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete wiki entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{entry.wiki_question}&rdquo;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              type="button"
              disabled={pending}
              onClick={() => void handleDelete()}
            >
              {pending ? <Spinner /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
