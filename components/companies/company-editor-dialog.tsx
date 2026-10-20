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
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import type { Company } from "@/data/companies";
import type { ActionState } from "@/lib/action-state";
import { saveCompany } from "@/app/actions/companies";

type CompanyEditorDialogProps = {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_STATE: ActionState = {};

export default function CompanyEditorDialog({
  company,
  open,
  onOpenChange,
}: CompanyEditorDialogProps) {
  const [state, action, pending] = useActionState(saveCompany, INITIAL_STATE);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [onOpenChange, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <form action={action} className="flex flex-col">
          {company && <input type="hidden" name="id" value={company.id} />}
          <DialogHeader>
            <DialogTitle>
              {company ? "Edit company" : "New company"}
            </DialogTitle>
            <DialogDescription>
              Save the company details you want to keep in your CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-6 py-5">
            <Field label="Company name" htmlFor="company-name" required>
              <Input
                id="company-name"
                name="name"
                required
                maxLength={160}
                placeholder="Acme Inc."
                defaultValue={company?.name ?? ""}
                autoFocus
                className="h-10"
              />
            </Field>

            <Field
              label="Website"
              htmlFor="company-website"
              hint="Use a full address, including https://."
            >
              <Input
                id="company-website"
                name="website"
                type="url"
                maxLength={2048}
                placeholder="https://example.com"
                defaultValue={company?.website ?? ""}
                className="h-10"
              />
            </Field>

            <Field label="Industry" htmlFor="company-industry">
              <Input
                id="company-industry"
                name="industry"
                maxLength={120}
                placeholder="Software"
                defaultValue={company?.industry ?? ""}
                className="h-10"
              />
            </Field>

            <Field
              label="Notes"
              htmlFor="company-notes"
              hint="Up to 5,000 characters."
            >
              <textarea
                id="company-notes"
                name="notes"
                maxLength={5000}
                rows={5}
                placeholder="Company context, goals, and useful details"
                defaultValue={company?.notes ?? ""}
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
              {pending ? "Saving…" : company ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
