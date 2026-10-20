"use client";

import { useActionState } from "react";
import Button from "@/components/_ui/button";
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import type { ActionState } from "@/lib/action-state";
import { updatePassword } from "@/app/actions/auth";

const INITIAL_STATE: ActionState = {};

export default function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    updatePassword,
    INITIAL_STATE,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="New password"
        htmlFor="new-password"
        required
        hint="Use at least 12 characters."
      >
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          className="h-10"
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirm-password" required>
        <Input
          id="confirm-password"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          className="h-10"
        />
      </Field>
      {state.error && (
        <p role="alert" className="caption-style text-danger">
          {state.error}
        </p>
      )}
      <Button
        variant="primary"
        size="md"
        className="h-10 w-full"
        type="submit"
        disabled={pending}
      >
        {pending ? "Updating…" : "Set password"}
      </Button>
    </form>
  );
}
