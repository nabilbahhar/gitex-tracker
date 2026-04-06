import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

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

        if (!profile) {
          const isAdmin = user.email === "achraf@compucom.ma";
          await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: user.email?.split("@")[0] || "User",
            role: isAdmin ? "admin" : "sales",
          });
        }
      }
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
