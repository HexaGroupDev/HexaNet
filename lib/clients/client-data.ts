export type ClientContact = {
  name: string;
  job: string;
  email: string;
  phone: string;
};

export type FinancialServiceContact = {
  title: string;
  email: string;
  phone: string;
};

export type ClientData = {
  name: string;
  address: string;
  financial_service: string;
  client_contact: ClientContact;
  financial_service_contact: FinancialServiceContact;
};

export const emptyClientData: ClientData = {
  name: "",
  address: "",
  financial_service: "",
  client_contact: {
    name: "",
    job: "",
    email: "",
    phone: "",
  },
  financial_service_contact: {
    title: "",
    email: "",
    phone: "",
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseClientData(value: unknown): ClientData {
  const root = asRecord(value) ?? {};
  const clientContact = asRecord(root.client_contact) ?? {};
  const financialContact = asRecord(root.financial_service_contact) ?? {};

  return {
    name: asString(root.name),
    address: asString(root.address),
    financial_service: asString(root.financial_service),
    client_contact: {
      name: asString(clientContact.name),
      job: asString(clientContact.job),
      email: asString(clientContact.email),
      phone: asString(clientContact.phone),
    },
    financial_service_contact: {
      title: asString(financialContact.title),
      email: asString(financialContact.email),
      phone: asString(financialContact.phone),
    },
  };
}
