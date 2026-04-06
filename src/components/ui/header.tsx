"use client";

import { LogOut, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

export function Header({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">GITEX Tracker</h1>
            <p className="text-[10px] text-text-muted">Compucom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role === "admin" && (
            <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-lg">
              <Shield size={12} />
              Admin
            </span>
          )}
          <span className="text-xs text-text-muted hidden sm:inline">
            {profile?.full_name}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-text-muted hover:text-danger"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
