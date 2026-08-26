"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Trash2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";

export function ClientSettings({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setPending(true);

    const supabase = createClient();

    const { error: projectsError } = await supabase
      .from("projects")
      .delete()
      .eq("client_id", clientId);

    if (projectsError) {
      setError(projectsError.message);
      setPending(false);
      return;
    }

    const { data: deleted, error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .select("id");

    if (deleteError) {
      setError(deleteError.message);
      setPending(false);
      return;
    }

    if (!deleted || deleted.length === 0) {
      setError(
        "The client wasn't deleted. You may not have permission (check the delete RLS policy).",
      );
      setPending(false);
      return;
    }

    setConfirmOpen(false);
    router.replace("/dashboard/clients");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button />}>
          <Settings2 />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => {
          if (!pending) setConfirmOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{clientName}&rdquo; and all of
              its projects. This action cannot be undone.
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
