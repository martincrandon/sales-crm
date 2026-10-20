import type { Contact, ContactInput } from "@/data/contacts";

export type ContactValidation =
  | { data: ContactInput; error?: never }
  | { data?: never; error: string };

export function validateContactInput(input: {
  name: unknown;
  email: unknown;
  emails: unknown;
  phone: unknown;
  job_title: unknown;
  notes: unknown;
}): ContactValidation {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const emails = typeof input.emails === "string"
    ? input.emails.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    : [];
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const jobTitle = typeof input.job_title === "string" ? input.job_title.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!name) return { error: "Enter a contact name." };

  return {
    data: {
      name,
      email: email || null,
      emails,
      phone: phone || null,
      job_title: jobTitle || null,
      notes: notes || null,
    },
  };
}

export function contactSearchText(contact: Contact) {
  return [
    contact.name,
    contact.email,
    ...contact.emails,
    contact.phone,
    contact.job_title,
    contact.notes,
    ...contact.linked_companies.map((company) => company.name),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}
