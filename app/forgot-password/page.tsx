import AuthPanel from "@/components/auth/auth-panel";
import PasswordResetRequestForm from "@/components/auth/password-reset-request-form";
import Button from "@/components/_ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      title="Set or reset password"
      description="Enter your invited account email and we’ll send a secure password link if an account exists."
    >
      <PasswordResetRequestForm />
      <div className="mt-4 flex justify-center">
        <Button variant="ghost" size="md" href="/login" className="h-10">
          Back to sign in
        </Button>
      </div>
    </AuthPanel>
  );
}
