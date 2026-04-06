"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import type { DinnerEvent, DinnerGuest, Contact } from "@/lib/types";
import {
  UtensilsCrossed,
  Plus,
  UserPlus,
  Check,
  X,
  HelpCircle,
} from "lucide-react";

const HARDCODED_DINNERS: Omit<DinnerEvent, "id">[] = [
  {
    day: "Lundi",
    date: "2025-04-07",
    restaurant: "Libre",
    menu_type: "libre",
    notes: "Chacun invite qui il veut",
  },
  {
    day: "Mardi",
    date: "2025-04-08",
    restaurant: "Brahim Pacha",
    menu_type: "fixe",
    notes: "Menu fixe",
  },
  {
    day: "Mercredi",
    date: "2025-04-09",
    restaurant: "Malak Emrode",
    menu_type: "fixe",
    notes: "Menu fixe",
  },
  {
    day: "Jeudi",
    date: "2025-04-10",
    restaurant: "A definir",
    menu_type: "libre",
    notes: "",
  },
];

function formatDateFr(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

const confirmationLabels: Record<string, string> = {
  oui: "Confirme",
  non: "Decline",
  peut_etre: "Peut-etre",
};

const confirmationIcons: Record<string, typeof Check> = {
  oui: Check,
  non: X,
  peut_etre: HelpCircle,
};

export default function DinnersPage() {
  const { profile, isAdmin, loading: profileLoading } = useProfile();
  const [dinners, setDinners] = useState<DinnerEvent[]>([]);
  const [guests, setGuests] = useState<DinnerGuest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDinnerId, setActiveDinnerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"oui" | "non" | "peut_etre">("oui");
  const [submitting, setSubmitting] = useState(false);

  // Sales list for admin grouping
  const [salesList, setSalesList] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function loadData() {
    const supabase = createClient();
    setLoading(true);

    // Load dinners
    const { data: dinnerData } = await supabase
      .from("dinners")
      .select("*")
      .order("date", { ascending: true });

    const loadedDinners: DinnerEvent[] =
      dinnerData && dinnerData.length > 0
        ? dinnerData
        : HARDCODED_DINNERS.map((d, i) => ({ ...d, id: `fallback-${i}` }));

    setDinners(loadedDinners);

    // Load guests with contact and profile info
    const dinnerIds = loadedDinners
      .filter((d) => !d.id.startsWith("fallback-"))
      .map((d) => d.id);

    if (dinnerIds.length > 0) {
      const { data: guestData } = await supabase
        .from("dinner_guests")
        .select(
          "*, contacts(first_name, last_name, account_id, accounts(name)), profiles:invited_by(full_name)"
        )
        .in("dinner_id", dinnerIds);

      const mapped: DinnerGuest[] = (guestData || []).map((g: any) => ({
        id: g.id,
        dinner_id: g.dinner_id,
        contact_id: g.contact_id,
        contact_name: g.contacts
          ? `${g.contacts.first_name} ${g.contacts.last_name}`
          : "—",
        account_name: g.contacts?.accounts?.name || "—",
        invited_by: g.invited_by,
        invited_by_name: g.profiles?.full_name || "—",
        confirmation: g.confirmation,
        created_at: g.created_at,
      }));

      // Filter for sales: only see their own guests
      if (isAdmin) {
        setGuests(mapped);
      } else {
        setGuests(mapped.filter((g) => g.invited_by === profile!.id));
      }
    } else {
      setGuests([]);
    }

    // Load contacts for autocomplete
    let contactsQ = supabase
      .from("contacts")
      .select("*, accounts(name)")
      .order("first_name");
    if (!isAdmin) {
      contactsQ = contactsQ.eq("created_by", profile!.id);
    }
    const { data: contactData } = await contactsQ;
    setContacts(
      (contactData || []).map((c: any) => ({
        ...c,
        account_name: c.accounts?.name || "—",
      }))
    );

    // Sales list for admin view
    if (isAdmin) {
      const { data: sales } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      setSalesList(sales || []);
    }

    setLoading(false);
  }

  // Filtered contacts for search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts.slice(0, 10);
    const q = search.toLowerCase();
    return contacts
      .filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.account_name || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [contacts, search]);

  function openAddGuest(dinnerId: string) {
    setActiveDinnerId(dinnerId);
    setSearch("");
    setSelectedContactId(null);
    setConfirmation("oui");
    setModalOpen(true);
  }

  async function handleAddGuest() {
    if (!selectedContactId || !activeDinnerId || !profile) return;
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("dinner_guests").insert({
      dinner_id: activeDinnerId,
      contact_id: selectedContactId,
      invited_by: profile.id,
      confirmation,
    });

    if (!error) {
      setModalOpen(false);
      await loadData();
    }
    setSubmitting(false);
  }

  function guestsForDinner(dinnerId: string) {
    return guests.filter((g) => g.dinner_id === dinnerId);
  }

  // Group guests by sales for admin
  function guestsBySales(dinnerGuests: DinnerGuest[]) {
    const grouped: Record<string, { name: string; guests: DinnerGuest[] }> = {};
    for (const g of dinnerGuests) {
      if (!grouped[g.invited_by]) {
        grouped[g.invited_by] = {
          name: g.invited_by_name || "—",
          guests: [],
        };
      }
      grouped[g.invited_by].guests.push(g);
    }
    return Object.values(grouped);
  }

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <UtensilsCrossed size={24} className="text-warning" />
        <div>
          <h1 className="text-xl font-bold">Dinners GITEX</h1>
          <p className="text-sm text-text-muted">
            Planning des diners — Semaine du 7 au 10 avril
          </p>
        </div>
      </div>

      {/* Dinner Cards */}
      <div className="space-y-4">
        {dinners.map((dinner) => {
          const dinnerGuests = guestsForDinner(dinner.id);
          const isFallback = dinner.id.startsWith("fallback-");

          return (
            <Card key={dinner.id} className="p-0 overflow-hidden">
              {/* Card Header */}
              <div className="bg-surface-2 px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">
                      {dinner.day} {formatDateFr(dinner.date)}
                    </h2>
                    <p className="text-text-muted text-sm flex items-center gap-2">
                      <UtensilsCrossed size={14} />
                      {dinner.restaurant}
                      {dinner.notes && (
                        <span className="text-xs opacity-70">
                          — {dinner.notes}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">
                      {dinnerGuests.length}
                    </span>
                    <span className="text-xs text-text-muted">
                      invite{dinnerGuests.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest List */}
              <div className="px-5 py-3">
                {dinnerGuests.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-4">
                    Aucun invite pour le moment
                  </p>
                )}

                {/* Admin view: grouped by sales */}
                {isAdmin && dinnerGuests.length > 0 && (
                  <div className="space-y-4">
                    {guestsBySales(dinnerGuests).map((group) => (
                      <div key={group.name}>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                          {group.name}{" "}
                          <span className="text-primary">
                            ({group.guests.length})
                          </span>
                        </p>
                        <div className="space-y-2">
                          {group.guests.map((guest) => (
                            <GuestRow key={guest.id} guest={guest} showInviter={false} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sales view: flat list */}
                {!isAdmin && dinnerGuests.length > 0 && (
                  <div className="space-y-2">
                    {dinnerGuests.map((guest) => (
                      <GuestRow key={guest.id} guest={guest} showInviter={false} />
                    ))}
                  </div>
                )}
              </div>

              {/* Add Guest Button */}
              {!isFallback && (
                <div className="px-5 pb-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => openAddGuest(dinner.id)}
                  >
                    <UserPlus size={20} />
                    Ajouter un invite
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Guest Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un invite"
      >
        <div className="space-y-5">
          {/* Contact Search */}
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">
              Rechercher un contact
            </label>
            <input
              type="text"
              placeholder="Nom, prenom ou compte..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedContactId(null);
              }}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Contact Results */}
          {!selectedContactId && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredContacts.length === 0 && (
                <p className="text-text-muted text-sm text-center py-3">
                  Aucun contact trouve
                </p>
              )}
              {filteredContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedContactId(c.id);
                    setSearch(`${c.first_name} ${c.last_name}`);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-surface-2 active:bg-border transition-colors cursor-pointer"
                >
                  <p className="font-medium">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {c.account_name}
                    {c.job_title && ` — ${c.job_title}`}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Selected Contact */}
          {selectedContactId && (
            <div className="bg-surface-2 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{search}</p>
                <p className="text-xs text-text-muted">Contact selectionne</p>
              </div>
              <button
                onClick={() => {
                  setSelectedContactId(null);
                  setSearch("");
                }}
                className="p-2 hover:bg-border rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Confirmation Buttons */}
          <div>
            <label className="text-sm font-medium text-text-muted mb-3 block">
              Confirmation
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setConfirmation("oui")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  confirmation === "oui"
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-border bg-surface-2 text-text-muted hover:border-green-500/50"
                }`}
              >
                <Check size={24} />
                <span className="text-sm font-semibold">Oui</span>
              </button>
              <button
                onClick={() => setConfirmation("peut_etre")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  confirmation === "peut_etre"
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                    : "border-border bg-surface-2 text-text-muted hover:border-yellow-500/50"
                }`}
              >
                <HelpCircle size={24} />
                <span className="text-sm font-semibold">Peut-etre</span>
              </button>
              <button
                onClick={() => setConfirmation("non")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  confirmation === "non"
                    ? "border-red-500 bg-red-500/10 text-red-400"
                    : "border-border bg-surface-2 text-text-muted hover:border-red-500/50"
                }`}
              >
                <X size={24} />
                <span className="text-sm font-semibold">Non</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!selectedContactId}
            loading={submitting}
            onClick={handleAddGuest}
          >
            <Plus size={20} />
            Ajouter cet invite
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* --- Guest Row Component --- */
function GuestRow({
  guest,
  showInviter,
}: {
  guest: DinnerGuest;
  showInviter: boolean;
}) {
  const Icon = confirmationIcons[guest.confirmation] || HelpCircle;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface-2/50">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{guest.contact_name}</p>
        <p className="text-xs text-text-muted truncate">
          {guest.account_name}
          {showInviter && guest.invited_by_name && (
            <span> — invite par {guest.invited_by_name}</span>
          )}
        </p>
      </div>
      <Badge variant={guest.confirmation}>
        <Icon size={12} className="mr-1" />
        {confirmationLabels[guest.confirmation] || guest.confirmation}
      </Badge>
    </div>
  );
}
