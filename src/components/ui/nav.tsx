"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  UtensilsCrossed,
} from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/accounts", label: "Comptes", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/interactions", label: "Notes", icon: MessageSquare },
  { href: "/dinners", label: "Dinners", icon: UtensilsCrossed },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-text-muted hover:text-text"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
