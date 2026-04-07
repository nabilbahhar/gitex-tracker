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
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border safe-area-bottom">
      <div className="max-w-3xl mx-auto flex items-center justify-around px-2 py-1.5">
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
                "relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-text-muted hover:text-text"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 bg-primary-soft rounded-xl -z-10" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
