"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Modal } from "@/components/ui/modal";
import {
  UtensilsCrossed,
  UserPlus,
  Check,
  X,
  HelpCircle,
  Users,
  Search,
  Calendar,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Dinner {
  id: string;
  day: string;
  date: string;
  restaurant: string;
}

interface Guest {
  id: string;
  contact_id: string;
  invited_by: string;
  confirmation: "oui" | "non" | "peut_etre";
  contact_name: string;
  account_name?: string;
  invited_by_name?: string;
}

interface ContactSuggestion {
  id: string;
  name: string;
  account_name?: string;
}

export default function DinnersPage() {
  const { profile, isAdmin } = useProfile();
  const supabase = createClient();
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [guests, setGuests] = useState<Record<string, Guest[]>>({});
  const [openDinner, setOpenDinner] = useState<Dinner | null>(null);

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [confirmation, setConfirmation] = useState<"oui" | "non" | "peut_etre">("peut_etre");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function loadAll() {
    if (!profile) return;
    const { data: ds } = await supabase
      .from("dinners")
      .select("id, day, date, restaurant")
      .order("date");
    setDinners(ds || []);

    const { data: gs } = await supabase
      .from("dinner_guests")
      .select(
        "id, contact_id, invited_by, confirmation, dinner_id, contacts(first_name, last_name, accounts(name)), profiles!invited_by(full_name)"
      );

    const grouped: Record<string, Guest[]> = {};
    (gs || []).forEach((g: any) => {
      const key = g.dinner_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: g.id,
        contact_id: g.contact_id,
        invited_by: g.invited_by,
        confirmation: g.confirmation,
        contact_name: g.contacts ? `${g.contacts.first_name} ${g.contacts.last_name}` : "—",
        account_name: g.contacts?.accounts?.name,
        invited_by_name: g.profiles?.full_name,
      });
    });
    setGuests(grouped);
  }

  useEffect(() => {
    if (!search || search.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, accounts(name)")
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .limit(8);
      setSuggestions(
        (data || []).map((c: any) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          account_name: c.accounts?.name,
        }))
      );
    }, 200);
    return () => clearTimeout(t);
  }, [search, supabase]);

  const addGuest = async (contactId: string) => {
    if (!openDinner || !profile) return;
    setAdding(true);
    await supabase.from("dinner_guests").insert({
      dinner_id: openDinner.id,
      contact_id: contactId,
      invited_by: profile.id,
      confirmation,
    });
    setSearch("");
    setSuggestions([]);
    setConfirmation("peut_etre");
    await loadAll();
    setAdding(false);
  };

  const removeGuest = async (guestId: string) => {
    await supabase.from("dinner_guests").delete().eq("id", guestId);
    await loadAll();
  };

  const stats = useMemo(() => {
    const s: Record<
      string,
      { total: number; oui: number; non: number; peut_etre: number; bySales: Record<string, number> }
    > = {};
    dinners.forEach((d) => {
      const list = guests[d.id] || [];
      const bySales: Record<string, number> = {};
      list.forEach((g) => {
        const k = g.invited_by_name || "?";
        bySales[k] = (bySales[k] || 0) + 1;
      });
      s[d.id] = {
        total: list.length,
        oui: list.filter((g) => g.confirmation === "oui").length,
        non: list.filter((g) => g.confirmation === "non").length,
        peut_etre: list.filter((g) => g.confirmation === "peut_etre").length,
        bySales,
      };
    });
    return s;
  }, [dinners, guests]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dinners</h1>
        <p className="text-text-muted text-sm">Vue d&apos;ensemble des invitations</p>
      </div>

      <div className="space-y-3">
        {dinners.map((d) => {
          const stat = stats[d.id] || { total: 0, oui: 0, non: 0, peut_etre: 0, bySales: {} };
          return (
            <div
              key={d.id}
              className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm card-hover"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{d.restaurant}</h3>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Calendar size={11} /> {d.day} {formatDate(d.date)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenDinner(d)}
                    className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-all"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <Stat label="Invités" value={stat.total} icon={Users} />
                  <Stat label="Oui" value={stat.oui} icon={Check} color="text-success" />
                  <Stat label="Peut-être" value={stat.peut_etre} icon={HelpCircle} color="text-warning" />
                  <Stat label="Non" value={stat.non} icon={X} color="text-danger" />
                </div>

                {isAdmin && Object.keys(stat.bySales).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border">
                    {Object.entries(stat.bySales).map(([sales, count]) => (
                      <span
                        key={sales}
                        className="text-[10px] px-2 py-1 bg-surface-2 rounded-lg text-text-muted"
                      >
                        {sales} <span className="text-text font-medium">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {(guests[d.id] || []).length > 0 && (
                <details className="border-t border-border">
                  <summary className="px-4 py-2.5 text-xs text-text-muted cursor-pointer hover:bg-surface-2 transition-colors select-none">
                    Voir les {(guests[d.id] || []).length} invités
                  </summary>
                  <div className="px-4 pb-3 space-y-1.5">
                    {(guests[d.id] || []).map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-surface-2"
                      >
                        <ConfBadge c={g.confirmation} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{g.contact_name}</div>
                          {g.account_name && (
                            <div className="text-[11px] text-text-muted truncate">
                              {g.account_name}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <span className="text-[10px] text-text-muted hidden sm:inline">
                            par {g.invited_by_name?.split(" ")[0]}
                          </span>
                        )}
                        {(isAdmin || g.invited_by === profile?.id) && (
                          <button
                            onClick={() => removeGuest(g.id)}
                            className="text-text-muted hover:text-danger p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!openDinner}
        onClose={() => setOpenDinner(null)}
        title={`Inviter à ${openDinner?.restaurant || ""}`}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un contact..."
              autoFocus
              className="pl-9"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
              Statut
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "oui" as const, label: "Oui", color: "border-success/30 bg-success/5 text-success" },
                { v: "peut_etre" as const, label: "Peut-être", color: "border-warning/30 bg-warning/5 text-warning" },
                { v: "non" as const, label: "Non", color: "border-danger/30 bg-danger/5 text-danger" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setConfirmation(opt.v)}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                    confirmation === opt.v
                      ? opt.color
                      : "border-border bg-surface-2 hover:border-border-strong text-text-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addGuest(s.id)}
                  disabled={adding}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors flex items-center justify-between disabled:opacity-50"
                >
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    {s.account_name && (
                      <div className="text-xs text-text-muted">{s.account_name}</div>
                    )}
                  </div>
                  <UserPlus size={14} className="text-primary" />
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && suggestions.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">
              Aucun contact trouvé. Crée-le d&apos;abord depuis Capture.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color = "text-text",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  color?: string;
}) {
  return (
    <div className="bg-surface-2 rounded-xl px-2 py-2 text-center">
      <div className={cn("flex items-center justify-center gap-1", color)}>
        <Icon size={12} />
        <span className="font-semibold text-base tabular-nums">{value}</span>
      </div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}

function ConfBadge({ c }: { c: "oui" | "non" | "peut_etre" }) {
  const map = {
    oui: { icon: Check, color: "bg-success/15 text-success" },
    non: { icon: X, color: "bg-danger/15 text-danger" },
    peut_etre: { icon: HelpCircle, color: "bg-warning/15 text-warning" },
  };
  const { icon: Icon, color } = map[c];
  return (
    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
      <Icon size={12} />
    </div>
  );
}
