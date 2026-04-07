"use client";

import { LogOut, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";

export function Header({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initial = profile?.full_name?.[0]?.toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30 glass border-b border-border safe-area-top">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <Sparkles size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none tracking-tight">GITEX Tracker</h1>
            <p className="text-[11px] text-text-muted mt-0.5">Compucom Morocco</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-semibold text-sm">
              {initial}
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-danger hover:bg-surface-2 transition-all"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
