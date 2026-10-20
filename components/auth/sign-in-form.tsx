"use client";

import { useActionState } from "react";
import Button from "@/components/_ui/button";
import Field from "@/components/_ui/field";
import { Input } from "@/components/_ui/input";
import type { ActionState } from "@/lib/action-state";
import { signIn } from "@/app/actions/auth";

const INITIAL_STATE: ActionState = {};

export default function SignInForm() {
  const [state, action, pending] = useActionState(signIn, INITIAL_STATE);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Email" htmlFor="login-email" required>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          className="h-10"
        />
      </Field>
      <Field label="Password" htmlFor="login-password" required>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
