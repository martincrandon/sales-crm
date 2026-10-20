import { redirect } from "next/navigation";
import AuthPanel from "@/components/auth/auth-panel";
import UpdatePasswordForm from "@/components/auth/update-password-form";
import { getApprovedSession } from "@/lib/auth";

export default async function UpdatePasswordPage() {
  const session = await getApprovedSession();
  if (!session) redirect("/login?status=expired");

  return (
    <AuthPanel
      title="Set a password"
      description="Choose a new password for your private CRM account."
    >
      <UpdatePasswordForm />
    </AuthPanel>
  );
}
