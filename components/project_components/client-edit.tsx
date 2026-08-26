"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import {
  emptyClientData,
  parseClientData,
  type ClientContact,
  type ClientData,
  type FinancialServiceContact,
} from "@/lib/clients/client-data";

const editButtonClassName =
  "opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 focus-visible:opacity-100";

async function loadClientData(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
): Promise<ClientData> {
  const { data, error } = await supabase
    .from("clients")
    .select("client_data")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseClientData(data?.client_data ?? emptyClientData);
}

async function saveClientData(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  clientData: ClientData,
) {
  const { data, error } = await supabase
    .from("clients")
    .update({ client_data: clientData })
    .eq("id", clientId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Could not save changes. You may not have permission (check the update RLS policy).",
    );
  }
}

export function EditClientInformation({
  clientId,
  clientName,
  address,
  financialService,
}: {
  clientId: string;
  clientName: string;
  address: string;
  financialService: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(clientName);
  const [addressValue, setAddressValue] = useState(address);
  const [financialServiceValue, setFinancialServiceValue] =
    useState(financialService);

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    if (nextOpen) {
      setName(clientName);
      setAddressValue(address);
      setFinancialServiceValue(financialService);
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleSave() {
    const nextName = name.trim();
    if (!nextName) {
      setError("Client name is required.");
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createClient();

    try {
      const currentData = await loadClientData(supabase, clientId);
      const nextData: ClientData = {
        ...currentData,
        address: addressValue.trim(),
        financial_service: financialServiceValue.trim(),
      };

      const { data, error: updateError } = await supabase
        .from("clients")
        .update({
          client_name: nextName,
          client_data: nextData,
        })
        .eq("id", clientId)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!data) {
        throw new Error(
          "Could not save changes. You may not have permission (check the update RLS policy).",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={editButtonClassName}
            aria-label="Edit client information"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit client information</DialogTitle>
          <DialogDescription>
            Update the company identity and financial service.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              placeholder="e.g. HexaGroup"
            />
          </Field>
          <Field>
            <FieldLabel>Address</FieldLabel>
            <Input
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              disabled={pending}
              placeholder="e.g. 15 Rue de la Paix, Paris"
            />
          </Field>
          <Field>
            <FieldLabel>Financial service</FieldLabel>
            <Input
              value={financialServiceValue}
              onChange={(e) => setFinancialServiceValue(e.target.value)}
              disabled={pending}
              placeholder="e.g. BNP Paribas"
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
            onClick={() => void handleSave()}
          >
            {pending ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditClientContact({
  clientId,
  contact,
}: {
  clientId: string;
  contact: ClientContact;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(contact);

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    if (nextOpen) {
      setDraft(contact);
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    const supabase = createClient();

    try {
      const currentData = await loadClientData(supabase, clientId);
      const nextContact: ClientContact = {
        name: draft.name.trim(),
        job: draft.job.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
      };

      await saveClientData(supabase, clientId, {
        ...currentData,
        client_contact: nextContact,
      });

      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={editButtonClassName}
            aria-label="Edit client contact"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit client contact</DialogTitle>
          <DialogDescription>
            Update the primary contact details for this client.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={draft.name}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. Camille Laurent"
            />
          </Field>
          <Field>
            <FieldLabel>Job</FieldLabel>
            <Input
              value={draft.job}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, job: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. Operations Director"
            />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={draft.email}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, email: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. camille@example.com"
            />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input
              type="tel"
              value={draft.phone}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, phone: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. +33 1 84 80 20 10"
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
            onClick={() => void handleSave()}
          >
            {pending ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditFinancialServiceContact({
  clientId,
  contact,
}: {
  clientId: string;
  contact: FinancialServiceContact;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(contact);

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    if (nextOpen) {
      setDraft(contact);
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    const supabase = createClient();

    try {
      const currentData = await loadClientData(supabase, clientId);
      const nextContact: FinancialServiceContact = {
        title: draft.title.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
      };

      await saveClientData(supabase, clientId, {
        ...currentData,
        financial_service_contact: nextContact,
      });

      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={editButtonClassName}
            aria-label="Edit financial service contact"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit financial service contact</DialogTitle>
          <DialogDescription>
            Update the financial service contact details.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. Corporate Account Manager"
            />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={draft.email}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, email: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. manager@example.com"
            />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input
              type="tel"
              value={draft.phone}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, phone: e.target.value }))
              }
              disabled={pending}
              placeholder="e.g. +33 1 42 98 12 40"
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
            onClick={() => void handleSave()}
          >
            {pending ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
