import Link from "next/link";
import { redirect } from "next/navigation";
import AuthPanel from "@/components/auth/auth-panel";
import SignInForm from "@/components/auth/sign-in-form";
import { getApprovedSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const STATUS_MESSAGES: Record<string, string> = {
  access: "This account isn't approved for this CRM, or the sign-in link expired.",
  auth: "That sign-in link couldn't be verified. Request a fresh password link.",
  config: "Authentication isn't configured yet. Ask the workspace administrator to finish setup.",
  expired: "That password link has expired. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getApprovedSession();
  if (session) redirect("/");

  const { status } = await searchParams;
  const notice = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <AuthPanel
      title="Sign in"
      description="Sign in to your private company workspace."
      footer="Access is invitation-only."
    >
      {!isSupabaseConfigured() ? (
        <p role="alert" className="caption-style text-danger">
          Supabase URL and publishable key are missing from the environment.
        </p>
      ) : (
        <>
          {notice && (
            <p role="status" className="caption-style text-soft mb-5">
              {notice}
            </p>
          )}
          <SignInForm />
          <p className="caption-style text-soft mt-5 text-center">
            <Link
              href="/forgot-password"
              className="underline decoration-white/25 underline-offset-4 hover:decoration-white/60"
            >
              Set or reset password
            </Link>
          </p>
        </>
      )}
    </AuthPanel>
  );
}
