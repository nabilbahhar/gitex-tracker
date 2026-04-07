import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Use forwarded host (behind reverse proxy like Coolify/Traefik)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure profile exists
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        const ADMIN_EMAILS = ["a.lahkim@compucom.ma", "n.bahhar@compucom.ma"];
        const isAdmin = ADMIN_EMAILS.includes(user.email || "");

        if (!profile) {
          await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: user.email?.split("@")[0] || "User",
            role: isAdmin ? "admin" : "sales",
          });
        } else if (isAdmin) {
          // Ensure existing admin profiles stay admin
          await supabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("id", user.id);
        }
      }
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
