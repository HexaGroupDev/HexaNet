"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { emptyClientData } from "@/lib/clients/client-data";
import {
  escapeRegExp,
  nextUniqueSlug,
  slugifyClientName,
} from "@/lib/projects/slug";

export function AddClient({ trigger }: { trigger?: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function resetForm() {
    setName("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function createUniqueClientSlug(
    supabase: ReturnType<typeof createClient>,
    clientName: string,
  ) {
    const base = slugifyClientName(clientName);

    const { data, error: slugError } = await supabase
      .from("clients")
      .select("client_slug")
      .like("client_slug", `${base}%`);

    if (slugError) {
      throw new Error(slugError.message);
    }

    const existing = (data ?? [])
      .map((row) => row.client_slug as string | null)
      .filter((slug): slug is string => !!slug)
      .filter(
        (slug) =>
          slug === base || new RegExp(`^${escapeRegExp(base)}-\\d+$`).test(slug),
      );

    return nextUniqueSlug(base, existing);
  }

  async function handleAdd() {
    setError(null);

    const clientName = name.trim();
    if (!clientName) {
      setError("Client name is required.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to create a client.");
      }

      let clientSlug = await createUniqueClientSlug(supabase, clientName);
      let createdSlug: string | null = null;

      for (let attempt = 0; attempt < 20; attempt++) {
        const { data, error: insertError } = await supabase
          .from("clients")
          .insert({
            client_name: clientName,
            client_slug: clientSlug,
            client_data: emptyClientData,
            owner_id: session.user.id,
          })
          .select("client_slug")
          .single();

        if (!insertError && data) {
          createdSlug = data.client_slug;
          break;
        }

        if (insertError?.code === "23505") {
          const match = clientSlug.match(/-(\d+)$/);
          const nextNum = match ? Number(match[1]) + 1 : 2;
          const base = slugifyClientName(clientName);
          clientSlug = `${base}-${nextNum}`;
          continue;
        }

        throw new Error(insertError?.message ?? "Failed to create client.");
      }

      if (!createdSlug) {
        throw new Error("Could not generate a unique client slug.");
      }

      setOpen(false);
      resetForm();
      router.push(`/dashboard/clients/${createdSlug}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        {trigger ?? <Plus />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Client</DialogTitle>
          <DialogDescription>
            Create a new client to organize projects and contacts.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="e.g. HexaGroup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose disabled={pending} render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void handleAdd()}
          >
            {pending ? <Spinner /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
