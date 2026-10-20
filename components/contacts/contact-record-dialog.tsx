"use client";

import { useActionState, useEffect } from "react";
import { deleteContact } from "@/app/actions/contacts";
import Button from "@/components/_ui/button";
import SourceRecordDetails from "@/components/_common/source-record-details";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import type { Contact } from "@/data/contacts";
import type { ActionState } from "@/lib/action-state";
import { formatCompanyDate } from "@/lib/companies";

type ContactRecordDialogProps = {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
};

const INITIAL_STATE: ActionState = {};

export default function ContactRecordDialog({
  contact,
  open,
  onOpenChange,
  onEdit,
}: ContactRecordDialogProps) {
  const [state, action, pending] = useActionState(deleteContact, INITIAL_STATE);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [onOpenChange, state.success]);

  const emails = contact
    ? [...new Set([contact.email, ...contact.emails].filter((value): value is string => Boolean(value)))]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {contact && (
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="pr-8 break-words">{contact.name}</DialogTitle>
            <DialogDescription>Contact details</DialogDescription>
          </DialogHeader>

          <dl className="grid gap-5 px-6 py-5">
            <div>
              <dt className="caption-style text-subtle">Email addresses</dt>
              <dd className="p-style mt-2 flex flex-col gap-2 break-all">
                {emails.length > 0 ? emails.map((email) => (
                  <a key={email} href={`mailto:${email}`} className="underline decoration-white/20 underline-offset-4">
                    {email}
                  </a>
                )) : <span className="text-subtle">Not set</span>}
              </dd>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="caption-style text-subtle">Phone</dt>
                <dd className="p-style mt-2 break-words">
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="underline decoration-white/20 underline-offset-4">
                      {contact.phone}
                    </a>
                  ) : <span className="text-subtle">Not set</span>}
                </dd>
              </div>
              <div>
                <dt className="caption-style text-subtle">Job title</dt>
                <dd className="p-style mt-2 break-words">{contact.job_title || <span className="text-subtle">Not set</span>}</dd>
              </div>
            </div>
            <div>
              <dt className="caption-style text-subtle">Companies</dt>
              {contact.linked_companies.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-3">
                  {contact.linked_companies.map((company) => (
                    <li key={`${company.id}-${company.kind}`} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="p-style break-words">{company.name}</span>
                      <span className="caption-style text-subtle">
                        {company.kind === "current" ? "Current" : "Previous"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <dd className="p-style text-soft mt-2">No linked companies</dd>}
            </div>
            <div>
              <dt className="caption-style text-subtle">Notes</dt>
              <dd className="p-style mt-2 break-words whitespace-pre-wrap">
                {contact.notes || <span className="text-subtle">No notes</span>}
              </dd>
            </div>
            <div className="caption-style text-subtle flex flex-wrap gap-x-5 gap-y-2 tabular-nums">
              <span>Created {formatCompanyDate(contact.created_at)}</span>
              <span>Updated {formatCompanyDate(contact.updated_at)}</span>
            </div>
            {state.error && <p role="alert" className="caption-style text-danger">{state.error}</p>}
          </dl>

          <SourceRecordDetails
            properties={contact.source_properties}
            markdownProperties={contact.source_markdown_properties}
            body={contact.source_body}
            sourceSystem={contact.source_system}
          />

          <DialogFooter className="justify-between">
            <form
              action={action}
              onSubmit={(event) => {
                if (!window.confirm(`Delete ${contact.name}? This cannot be undone.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={contact.id} />
              <Button variant="ghost" size="md" className="text-danger h-10" type="submit" disabled={pending}>
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </form>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="md" className="h-10" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="primary" size="md" className="h-10" onClick={() => onEdit(contact)}>
                Edit contact
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
