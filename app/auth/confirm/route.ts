import { NextResponse, type NextRequest } from "next/server";
import { isApprovedUser } from "@/lib/auth";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "invite") {
    return NextResponse.redirect(new URL("/login?status=auth", request.url));
  }

  try {
    const { supabase, redirect } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });
    if (error) return redirect("/login?status=auth");

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !isApprovedUser(data.user)) {
      await supabase.auth.signOut();
      return redirect("/login?status=access");
    }

    return redirect("/update-password");
  } catch {
    return NextResponse.redirect(new URL("/login?status=auth", request.url));
  }
}
