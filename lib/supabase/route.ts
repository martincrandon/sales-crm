import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl, supabasePublicConfig } from "./env";

export function createSupabaseRouteClient(request: NextRequest) {
  const config = supabasePublicConfig();
  if (!config) throw new Error("Supabase URL and publishable key are required.");

  const response = createRedirectResponse(request);
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return {
    supabase,
    redirect(
      path:
        | "/"
        | "/update-password"
        | "/login?status=auth"
        | "/login?status=access",
    ) {
      response.headers.set("location", new URL(path, getSiteUrl()).toString());
      return response;
    },
  };
}

function createRedirectResponse(request: NextRequest): NextResponse {
  try {
    return NextResponse.redirect(new URL("/login?status=auth", getSiteUrl()));
  } catch {
    return NextResponse.redirect(new URL("/login?status=config", request.url));
  }
}
