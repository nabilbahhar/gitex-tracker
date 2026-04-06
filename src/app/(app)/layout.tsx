"use client";

import { Header } from "@/components/ui/header";
import { BottomNav } from "@/components/ui/nav";
import { useProfile } from "@/hooks/use-profile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header profile={profile} />
      <main className="max-w-3xl mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
