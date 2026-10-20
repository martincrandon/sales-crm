"use server";

import { redirect } from "next/navigation";
import { getApprovedSession, isApprovedUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import { authCallbackUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AUTH_ERROR = "Email or password is incorrect, or this account isn't approved.";

export async function signIn(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return { error: "Enter a valid email address and password." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Authentication is not configured yet." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: AUTH_ERROR };

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !isApprovedUser(data.user)) {
      await supabase.auth.signOut();
      return { error: AUTH_ERROR };
    }
  } catch {
    return { error: "Sign in is temporarily unavailable. Try again." };
  }

  redirect("/");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {}
  }
  redirect("/login");
}

export async function validateAuthHandoff() {
  if (!isSupabaseConfigured()) return { ok: false };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !isApprovedUser(data.user)) {
      await supabase.auth.signOut();
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function requestPasswordReset(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Password reset is not configured yet." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl("/update-password"),
    });
    if (error) return { error: "Unable to request a reset email. Try again." };
  } catch {
    return { error: "Unable to request a reset email. Try again." };
  }

  return {
    success: true,
    message: "If that address has an invited account, a password link is on its way.",
  };
}

export async function updatePassword(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getApprovedSession();
  if (!session) {
    return { error: "This password link is no longer valid. Request a new one." };
  }

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 12) {
    return { error: "Use a password with at least 12 characters." };
  }
  if (password.length > 128) {
    return { error: "Use a password with no more than 128 characters." };
  }
  if (password !== confirmation) {
    return { error: "The passwords do not match." };
  }

  try {
    const { error } = await session.supabase.auth.updateUser({ password });
    if (error) return { error: "Unable to update the password. Try again." };
  } catch {
    return { error: "Unable to update the password. Try again." };
  }

  redirect("/");
}
