"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";

function stripProtocol(value: string) {
  return value.trim().replace(/^https?:\/\//i, "");
}

type ProjectLinkValue = {
  title: string;
  link: string;
};

export function AddProjectLink({
  onAdd,
  trigger,
}: {
  onAdd: (link: ProjectLinkValue) => void | Promise<void>;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setUrl("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  function handleSubmit() {
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

    handleOpenChange(false);
    void onAdd({ title: trimmedTitle, link: trimmedUrl });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button size={trigger ? "default" : "icon-sm"} />}
      >
        {trigger ?? <Plus />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Link</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="project-link-title">Title</FieldLabel>
            <Input
              id="project-link-title"
              placeholder="Website"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-link-url">Website URL</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="project-link-url"
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(stripProtocol(e.target.value))}
              />
              <InputGroupAddon>
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="button" onClick={handleSubmit}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectLinkDialog({
  open,
  onOpenChange,
  initialLink,
  dialogTitle,
  submitLabel,
  titlePlaceholder = "Website",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLink?: ProjectLinkValue | null;
  dialogTitle: string;
  submitLabel: string;
  titlePlaceholder?: string;
  onSubmit: (link: ProjectLinkValue) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialLink?.title ?? "");
    setUrl(stripProtocol(initialLink?.link ?? ""));
    setError(null);
  }, [open, initialLink]);

  function handleSubmit() {
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

    onOpenChange(false);
    void onSubmit({ title: trimmedTitle, link: trimmedUrl });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-project-link-title">Title</FieldLabel>
            <Input
              id="edit-project-link-title"
              placeholder={titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-project-link-url">Website URL</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="edit-project-link-url"
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(stripProtocol(e.target.value))}
              />
              <InputGroupAddon>
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="button" onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
