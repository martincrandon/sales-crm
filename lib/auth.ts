import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function isApprovedUser(user: User | null | undefined) {
  if (!user?.email || user.is_anonymous) return false;
  if (!user.email_confirmed_at && !user.confirmed_at) return false;

  const approvedEmails = new Set(
    (process.env.CRM_ALLOWED_EMAILS ?? "")
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  return approvedEmails.has(user.email.toLowerCase());
}

export async function getApprovedSession() {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !isApprovedUser(data.user)) return null;

    return {
      supabase,
      user: { id: data.user.id, email: data.user.email! },
    };
  } catch {
    return null;
  }
}

export async function requireApprovedSession() {
  const session = await getApprovedSession();
  if (!session) redirect("/login?status=access");
  return session;
}

export function safeAuthDestination(value: string | null) {
  return value === "/update-password" ? value : "/";
}
