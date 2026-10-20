"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validateAuthHandoff } from "@/app/actions/auth";

type BridgeState = "idle" | "error";

const ERROR_MESSAGE =
  "That link couldn’t be verified. Request a new link or ask an administrator for help.";

export default function AuthLinkBridge() {
  const router = useRouter();
  const handled = useRef(false);
  const [state, setState] = useState<BridgeState>("idle");

  useEffect(() => {
    if (handled.current) return;

    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.slice(1));
    const hasAuthResponse = [
      "access_token",
      "refresh_token",
      "error",
      "error_description",
      "error_code",
    ].some((key) => params.has(key));
    if (!hasAuthResponse) return;

    handled.current = true;
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    async function consumeLink() {
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");
      const hasAuthError = ["error", "error_description", "error_code"].some(
        (key) => params.has(key),
      );

      if (
        !accessToken ||
        !refreshToken ||
        (type !== "invite" && type !== "recovery") ||
        hasAuthError
      ) {
        setState("error");
        return;
      }

      try {
        const { createSupabaseBrowserClient } = await import(
          "@/lib/supabase/client"
        );
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setState("error");
          return;
        }

        const result = await validateAuthHandoff();
        if (!result.ok) {
          setState("error");
          return;
        }

        router.replace("/update-password");
      } catch {
        setState("error");
      }
    }

    startTransition(() => {
      void consumeLink();
    });
  }, [router]);

  if (state === "idle") return null;

  return (
    <p
      role="alert"
      className="caption-style text-soft border-border bg-card fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-center shadow-overlay"
    >
      {ERROR_MESSAGE}
    </p>
  );
}
