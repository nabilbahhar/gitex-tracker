"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, AlertTriangle } from "lucide-react";
import type { Account } from "@/lib/types";

interface AccountWithMeta extends Account {
  assigned_name?: string;
  contact_count?: number;
}

export default function AccountsPage() {
  const router = useRouter();
  const { profile, loading: profileLoading, isAdmin } = useProfile();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<AccountWithMeta[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Fetch accounts
  async function fetchAccounts() {
    setLoading(true);

    // Fetch all accounts with assigned profile name + contact count
    let query = supabase
      .from("accounts")
      .select("*, profiles!assigned_to(full_name), contacts(count)")
      .order("created_at", { ascending: false });

    if (!isAdmin && profile) {
      query = query.eq("assigned_to", profile.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching accounts:", error);
      setLoading(false);
      return;
    }

    const mapped: AccountWithMeta[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sector: row.sector,
      assigned_to: row.assigned_to,
      created_at: row.created_at,
      assigned_name: row.profiles?.full_name ?? "—",
      contact_count: row.contacts?.[0]?.count ?? 0,
    }));

    setAccounts(mapped);
    setLoading(false);
  }

  // Fetch ALL accounts for duplicate check (regardless of role)
  async function fetchAllAccounts() {
    const { data } = await supabase
      .from("accounts")
      .select("id, name, assigned_to, profiles!assigned_to(full_name)");

    const mapped: AccountWithMeta[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sector: undefined,
      assigned_to: row.assigned_to,
      created_at: "",
      assigned_name: row.profiles?.full_name ?? "—",
    }));

    setAllAccounts(mapped);
  }

  useEffect(() => {
    if (!profileLoading && profile) {
      fetchAccounts();
      fetchAllAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, profile, isAdmin]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.sector?.toLowerCase().includes(q) ||
        a.assigned_name?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  // Duplicate check on name change
  useEffect(() => {
    if (!newName.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const match = allAccounts.find(
      (a) =>
        a.name.toLowerCase() === newName.trim().toLowerCase() &&
        a.assigned_to !== profile?.id
    );
    if (match) {
      setDuplicateWarning(match.assigned_name ?? "un autre commercial");
    } else {
      setDuplicateWarning(null);
    }
  }, [newName, allAccounts, profile]);

  // Add account
  async function handleAdd() {
    if (!newName.trim() || !profile) return;
    setSaving(true);

    const { error } = await supabase.from("accounts").insert({
      name: newName.trim(),
      sector: newSector.trim() || null,
      assigned_to: profile.id,
    });

    if (error) {
      console.error("Error adding account:", error);
      setSaving(false);
      return;
    }

    setNewName("");
    setNewSector("");
    setDuplicateWarning(null);
    setModalOpen(false);
    setSaving(false);
    fetchAccounts();
    fetchAllAccounts();
  }

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 size={26} />
            Comptes
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {filtered.length} compte{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="lg" onClick={() => setModalOpen(true)}>
          <Plus size={20} />
          Ajouter
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Rechercher un compte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3.5 text-base placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Account list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Building2 size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Aucun compte trouv&eacute;</p>
          <p className="text-sm mt-1">
            {search
              ? "Essayez un autre terme de recherche"
              : "Ajoutez votre premier compte"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((account) => (
            <Card
              key={account.id}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => router.push(`/accounts/${account.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {account.name}
                  </h3>
                  {account.sector && (
                    <Badge variant="autre" className="mt-1.5">
                      {account.sector}
                    </Badge>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-sm text-text-muted">
                    <span>
                      {account.contact_count ?? 0} contact
                      {(account.contact_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {isAdmin && (
                      <span className="truncate">
                        Assign&eacute; &agrave; {account.assigned_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add account modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setNewName("");
          setNewSector("");
          setDuplicateWarning(null);
        }}
        title="Nouveau compte"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nom du compte <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Acme Corp"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-base placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              autoFocus
            />
            {duplicateWarning && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-400">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>
                  Ce compte est d&eacute;j&agrave; chez{" "}
                  <strong>{duplicateWarning}</strong>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Secteur{" "}
              <span className="text-text-muted font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Technologie, Finance..."
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-base placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <Button
            size="lg"
            className="w-full mt-2"
            onClick={handleAdd}
            loading={saving}
            disabled={!newName.trim()}
          >
            <Plus size={20} />
            Ajouter le compte
          </Button>
        </div>
      </Modal>
    </div>
  );
}
