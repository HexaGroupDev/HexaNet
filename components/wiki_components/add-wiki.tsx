"use client";

import {
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_WIKI_LABELS,
  type WikiEntry,
} from "@/lib/wiki/wiki";

const defaultLabels = [
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

export function AddWiki({
  trigger,
  entries = [],
  entry = null,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  entries?: WikiEntry[];
  entry?: WikiEntry | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelAnchor = useComboboxAnchor();
  const isEdit = entry != null;

  const [question, setQuestion] = useState(entry?.wiki_question ?? "");
  const [answer, setAnswer] = useState(entry?.wiki_answer ?? "");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    entry?.wiki_labels ?? [],
  );
  const [labelQuery, setLabelQuery] = useState("");

  const atLabelLimit = selectedLabels.length >= MAX_WIKI_LABELS;

  const existingLabels = useMemo(() => {
    const unique = new Set(defaultLabels);
    for (const entry of entries) {
      for (const value of entry.wiki_labels) {
        if (value.trim()) unique.add(value.trim());
      }
    }
    return [...unique];
  }, [entries]);

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

    setSelectedLabels(unique.slice(0, MAX_WIKI_LABELS));
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

  function resetForm() {
    setQuestion(entry?.wiki_question ?? "");
    setAnswer(entry?.wiki_answer ?? "");
    setSelectedLabels(entry?.wiki_labels ?? []);
    setLabelQuery("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    if (nextOpen) resetForm();
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleAdd() {
    setError(null);

    const wikiQuestion = question.trim();
    const wikiAnswer = answer.trim();
    const pendingLabel = labelQuery.trim();
    const wikiLabels = [
      ...selectedLabels,
      ...(pendingLabel &&
      !selectedLabels.some(
        (label) => label.toLowerCase() === pendingLabel.toLowerCase(),
      )
        ? [pendingLabel]
        : []),
    ].slice(0, MAX_WIKI_LABELS);

    if (!wikiQuestion) {
      setError("A question is required.");
      return;
    }
    if (!wikiAnswer) {
      setError("An answer is required.");
      return;
    }
    if (wikiLabels.length === 0) {
      setError("At least one label is required.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error(
          isEdit
            ? "You must be signed in to update a wiki entry."
            : "You must be signed in to create a wiki entry.",
        );
      }

      if (entry) {
        const { data, error: updateError } = await supabase
          .from("wiki")
          .update({
            wiki_question: wikiQuestion,
            wiki_answer: wikiAnswer,
            wiki_labels: wikiLabels,
          })
          .eq("id", entry.id)
          .select("id")
          .maybeSingle();

        if (updateError || !data) {
          throw new Error(
            updateError?.message ??
              "Could not update the wiki entry. You may not have permission.",
          );
        }
      } else {
        const { error: insertError } = await supabase.from("wiki").insert({
          wiki_question: wikiQuestion,
          wiki_answer: wikiAnswer,
          wiki_labels: wikiLabels,
        });

        if (insertError) {
          throw new Error(insertError.message ?? "Failed to create wiki entry.");
        }
      }

      handleOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEdit ? null : (
        <DialogTrigger render={<Button aria-label="Add wiki entry" />}>
          {trigger ?? <Plus />}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Wiki Entry" : "Add a Wiki Entry"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this question, answer, or labels."
              : "Capture a question and answer so the team can find it later."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Question</FieldLabel>
            <Input
              placeholder="How do we request time off?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Answer</FieldLabel>
            <Textarea
              placeholder="Submit a request in HexaNet and loop in your manager."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
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
                    atLabelLimit ? "Label limit reached" : "e.g. Operations"
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
            {pending ? <Spinner /> : isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
