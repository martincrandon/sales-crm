"use client";

import { useActionState, useEffect } from "react";
import { saveContact } from "@/app/actions/contacts";
import Button from "@/components/_ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import type { Contact } from "@/data/contacts";
import type { ActionState } from "@/lib/action-state";

type ContactEditorDialogProps = {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_STATE: ActionState = {};

export default function ContactEditorDialog({
  contact,
  open,
  onOpenChange,
}: ContactEditorDialogProps) {
  const [state, action, pending] = useActionState(saveContact, INITIAL_STATE);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [onOpenChange, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <form action={action} className="flex flex-col">
          {contact && <input type="hidden" name="id" value={contact.id} />}
          <DialogHeader>
            <DialogTitle>{contact ? "Edit contact" : "New contact"}</DialogTitle>
            <DialogDescription>
              Keep the contact details you use in your CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-6 py-5">
            <Field label="Contact name" htmlFor="contact-name" required>
              <Input
                id="contact-name"
                name="name"
                required
                autoComplete="name"
                placeholder="Alex Morgan"
                defaultValue={contact?.name ?? ""}
                autoFocus
                className="h-10"
              />
            </Field>

            <Field label="Primary email" htmlFor="contact-email">
              <Input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="alex@example.com"
                defaultValue={contact?.email ?? ""}
                className="h-10"
              />
            </Field>

            <Field
              label="Other email addresses"
              htmlFor="contact-emails"
              hint="Separate addresses with commas or new lines."
            >
              <textarea
                id="contact-emails"
                name="emails"
                rows={3}
                defaultValue={contact?.emails.join(", ") ?? ""}
                className="border-line-strong bg-secondary text-foreground placeholder:text-subtle min-h-20 w-full resize-y rounded-lg border px-3 py-2.5 text-[14px] leading-5 outline-none focus-visible:border-ring"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone" htmlFor="contact-phone">
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+44 20 0000 0000"
                  defaultValue={contact?.phone ?? ""}
                  className="h-10"
                />
              </Field>
              <Field label="Job title" htmlFor="contact-job-title">
                <Input
                  id="contact-job-title"
                  name="job_title"
                  autoComplete="organization-title"
                  placeholder="Head of Partnerships"
                  defaultValue={contact?.job_title ?? ""}
                  className="h-10"
                />
              </Field>
            </div>

            <Field label="Notes" htmlFor="contact-notes">
              <textarea
                id="contact-notes"
                name="notes"
                rows={5}
                placeholder="Useful context about this contact"
                defaultValue={contact?.notes ?? ""}
                className="border-line-strong bg-secondary text-foreground placeholder:text-subtle min-h-28 w-full resize-y rounded-lg border px-3 py-2.5 text-[14px] leading-5 outline-none focus-visible:border-ring"
              />
            </Field>

            {state.error && (
              <p role="alert" className="caption-style text-danger">
                {state.error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="md"
              className="h-10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              className="h-10"
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving…" : contact ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
