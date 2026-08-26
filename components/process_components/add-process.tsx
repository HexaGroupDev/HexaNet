"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
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
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  escapeRegExp,
  nextUniqueSlug,
  slugifyProcessName,
} from "@/lib/projects/slug";
import {
  MAX_PROCESS_LABELS,
  type ProcessOption,
} from "@/lib/processes/process";

export type { ProcessOption };

const labels = [
  "Marketing",
  "Design",
  "Development",
  "Sales",
  "Operations",
];

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

function parentName(processes: ProcessOption[], parentId?: number | null) {
  if (parentId == null) return null;
  return (
    processes.find((process) => process.id === parentId)?.process_name ?? null
  );
}

export function AddProcess({
  trigger,
  processes = [],
  parentId = null,
  triggerVariant,
  triggerSize,
  triggerClassName,
  ariaLabel,
}: {
  trigger?: ReactNode;
  processes?: ProcessOption[];
  parentId?: number | null;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultParentName = parentName(processes, parentId);
  const labelAnchor = useComboboxAnchor();

  const [name, setName] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelQuery, setLabelQuery] = useState("");
  const [parent, setParent] = useState<string | null>(defaultParentName);
  const [parentQuery, setParentQuery] = useState(defaultParentName ?? "");

  const atLabelLimit = selectedLabels.length >= MAX_PROCESS_LABELS;

  const existingLabels = useMemo(() => {
    const unique = new Set(labels);
    for (const process of processes) {
      for (const value of process.process_labels) {
        if (value.trim()) unique.add(value.trim());
      }
    }
    return [...unique];
  }, [processes]);

  const parentNames = useMemo(
    () =>
      processes
        .map((process) => process.process_name)
        .filter((value) => value.trim().length > 0),
    [processes],
  );

  const unselectedLabels = useMemo(
    () =>
      existingLabels.filter(
        (label) =>
          !selectedLabels.some(
            (selected) => selected.toLowerCase() === label.toLowerCase(),
          ),
      ),
    [existingLabels, selectedLabels],
  );

  const labelOptions = useMemo(() => {
    if (atLabelLimit) {
      return { items: [] as string[], newValue: null as string | null };
    }
    return buildComboboxItems(unselectedLabels, labelQuery);
  }, [atLabelLimit, unselectedLabels, labelQuery]);

  const parentOptions = useMemo(() => {
    const trimmed = parentQuery.trim();
    if (!trimmed) return parentNames;

    return parentNames.filter((option) =>
      option.toLowerCase().includes(trimmed.toLowerCase()),
    );
  }, [parentNames, parentQuery]);

  function handleLabelInputChange(next: string) {
    setLabelQuery(next);
  }

  function handleLabelsChange(next: string[] | null) {
    const unique: string[] = [];
    for (const label of next ?? []) {
      if (unique.some((item) => item.toLowerCase() === label.toLowerCase())) {
        continue;
      }
      unique.push(label);
    }

    setSelectedLabels(unique.slice(0, MAX_PROCESS_LABELS));
    setLabelQuery("");
  }

  function addFirstVisibleLabel() {
    if (atLabelLimit) return;

    const query = labelQuery.trim().toLowerCase();
    const first = labelOptions.items.find(
      (item) => !query || item.toLowerCase().includes(query),
    );
    if (!first) return;

    handleLabelsChange([...selectedLabels, first]);
  }

  function handleLabelKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    addFirstVisibleLabel();
  }

  function handleParentInputChange(next: string) {
    setParentQuery(next);
    setParent(next.trim() || null);
  }

  function handleParentValueChange(next: string | null) {
    setParent(next);
    setParentQuery(next ?? "");
  }

  function resetForm() {
    const nextParent = parentName(processes, parentId);
    setName("");
    setSelectedLabels([]);
    setLabelQuery("");
    setParent(nextParent);
    setParentQuery(nextParent ?? "");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function createUniqueProcessSlug(
    supabase: ReturnType<typeof createClient>,
    processName: string,
  ) {
    const base = slugifyProcessName(processName);

    const { data, error: slugError } = await supabase
      .from("processes")
      .select("process_slug")
      .like("process_slug", `${base}%`);

    if (slugError) {
      throw new Error(slugError.message);
    }

    const existing = (data ?? [])
      .map((row) => row.process_slug as string | null)
      .filter((slug): slug is string => !!slug)
      .filter(
        (slug) =>
          slug === base || new RegExp(`^${escapeRegExp(base)}-\\d+$`).test(slug),
      );

    return nextUniqueSlug(base, existing);
  }

  function resolveParentId(parentNameValue: string) {
    const match = processes.find(
      (process) =>
        process.process_name.toLowerCase() === parentNameValue.toLowerCase(),
    );
    return match?.id ?? null;
  }

  async function handleAdd() {
    setError(null);

    const processName = name.trim();
    const pendingLabel = labelQuery.trim();
    const processLabels = [
      ...selectedLabels,
      ...(pendingLabel &&
      !selectedLabels.some(
        (label) => label.toLowerCase() === pendingLabel.toLowerCase(),
      )
        ? [pendingLabel]
        : []),
    ].slice(0, MAX_PROCESS_LABELS);
    const parentNameValue = (parent ?? parentQuery).trim();

    if (!processName) {
      setError("Process name is required.");
      return;
    }
    if (processLabels.length === 0) {
      setError("At least one label is required.");
      return;
    }

    const resolvedParentId = parentNameValue
      ? resolveParentId(parentNameValue)
      : null;

    if (parentNameValue && resolvedParentId == null) {
      setError("Select an existing process as the parent.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to create a process.");
      }

      let processSlug = await createUniqueProcessSlug(supabase, processName);
      let created = false;

      for (let attempt = 0; attempt < 20; attempt++) {
        const { error: insertError } = await supabase.from("processes").insert({
          process_name: processName,
          process_labels: processLabels,
          process_slug: processSlug,
          process_description: "",
          process_links: [],
          parent_id: resolvedParentId,
        });

        if (!insertError) {
          created = true;
          break;
        }

        if (insertError.code === "23505") {
          const match = processSlug.match(/-(\d+)$/);
          const nextNum = match ? Number(match[1]) + 1 : 2;
          const base = slugifyProcessName(processName);
          processSlug = `${base}-${nextNum}`;
          continue;
        }

        throw new Error(insertError.message ?? "Failed to create process.");
      }

      if (!created) {
        throw new Error("Could not generate a unique process slug.");
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  const isSubProcess = parentId != null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
            aria-label={ariaLabel}
          />
        }
      >
        {trigger ?? <Plus />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSubProcess ? "Add a Sub-process" : "Add a Process"}
          </DialogTitle>
          <DialogDescription>
            {isSubProcess
              ? "Create a new sub-process nested under the selected process."
              : "Create a new process to organize your team's workflows."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="Creating a website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Labels</FieldLabel>
            <Combobox
              items={labelOptions.items}
              multiple
              autoHighlight
              value={selectedLabels}
              onValueChange={handleLabelsChange}
              inputValue={labelQuery}
              onInputValueChange={handleLabelInputChange}
              disabled={pending}
            >
              <ComboboxChips ref={labelAnchor}>
                {selectedLabels.map((item) => (
                  <ComboboxChip key={item}>{item}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={
                    atLabelLimit ? "Label limit reached" : "e.g. Marketing"
                  }
                  disabled={pending || atLabelLimit}
                  onKeyDown={handleLabelKeyDown}
                />
              </ComboboxChips>
              <ComboboxContent anchor={labelAnchor}>
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
            <FieldLabel>Parent</FieldLabel>
            <Combobox
              items={parentOptions}
              value={parent}
              onValueChange={handleParentValueChange}
              inputValue={parentQuery}
              onInputValueChange={handleParentInputChange}
              disabled={pending}
            >
              <ComboboxInput
                placeholder="None (top-level process)"
                disabled={pending}
                showClear
              />
              <ComboboxContent>
                <ComboboxEmpty>No processes found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
