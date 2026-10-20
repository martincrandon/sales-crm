import { NextResponse, type NextRequest } from "next/server";
import { isApprovedUser, safeAuthDestination } from "@/lib/auth";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeAuthDestination(
    request.nextUrl.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(new URL("/login?status=auth", request.url));
  }

  try {
    const { supabase, redirect } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect("/login?status=auth");

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !isApprovedUser(data.user)) {
      await supabase.auth.signOut();
      return redirect("/login?status=access");
    }

    return redirect(destination);
  } catch {
    return NextResponse.redirect(new URL("/login?status=auth", request.url));
  }
}
