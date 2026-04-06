"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Building2,
  Users,
  MessageSquare,
  UtensilsCrossed,
  Plus,
  TrendingUp,
  Flame,
} from "lucide-react";

interface Stats {
  accounts: number;
  contacts: number;
  interactions: number;
  todayInteractions: number;
}

interface RecentActivity {
  id: string;
  type: string;
  notes: string;
  account_name: string;
  created_at: string;
  heat_score: number;
}

export default function DashboardPage() {
  const { profile, isAdmin } = useProfile();
  const [stats, setStats] = useState<Stats>({ accounts: 0, contacts: 0, interactions: 0, todayInteractions: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [salesList, setSalesList] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, salesFilter]);

  async function loadData() {
    const supabase = createClient();
    const userId = salesFilter === "all" ? null : salesFilter;
    const filterBy = isAdmin && !userId ? null : userId || profile!.id;

    // Accounts count
    let accountsQ = supabase.from("accounts").select("id", { count: "exact", head: true });
    if (filterBy) accountsQ = accountsQ.eq("assigned_to", filterBy);
    const { count: accountsCount } = await accountsQ;

    // Contacts count
    let contactsQ = supabase.from("contacts").select("id", { count: "exact", head: true });
    if (filterBy) contactsQ = contactsQ.eq("created_by", filterBy);
    const { count: contactsCount } = await contactsQ;

    // Interactions count
    let interQ = supabase.from("interactions").select("id", { count: "exact", head: true });
    if (filterBy) interQ = interQ.eq("created_by", filterBy);
    const { count: interCount } = await interQ;

    // Today interactions
    const today = new Date().toISOString().split("T")[0];
    let todayQ = supabase
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today);
    if (filterBy) todayQ = todayQ.eq("created_by", filterBy);
    const { count: todayCount } = await todayQ;

    setStats({
      accounts: accountsCount || 0,
      contacts: contactsCount || 0,
      interactions: interCount || 0,
      todayInteractions: todayCount || 0,
    });

    // Recent activity
    let recentQ = supabase
      .from("interactions")
      .select("id, type, notes, created_at, heat_score, accounts(name)")
      .order("created_at", { ascending: false })
      .limit(10);
    if (filterBy) recentQ = recentQ.eq("created_by", filterBy);
    const { data: recent } = await recentQ;

    setRecentActivity(
      (recent || []).map((r: any) => ({
        ...r,
        account_name: r.accounts?.name || "—",
      }))
    );

    // Sales list for admin filter
    if (isAdmin) {
      const { data: sales } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      setSalesList(sales || []);
    }
  }

  const statCards = [
    { label: "Comptes", value: stats.accounts, icon: Building2, href: "/accounts", color: "text-primary" },
    { label: "Contacts", value: stats.contacts, icon: Users, href: "/contacts", color: "text-accent" },
    { label: "Interactions", value: stats.interactions, icon: MessageSquare, href: "/interactions", color: "text-warning" },
    { label: "Aujourd'hui", value: stats.todayInteractions, icon: TrendingUp, href: "/interactions", color: "text-success" },
  ];

  const heatIcons = ["", "🟢", "🟡", "🔥"];
  const typeLabels: Record<string, string> = {
    visite_stand: "Visite stand",
    meeting: "Meeting",
    rencontre: "Rencontre",
    dinner: "Dinner",
    soiree: "Soirée",
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold">
          {isAdmin ? "Dashboard Admin" : `Salut ${profile?.full_name?.split(" ")[0]} 👋`}
        </h2>
        <p className="text-text-muted text-sm">GITEX Africa 2026 — Marrakech</p>
      </div>

      {/* Admin filter */}
      {isAdmin && salesList.length > 0 && (
        <select
          value={salesFilter}
          onChange={(e) => setSalesFilter(e.target.value)}
          className="text-sm"
        >
          <option value="all">Tous les commerciaux</option>
          {salesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <s.icon size={20} className={s.color} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-text-muted">{s.label}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/interactions?new=true">
          <Button variant="primary" size="lg" className="w-full">
            <Plus size={20} />
            Nouvelle note
          </Button>
        </Link>
        <Link href="/contacts?new=true">
          <Button variant="secondary" size="lg" className="w-full">
            <Users size={20} />
            Nouveau contact
          </Button>
        </Link>
      </div>

      {/* Dinners Today */}
      <Link href="/dinners">
        <Card className="border-warning/30 hover:border-warning/50 transition-colors">
          <div className="flex items-center gap-3">
            <UtensilsCrossed size={20} className="text-warning" />
            <div>
              <p className="font-semibold">Dinners ce soir</p>
              <p className="text-sm text-text-muted">Voir le planning</p>
            </div>
          </div>
        </Card>
      </Link>

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          Activité récente
        </h3>
        <div className="space-y-2">
          {recentActivity.length === 0 && (
            <Card>
              <p className="text-text-muted text-center py-4">
                Aucune activité pour le moment
              </p>
            </Card>
          )}
          {recentActivity.map((a) => (
            <Link key={a.id} href={`/interactions/${a.id}`}>
              <Card className="hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{heatIcons[a.heat_score]}</span>
                      <span className="font-medium text-sm truncate">
                        {a.account_name}
                      </span>
                      <Badge variant={a.type === "dinner" ? "oui" : "en_cours"}>
                        {typeLabels[a.type] || a.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted truncate">
                      {a.notes || "Pas de notes"}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-2">
                    {formatDate(a.created_at)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
