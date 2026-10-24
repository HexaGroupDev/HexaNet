export type ContactKind = "company" | "personal";

export type CompanyContact = {
  email: string;
  phone: string;
};

export type PersonalContact = {
  name: string;
  job: string;
  email: string;
  phone: string;
};

export type ClientContact = {
  kind: ContactKind;
  company: CompanyContact;
  personal: PersonalContact;
};

export type FinancialServiceContact = {
  title: string;
  email: string;
  phone: string;
};

export type ClientFieldEntry = {
  id: string;
  value: string;
};

export type ClientField = {
  id: string;
  title: string;
  entries: ClientFieldEntry[];
};

export type ClientData = {
  name: string;
  address: string;
  financial_service: string;
  client_contact: ClientContact;
  financial_service_contact: FinancialServiceContact;
  fields: ClientField[];
};

export const emptyClientData: ClientData = {
  name: "",
  address: "",
  financial_service: "",
  client_contact: {
    kind: "company",
    company: { email: "", phone: "" },
    personal: { name: "", job: "", email: "", phone: "" },
  },
  financial_service_contact: {
    title: "",
    email: "",
    phone: "",
  },
  fields: [],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asFields(value: unknown): ClientField[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const field = asRecord(item);
    if (!field) return [];
    const id = asString(field.id);
    if (!id) return [];

    const entries = Array.isArray(field.entries)
      ? field.entries.flatMap((entry) => {
          const record = asRecord(entry);
          if (!record) return [];
          const entryId = asString(record.id);
          if (!entryId) return [];
          return [{ id: entryId, value: asString(record.value) }];
        })
      : [];

    return [{ id, title: asString(field.title), entries }];
  });
}

function asContactKind(
  value: unknown,
  contact: { name: string; job: string },
): ContactKind {
  if (value === "company" || value === "personal") return value;
  if (contact.name || contact.job) return "personal";
  return "company";
}

function asCompanyContact(value: unknown): CompanyContact {
  const record = asRecord(value);
  return {
    email: asString(record?.email),
    phone: asString(record?.phone),
  };
}

function asPersonalContact(value: unknown): PersonalContact {
  const record = asRecord(value);
  return {
    name: asString(record?.name),
    job: asString(record?.job),
    email: asString(record?.email),
    phone: asString(record?.phone),
  };
}

export function parseClientData(value: unknown): ClientData {
  const root = asRecord(value) ?? {};
  const clientContact = asRecord(root.client_contact) ?? {};
  const financialContact = asRecord(root.financial_service_contact) ?? {};
  const legacyName = asString(clientContact.name);
  const legacyJob = asString(clientContact.job);
  const legacyEmail = asString(clientContact.email);
  const legacyPhone = asString(clientContact.phone);
  const companyRecord = asRecord(clientContact.company);
  const personalRecord = asRecord(clientContact.personal);
  const personalName = asString(personalRecord?.name) || legacyName;
  const personalJob = asString(personalRecord?.job) || legacyJob;
  const kind = asContactKind(clientContact.kind, {
    name: personalName,
    job: personalJob,
  });

  const company = asCompanyContact(companyRecord);
  const personal = asPersonalContact(personalRecord);
  if (!personal.name) personal.name = legacyName;
  if (!personal.job) personal.job = legacyJob;

  // Older contacts stored one email and phone for both kinds.
  if (!companyRecord && !personalRecord) {
    if (kind === "personal") {
      personal.email = legacyEmail;
      personal.phone = legacyPhone;
    } else {
      company.email = legacyEmail;
      company.phone = legacyPhone;
    }
  }

  return {
    name: asString(root.name),
    address: asString(root.address),
    financial_service: asString(root.financial_service),
    client_contact: {
      kind,
      company,
      personal,
    },
    financial_service_contact: {
      title: asString(financialContact.title),
      email: asString(financialContact.email),
      phone: asString(financialContact.phone),
    },
    fields: asFields(root.fields),
  };
}
