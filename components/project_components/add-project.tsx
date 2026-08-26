"use client";

import { useMemo, useState, type ReactNode } from "react";
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { emptyClientData } from "@/lib/clients/client-data";
import {
  escapeRegExp,
  nextProjectSlug,
  nextUniqueSlug,
  slugifyClientName,
  slugifyProjectName,
} from "@/lib/projects/slug";

const labels = [
  "Marketing",
  "Design",
  "Development",
  "Sales",
  "Operations",
];

export type ClientOption = {
  id: string;
  client_name: string;
};

type ClientRow = ClientOption;

function buildComboboxItems(options: string[], query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { items: options, newValue: null as string | null };
  }

  const exactExists = options.some(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );

  if (exactExists) {
    return { items: options, newValue: null as string | null };
  }

  return { items: [...options, trimmed], newValue: trimmed };
}

export function AddProject({
  trigger,
  clients = [],
}: {
  trigger?: ReactNode;
  clients?: ClientOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClients, setCreatedClients] = useState<ClientRow[]>([]);

  const [name, setName] = useState("");
  const [label, setLabel] = useState<string | null>(null);
  const [labelQuery, setLabelQuery] = useState("");
  const [client, setClient] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [description, setDescription] = useState("");

  const clientRows = useMemo(() => {
    const byId = new Map<string, ClientRow>();
    for (const row of clients) byId.set(row.id, row);
    for (const row of createdClients) byId.set(row.id, row);
    return [...byId.values()];
  }, [clients, createdClients]);

  const labelOptions = useMemo(
    () => buildComboboxItems(labels, labelQuery),
    [labelQuery],
  );

  const clientOptions = useMemo(
    () =>
      buildComboboxItems(
        clientRows.map((row) => row.client_name),
        clientQuery,
      ),
    [clientRows, clientQuery],
  );

  function handleLabelInputChange(next: string) {
    setLabelQuery(next);
    setLabel(next.trim() || null);
  }

  function handleClientInputChange(next: string) {
    setClientQuery(next);
    setClient(next.trim() || null);
  }

  function handleLabelValueChange(next: string | null) {
    setLabel(next);
    if (next) setLabelQuery(next);
  }

  function handleClientValueChange(next: string | null) {
    setClient(next);
    if (next) setClientQuery(next);
  }

  function resetForm() {
    setName("");
    setLabel(null);
    setLabelQuery("");
    setClient(null);
    setClientQuery("");
    setDescription("");
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

  async function resolveClientId(
    supabase: ReturnType<typeof createClient>,
    clientName: string,
    ownerId: string,
  ) {
    const existing = clientRows.find(
      (row) => row.client_name.toLowerCase() === clientName.toLowerCase(),
    );

    if (existing) return existing.id;

    const { data: matched, error: matchError } = await supabase
      .from("clients")
      .select("id")
      .ilike("client_name", clientName)
      .limit(1)
      .maybeSingle();

    if (matchError) {
      throw new Error(matchError.message);
    }

    if (matched) return matched.id as string;

    let clientSlug = await createUniqueClientSlug(supabase, clientName);

    for (let attempt = 0; attempt < 20; attempt++) {
      const { data, error: insertError } = await supabase
        .from("clients")
        .insert({
          client_name: clientName,
          client_slug: clientSlug,
          client_data: emptyClientData,
          owner_id: ownerId,
        })
        .select("id")
        .single();

      if (!insertError && data) {
        const created = { id: data.id as string, client_name: clientName };
        setCreatedClients((prev) => [...prev, created]);
        return created.id;
      }

      // Unique violation on client_slug — bump and retry
      if (insertError?.code === "23505") {
        const match = clientSlug.match(/-(\d+)$/);
        const nextNum = match ? Number(match[1]) + 1 : 2;
        const base = slugifyClientName(clientName);
        clientSlug = `${base}-${nextNum}`;
        continue;
      }

      throw new Error(insertError?.message ?? "Failed to create client.");
    }

    throw new Error("Could not generate a unique client slug.");
  }

  async function createUniqueProjectSlug(
    supabase: ReturnType<typeof createClient>,
    projectName: string,
  ) {
    const base = slugifyProjectName(projectName);

    const { data, error: slugError } = await supabase
      .from("projects")
      .select("project_slug")
      .like("project_slug", `${base}%`);

    if (slugError) {
      throw new Error(slugError.message);
    }

    const existing = (data ?? [])
      .map((row) => row.project_slug as string)
      .filter(
        (slug) =>
          slug === base || new RegExp(`^${escapeRegExp(base)}-\\d+$`).test(slug),
      );

    return nextProjectSlug(base, existing);
  }

  async function handleAdd() {
    setError(null);

    const projectName = name.trim();
    const projectLabel = (label ?? labelQuery).trim();
    const clientName = (client ?? clientQuery).trim();
    const projectDescription = description.trim();

    if (!projectName) {
      setError("Project name is required.");
      return;
    }
    if (!projectLabel) {
      setError("Project label is required.");
      return;
    }
    if (!clientName) {
      setError("Client is required.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to create a project.");
      }

      const clientId = await resolveClientId(
        supabase,
        clientName,
        session.user.id,
      );
      let projectSlug = await createUniqueProjectSlug(supabase, projectName);
      let createdSlug: string | null = null;

      for (let attempt = 0; attempt < 20; attempt++) {
        const { data, error: insertError } = await supabase
          .from("projects")
          .insert({
            project_name: projectName,
            project_label: projectLabel,
            project_description: projectDescription,
            project_slug: projectSlug,
            project_links: [],
            client_id: clientId,
            owner_id: session.user.id,
          })
          .select("project_slug")
          .single();

        if (!insertError && data) {
          createdSlug = data.project_slug;
          break;
        }

        // Unique violation on project_slug — bump and retry
        if (insertError?.code === "23505") {
          const match = projectSlug.match(/-(\d+)$/);
          const nextNum = match ? Number(match[1]) + 1 : 2;
          const base = slugifyProjectName(projectName);
          projectSlug = `${base}-${nextNum}`;
          continue;
        }

        throw new Error(insertError?.message ?? "Failed to create project.");
      }

      if (!createdSlug) {
        throw new Error("Could not generate a unique project slug.");
      }

      setOpen(false);
      resetForm();
      router.push(`/dashboard/projects/${createdSlug}`);
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
          <DialogTitle>Add a Project</DialogTitle>
          <DialogDescription>
            Create a new project to collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="Amazing Project One"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Label</FieldLabel>
            <Combobox
              items={labelOptions.items}
              value={label}
              onValueChange={handleLabelValueChange}
              inputValue={labelQuery}
              onInputValueChange={handleLabelInputChange}
              disabled={pending}
            >
              <ComboboxInput placeholder="e.g. Marketing" disabled={pending} />
              <ComboboxContent>
                <ComboboxEmpty>No labels found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {labelOptions.newValue === item
                        ? `New label: “${item}”`
                        : item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Field>
            <FieldLabel>Client</FieldLabel>
            <Combobox
              items={clientOptions.items}
              value={client}
              onValueChange={handleClientValueChange}
              inputValue={clientQuery}
              onInputValueChange={handleClientInputChange}
              disabled={pending}
            >
              <ComboboxInput placeholder="e.g. HexaGroup" disabled={pending} />
              <ComboboxContent>
                <ComboboxEmpty>No clients found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {clientOptions.newValue === item
                        ? `New client: “${item}”`
                        : item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              placeholder="enter the project's description here."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
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
