"use client";

import { useActionState, useEffect } from "react";
import Button from "@/components/_ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/_ui/dialog";
import type { Company } from "@/data/companies";
import type { ActionState } from "@/lib/action-state";
import { formatCompanyDate } from "@/lib/companies";
import { deleteCompany } from "@/app/actions/companies";
import SourceRecordDetails from "@/components/_common/source-record-details";

type CompanyRecordDialogProps = {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (company: Company) => void;
};

const INITIAL_STATE: ActionState = {};

export default function CompanyRecordDialog({
  company,
  open,
  onOpenChange,
  onEdit,
}: CompanyRecordDialogProps) {
  const [state, action, pending] = useActionState(deleteCompany, INITIAL_STATE);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [onOpenChange, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {company && (
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="pr-8 break-words">
              {company.name}
            </DialogTitle>
            <DialogDescription>Company details</DialogDescription>
          </DialogHeader>

          <dl className="grid gap-5 px-6 py-5">
            <div>
              <dt className="caption-style text-subtle">Website</dt>
              <dd className="p-style mt-2 break-all">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-white/20 underline-offset-4 hover:decoration-white/50"
                  >
                    {company.website}
                  </a>
                ) : (
                  <span className="text-subtle">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="caption-style text-subtle">Industry</dt>
              <dd className="p-style mt-2">
                {company.industry || (
                  <span className="text-subtle">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="caption-style text-subtle">Notes</dt>
              <dd className="p-style mt-2 break-words whitespace-pre-wrap">
                {company.notes || (
                  <span className="text-subtle">No notes</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="caption-style text-subtle">Contacts</dt>
              {company.linked_contacts.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-3">
                  {company.linked_contacts.map((contact) => (
                    <li key={`${contact.id}-${contact.kind}`} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="p-style break-words">{contact.name}</span>
                      <span className="caption-style text-subtle">
                        {contact.kind === "current" ? "Current" : "Previous"}
                      </span>
                      {contact.job_title && (
                        <span className="caption-style text-soft break-words">{contact.job_title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <dd className="p-style text-soft mt-2">No linked contacts</dd>
              )}
            </div>
            <div className="caption-style text-subtle flex flex-wrap gap-x-5 gap-y-2 tabular-nums">
              <span>Created {formatCompanyDate(company.created_at)}</span>
              <span>Updated {formatCompanyDate(company.updated_at)}</span>
            </div>
            {state.error && (
              <p role="alert" className="caption-style text-danger">
                {state.error}
              </p>
            )}
          </dl>

          <SourceRecordDetails
            properties={company.source_properties}
            markdownProperties={company.source_markdown_properties}
            body={company.source_body}
            sourceSystem={company.source_system}
          />

          <DialogFooter className="justify-between">
            <form
              action={action}
              onSubmit={(event) => {
                if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={company.id} />
              <Button
                variant="ghost"
                size="md"
                className="text-danger h-10"
                type="submit"
                disabled={pending}
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </form>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                className="h-10"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                className="h-10"
                onClick={() => onEdit(company)}
              >
                Edit company
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
