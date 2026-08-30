"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function AddContactLinkDialog({
  open,
  onOpenChange,
  phone,
  onPhoneChange,
  onPhoneCommit,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  onPhoneCommit: (value: string) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  function handleSubmit() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Enter a phone number.");
      return;
    }

    onOpenChange(false);
    void onPhoneCommit(trimmed);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) void onPhoneCommit(phone);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact links</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          {phone.trim() ? (
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">
                <button
                  type="button"
                  data-icon="inline-start"
                  aria-label="Remove phone number"
                  className="inline-flex hover:cursor-pointer"
                  onClick={() => void onRemove()}
                >
                  <X className="size-3" />
                </button>
                {phone.trim()}
              </Badge>
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="profile-phone">Phone number</FieldLabel>
            <Input
              id="profile-phone"
              type="tel"
              placeholder="Add a phone number"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />
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
