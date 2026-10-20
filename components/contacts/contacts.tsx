"use client";

import { useMemo, useState } from "react";
import { signOut } from "@/app/actions/auth";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/input";
import ContactEditorDialog from "@/components/contacts/contact-editor-dialog";
import ContactRecordDialog from "@/components/contacts/contact-record-dialog";
import type { Contact } from "@/data/contacts";
import { contactSearchText } from "@/lib/contacts";
import { formatCompanyDate } from "@/lib/companies";
import PlusIcon from "@/public/assets/images/_common/plus.svg";
import UsersIcon from "@/public/assets/images/companies/sidebar/users.svg";

type ContactsProps = {
  contacts: Contact[];
  email: string;
  loadError?: boolean;
};

export default function Contacts({ contacts, email, loadError = false }: ContactsProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "updated">("name");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts
      .filter((contact) => !needle || contactSearchText(contact).includes(needle))
      .sort((left, right) =>
        sortBy === "name"
          ? left.name.localeCompare(right.name)
          : right.updated_at.localeCompare(left.updated_at),
      );
  }, [contacts, query, sortBy]);

  const editingContact = contacts.find((contact) => contact.id === editingId) ?? null;
  const detailsContact = contacts.find((contact) => contact.id === detailsId) ?? null;

  function openNewContact() {
    setEditingId(null);
    setEditorOpen(true);
  }

  function openEditContact(contact: Contact) {
    setDetailsId(null);
    setEditingId(contact.id);
    setEditorOpen(true);
  }

  function linkedCompanies(contact: Contact) {
    if (contact.linked_companies.length === 0) return "No company";
    return contact.linked_companies
      .map((company) => company.name + (company.kind === "previous" ? " (previous)" : ""))
      .join(", ");
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-balance">Contacts</h1>
          <p className="caption-style text-subtle mt-1" role="status">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="caption-style text-subtle hidden max-w-48 truncate sm:inline">
            {email}
          </span>
          <Button variant="ghost" size="sm" href="/forgot-password">
            Password
          </Button>
          <form action={signOut}>
            <Button variant="secondary" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {loadError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="border-line-strong bg-card w-full max-w-md rounded-2xl border p-6 text-center shadow-overlay">
            <h2 className="text-balance">Contacts aren’t available yet</h2>
            <p className="p-style text-soft mt-3 text-pretty">
              We couldn’t load your contacts right now. Please try again in a moment.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-5 h-10"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="search"
                aria-label="Search contacts"
                placeholder="Search contacts"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 sm:w-64"
              />
              <label className="caption-style text-subtle flex items-center gap-2">
                Sort
                <select
                  aria-label="Sort contacts"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "name" | "updated")}
                  className="border-line-strong bg-secondary text-foreground h-10 rounded-lg border px-3 text-[13px] outline-none focus-visible:border-ring"
                >
                  <option value="name">Name</option>
                  <option value="updated">Recently updated</option>
                </select>
              </label>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button variant="primary" size="md" className="h-10" onClick={openNewContact}>
                <PlusIcon aria-hidden className="size-3.5" />
                New contact
              </Button>
            </div>
          </div>

          {contacts.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <div className="border-line-strong bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-overlay">
                <span className="bg-secondary text-soft mx-auto flex size-12 items-center justify-center rounded-xl">
                  <UsersIcon aria-hidden className="size-5" />
                </span>
                <h2 className="mt-5 text-balance">No contacts yet</h2>
                <p className="p-style text-soft mt-3 text-pretty">
                  Add a contact or import your linked Notion contacts to get started.
                </p>
                <Button variant="primary" size="md" className="mt-5 h-10" onClick={openNewContact}>
                  <PlusIcon aria-hidden className="size-3.5" />
                  Add first contact
                </Button>
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="border-border text-soft flex min-h-0 flex-1 items-center justify-center border-t px-6 text-center">
              <p>No contacts match that search.</p>
            </div>
          ) : (
            <div className="border-border min-h-0 flex-1 overflow-auto border-t">
              <div className="hidden min-w-[760px] md:block">
                <table className="w-full border-collapse text-left text-[14px]">
                  <thead className="caption-style text-subtle sticky top-0 z-10 bg-background">
                    <tr className="border-border border-b">
                      <th scope="col" className="h-11 px-4 font-normal sm:px-6">Contact</th>
                      <th scope="col" className="h-11 px-4 font-normal">Company</th>
                      <th scope="col" className="h-11 px-4 font-normal">Email</th>
                      <th scope="col" className="h-11 px-4 font-normal">Job title</th>
                      <th scope="col" className="h-11 px-4 font-normal">Updated</th>
                      <th scope="col" className="h-11 px-4 font-normal"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="border-border hover:bg-card/60 border-b transition-colors duration-150">
                        <td className="h-14 max-w-56 px-4 sm:px-6">
                          <Button
                            variant="ghost"
                            size="none"
                            className="max-w-full truncate text-left font-medium"
                            onClick={() => setDetailsId(contact.id)}
                          >
                            {contact.name}
                          </Button>
                        </td>
                        <td className="text-soft h-14 max-w-56 truncate px-4">{linkedCompanies(contact)}</td>
                        <td className="text-soft h-14 max-w-56 truncate px-4">{contact.email || <span className="text-subtle">—</span>}</td>
                        <td className="text-soft h-14 max-w-48 truncate px-4">{contact.job_title || <span className="text-subtle">—</span>}</td>
                        <td className="text-soft tabular-nums h-14 whitespace-nowrap px-4">{formatCompanyDate(contact.updated_at)}</td>
                        <td className="h-14 px-4 text-right">
                          <Button variant="secondary" size="sm" className="h-9" onClick={() => openEditContact(contact)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-border divide-y md:hidden">
                {filteredContacts.map((contact) => (
                  <li key={contact.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Button
                          variant="ghost"
                          size="none"
                          className="max-w-full truncate text-left font-medium"
                          onClick={() => setDetailsId(contact.id)}
                        >
                          {contact.name}
                        </Button>
                        <p className="caption-style text-soft mt-1 truncate">{contact.job_title || "No job title set"}</p>
                        <p className="caption-style text-subtle mt-2 break-words">{linkedCompanies(contact)}</p>
                        {contact.email && <p className="caption-style text-soft mt-2 break-all">{contact.email}</p>}
                        <p className="caption-style text-subtle tabular-nums mt-2">
                          Updated {formatCompanyDate(contact.updated_at)}
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" className="h-9" onClick={() => openEditContact(contact)}>
                        Edit
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {editorOpen && (
        <ContactEditorDialog
          key={editingId ?? "new-contact"}
          contact={editingContact}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      )}
      {detailsContact && (
        <ContactRecordDialog
          contact={detailsContact}
          open
          onOpenChange={(open) => {
            if (!open) setDetailsId(null);
          }}
          onEdit={openEditContact}
        />
      )}
    </section>
  );
}
