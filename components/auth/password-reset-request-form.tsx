"use client";

import { useActionState } from "react";
import Button from "@/components/_ui/button";
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import type { ActionState } from "@/lib/action-state";
import { requestPasswordReset } from "@/app/actions/auth";

const INITIAL_STATE: ActionState = {};

export default function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    INITIAL_STATE,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Email" htmlFor="reset-email" required>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="h-10"
        />
      </Field>
      {state.error && (
        <p role="alert" className="caption-style text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="caption-style text-soft">
          {state.message}
        </p>
      )}
      <Button
        variant="primary"
        size="md"
        className="h-10 w-full"
        type="submit"
        disabled={pending}
      >
        {pending ? "Sending…" : "Send password link"}
      </Button>
    </form>
  );
}
