import type { ReactNode } from "react";
import Logo from "@/public/assets/images/_common/logo.svg";

type AuthPanelProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthPanel({
  title,
  description,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Logo aria-hidden className="size-8 shrink-0" />
          <span className="lead-style font-medium tracking-[-0.01em]">
            Sales CRM
          </span>
        </div>

        <section className="border-line-strong bg-card overflow-hidden rounded-2xl border shadow-overlay">
          <header className="border-line-strong border-b px-6 py-5">
            <h1 className="text-balance">{title}</h1>
            <p className="p-style text-soft mt-2 text-pretty">{description}</p>
          </header>
          <div className="px-6 py-5">{children}</div>
        </section>

        {footer && (
          <div className="caption-style text-subtle mt-5 text-center">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
