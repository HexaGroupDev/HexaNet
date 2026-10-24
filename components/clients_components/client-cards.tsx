"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Folder,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  parseClientData,
  type ClientContact,
  type ClientData,
  type ClientField,
  type ContactKind,
} from "@/lib/clients/client-data";
import { cn } from "@/lib/utils";

const addRowClassName =
  "flex cursor-pointer items-center gap-1 rounded-md border border-dashed p-2 text-left opacity-40 duration-100 hover:border-primary hover:bg-primary/25 hover:text-primary hover:opacity-100";

function newId() {
  return crypto.randomUUID();
}

function CustomFieldCard({
  field,
  locked,
  onTitleChange,
  onEntryChange,
  onAddEntry,
  onRemoveEntry,
  onDelete,
  onCommit,
}: {
  field: ClientField;
  locked: boolean;
  onTitleChange: (fieldId: string, title: string) => void;
  onEntryChange: (fieldId: string, entryId: string, value: string) => void;
  onAddEntry: (fieldId: string) => void;
  onRemoveEntry: (fieldId: string, entryId: string) => void;
  onDelete: (fieldId: string) => void;
  onCommit: (fieldId: string) => void;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border bg-background p-3"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        onCommit(field.id);
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          id={`field-title-${field.id}`}
          value={field.title}
          disabled={locked}
          placeholder="Field title"
          aria-label="Field title"
          onChange={(event) => onTitleChange(field.id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const firstEntry = field.entries[0];
            if (firstEntry) {
              document.getElementById(`field-data-${firstEntry.id}`)?.focus();
              return;
            }
            onAddEntry(field.id);
          }}
        />
        {locked ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${field.title || "field"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onDelete(field.id)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {field.entries.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-2">
            <InputGroup className="min-w-0 flex-1">
              <InputGroupInput
                id={`field-data-${entry.id}`}
                value={entry.value}
                disabled={locked}
                placeholder="Data"
                aria-label={`${field.title || "Field"} data ${index + 1}`}
                onChange={(event) =>
                  onEntryChange(field.id, entry.id, event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || locked) return;
                  event.preventDefault();
                  onAddEntry(field.id);
                }}
              />
            </InputGroup>
            {locked ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove data ${index + 1}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onRemoveEntry(field.id, entry.id)}
              >
                <X />
              </Button>
            )}
          </div>
        ))}
      </div>
      {locked ? null : (
        <button
          type="button"
          className={addRowClassName}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onAddEntry(field.id)}
        >
          <Plus size={12} />
          Add data
        </button>
      )}
    </section>
  );
}

function FieldShell({
  icon: Icon,
  label,
  action,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
          <h3 className="text-sm font-medium leading-none">{label}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ContactKindSwitch({
  kind,
  disabled,
  onChange,
}: {
  kind: ContactKind;
  disabled: boolean;
  onChange: (kind: ContactKind) => void;
}) {
  const options: { value: ContactKind; label: string }[] = [
    { value: "company", label: "Company" },
    { value: "personal", label: "Personal" },
  ];

  return (
    <div
      className="inline-flex rounded-lg bg-muted p-0.5"
      role="group"
      aria-label="Contact type"
    >
      {options.map((option) => {
        const selected = kind === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ClientCards({
  clientId,
  clientData,
  editable,
}: {
  clientId: string;
  clientData: ClientData;
  editable: boolean;
}) {
  const [data, setData] = useState(clientData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef(data);
  const savedRef = useRef(JSON.stringify(clientData));
  const chainRef = useRef(Promise.resolve());
  const focusIdRef = useRef<string | null>(null);

  useEffect(() => {
    const focusId = focusIdRef.current;
    if (!focusId) return;
    focusIdRef.current = null;
    document.getElementById(focusId)?.focus();
  });

  function commit(next: ClientData) {
    dataRef.current = next;
    setData(next);
    queueSave();
  }

  function updateContact(nextContact: ClientContact, save = false) {
    const next: ClientData = {
      ...dataRef.current,
      client_contact: nextContact,
    };
    dataRef.current = next;
    setData(next);
    if (save) queueSave();
  }

  function updateCompany(
    patch: Partial<ClientContact["company"]>,
    save = false,
  ) {
    const current = dataRef.current.client_contact;
    updateContact(
      { ...current, company: { ...current.company, ...patch } },
      save,
    );
  }

  function updatePersonal(
    patch: Partial<ClientContact["personal"]>,
    save = false,
  ) {
    const current = dataRef.current.client_contact;
    updateContact(
      { ...current, personal: { ...current.personal, ...patch } },
      save,
    );
  }

  function queueSave() {
    if (!editable) return;

    chainRef.current = chainRef.current
      .then(async () => {
        const current = dataRef.current;
        const snapshot: ClientData = {
          ...current,
          address: current.address.trim(),
          client_contact: {
            kind: current.client_contact.kind,
            company: {
              email: current.client_contact.company.email.trim(),
              phone: current.client_contact.company.phone.trim(),
            },
            personal: {
              name: current.client_contact.personal.name.trim(),
              job: current.client_contact.personal.job.trim(),
              email: current.client_contact.personal.email.trim(),
              phone: current.client_contact.personal.phone.trim(),
            },
          },
          fields: current.fields.map((field) => ({
            id: field.id,
            title: field.title.trim(),
            entries: field.entries.map((entry) => ({
              id: entry.id,
              value: entry.value.trim(),
            })),
          })),
        };
        const serialized = JSON.stringify(snapshot);
        if (serialized === savedRef.current) return;

        setSaving(true);
        setError(null);

        const supabase = createClient();
        const { data: existing, error: readError } = await supabase
          .from("clients")
          .select("client_data")
          .eq("id", clientId)
          .maybeSingle();

        if (readError) {
          setError(readError.message);
          return;
        }

        const nextData: ClientData = {
          ...parseClientData(existing?.client_data),
          address: snapshot.address,
          client_contact: snapshot.client_contact,
          fields: snapshot.fields,
        };

        const { data: saved, error: updateError } = await supabase
          .from("clients")
          .update({ client_data: nextData })
          .eq("id", clientId)
          .select("id")
          .maybeSingle();

        if (updateError || !saved) {
          setError(
            updateError?.message ??
              "Could not save client details. You may not have permission.",
          );
          return;
        }

        savedRef.current = serialized;
      })
      .finally(() => {
        setSaving(false);
      });
  }

  function replaceFields(fields: ClientField[], save = false) {
    const next: ClientData = { ...dataRef.current, fields };
    dataRef.current = next;
    setData(next);
    if (save) queueSave();
  }

  function updateField(
    fieldId: string,
    patch: (field: ClientField) => ClientField,
  ) {
    replaceFields(
      dataRef.current.fields.map((field) =>
        field.id === fieldId ? patch(field) : field,
      ),
    );
  }

  function addCustomField() {
    const id = newId();
    focusIdRef.current = `field-title-${id}`;
    replaceFields([
      ...dataRef.current.fields,
      { id, title: "", entries: [{ id: newId(), value: "" }] },
    ]);
  }

  function addFieldEntry(fieldId: string) {
    const entryId = newId();
    focusIdRef.current = `field-data-${entryId}`;
    updateField(fieldId, (field) => ({
      ...field,
      entries: [...field.entries, { id: entryId, value: "" }],
    }));
  }

  function commitField(fieldId: string) {
    const fields = dataRef.current.fields.flatMap((field) => {
      if (field.id !== fieldId) return [field];
      const title = field.title.trim();
      const entries = field.entries.map((entry) => ({
        ...entry,
        value: entry.value.trim(),
      }));
      if (!title && entries.every((entry) => !entry.value)) return [];
      return [{ ...field, title, entries }];
    });
    replaceFields(fields, true);
  }

  const contact = data.client_contact;
  const locked = !editable;

  return (
    <section>
      <Empty className="hidden border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Folder />
          </EmptyMedia>
          <EmptyTitle>No Client Data Yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button>Add Card</Button>
        </EmptyContent>
      </Empty>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Client
            {saving ? (
              <Spinner className="size-3.5 text-primary" aria-label="Saving" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <FieldShell icon={MapPin} label="Address">
            <InputGroup>
              <InputGroupInput
                value={data.address}
                disabled={locked}
                placeholder="Street, city, postal code"
                aria-label="Address"
                onChange={(event) => {
                  const next = {
                    ...dataRef.current,
                    address: event.target.value,
                  };
                  dataRef.current = next;
                  setData(next);
                }}
                onBlur={() =>
                  commit({
                    ...dataRef.current,
                    address: dataRef.current.address.trim(),
                  })
                }
              />
            </InputGroup>
          </FieldShell>

          <FieldShell
            icon={contact.kind === "company" ? Building2 : UserRound}
            label="Contact"
            action={
              <ContactKindSwitch
                kind={contact.kind}
                disabled={locked}
                onChange={(kind) =>
                  updateContact({ ...dataRef.current.client_contact, kind }, true)
                }
              />
            }
          >
            <p className="text-xs text-muted-foreground">
              {contact.kind === "company"
                ? "Company email and phone number."
                : "Personal contact name, email, and phone number."}
            </p>
            {contact.kind === "personal" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor={`${clientId}-personal-name`}>Name</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <UserRound />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${clientId}-personal-name`}
                      value={contact.personal.name}
                      disabled={locked}
                      placeholder="Contact name"
                      onChange={(event) =>
                        updatePersonal({ name: event.target.value })
                      }
                      onBlur={() =>
                        updatePersonal(
                          {
                            name: dataRef.current.client_contact.personal.name.trim(),
                          },
                          true,
                        )
                      }
                    />
                  </InputGroup>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${clientId}-personal-email`}>Email</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${clientId}-personal-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={contact.personal.email}
                      disabled={locked}
                      placeholder="name@email.com"
                      onChange={(event) =>
                        updatePersonal({ email: event.target.value })
                      }
                      onBlur={() =>
                        updatePersonal(
                          {
                            email:
                              dataRef.current.client_contact.personal.email.trim(),
                          },
                          true,
                        )
                      }
                    />
                  </InputGroup>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${clientId}-personal-phone`}>
                    Phone number
                  </Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <Phone />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${clientId}-personal-phone`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={contact.personal.phone}
                      disabled={locked}
                      placeholder="+1 555 0100"
                      onChange={(event) =>
                        updatePersonal({ phone: event.target.value })
                      }
                      onBlur={() =>
                        updatePersonal(
                          {
                            phone:
                              dataRef.current.client_contact.personal.phone.trim(),
                          },
                          true,
                        )
                      }
                    />
                  </InputGroup>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${clientId}-company-email`}>Email</Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${clientId}-company-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={contact.company.email}
                      disabled={locked}
                      placeholder="name@company.com"
                      onChange={(event) =>
                        updateCompany({ email: event.target.value })
                      }
                      onBlur={() =>
                        updateCompany(
                          {
                            email:
                              dataRef.current.client_contact.company.email.trim(),
                          },
                          true,
                        )
                      }
                    />
                  </InputGroup>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${clientId}-company-phone`}>
                    Phone number
                  </Label>
                  <InputGroup>
                    <InputGroupAddon>
                      <Phone />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${clientId}-company-phone`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={contact.company.phone}
                      disabled={locked}
                      placeholder="+1 555 0100"
                      onChange={(event) =>
                        updateCompany({ phone: event.target.value })
                      }
                      onBlur={() =>
                        updateCompany(
                          {
                            phone:
                              dataRef.current.client_contact.company.phone.trim(),
                          },
                          true,
                        )
                      }
                    />
                  </InputGroup>
                </div>
              </div>
            )}
          </FieldShell>

          {data.fields.map((field) => (
            <CustomFieldCard
              key={field.id}
              field={field}
              locked={locked}
              onTitleChange={(fieldId, title) =>
                updateField(fieldId, (current) => ({ ...current, title }))
              }
              onEntryChange={(fieldId, entryId, value) =>
                updateField(fieldId, (current) => ({
                  ...current,
                  entries: current.entries.map((entry) =>
                    entry.id === entryId ? { ...entry, value } : entry,
                  ),
                }))
              }
              onAddEntry={addFieldEntry}
              onRemoveEntry={(fieldId, entryId) =>
                replaceFields(
                  dataRef.current.fields.map((current) =>
                    current.id === fieldId
                      ? {
                          ...current,
                          entries: current.entries.filter(
                            (entry) => entry.id !== entryId,
                          ),
                        }
                      : current,
                  ),
                  true,
                )
              }
              onDelete={(fieldId) =>
                replaceFields(
                  dataRef.current.fields.filter(
                    (current) => current.id !== fieldId,
                  ),
                  true,
                )
              }
              onCommit={commitField}
            />
          ))}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {locked ? null : (
            <button
              type="button"
              className={addRowClassName}
              onClick={addCustomField}
            >
              <Plus size={12} />
              Add Field
            </button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
