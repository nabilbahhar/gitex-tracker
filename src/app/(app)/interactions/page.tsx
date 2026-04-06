"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Interaction } from "@/lib/types";
import {
  MessageSquare,
  Plus,
  Filter,
  Flame,
  MapPin,
  Camera,
  Search,
  X,
  Image as ImageIcon,
} from "lucide-react";

// ── Labels & Maps ──────────────────────────────────────────────

const TYPE_LABELS: Record<Interaction["type"], string> = {
  visite_stand: "Visite stand",
  meeting: "Meeting",
  rencontre: "Rencontre",
  dinner: "Dinner",
  soiree: "Soiree",
};

const TYPE_ICONS: Record<Interaction["type"], string> = {
  visite_stand: "🏢",
  meeting: "🤝",
  rencontre: "👋",
  dinner: "🍽️",
  soiree: "🎉",
};

const STATUS_LABELS: Record<Interaction["status"], string> = {
  a_suivre: "A suivre",
  en_cours: "En cours",
  termine: "Termine",
};

const HEAT_DISPLAY: Record<number, { icon: string; label: string }> = {
  1: { icon: "🟢", label: "Froid" },
  2: { icon: "🟡", label: "Tiede" },
  3: { icon: "🔥", label: "Chaud" },
};

// ── Component ──────────────────────────────────────────────────

export default function InteractionsPage() {
  const { profile, loading: profileLoading, isAdmin } = useProfile();
  const searchParams = useSearchParams();

  // Data
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [form, setForm] = useState({
    account_id: "",
    type: "" as Interaction["type"] | "",
    location: "",
    notes: "",
    heat_score: 2 as 1 | 2 | 3,
    status: "a_suivre" as Interaction["status"],
  });
  const [accountSearch, setAccountSearch] = useState("");
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-open modal from URL ─────────────────────────────────

  useEffect(() => {
    if (searchParams.get("new") === "true" && !profileLoading) {
      setModalOpen(true);
    }
  }, [searchParams, profileLoading]);

  // ── Load data ────────────────────────────────────────────────

  useEffect(() => {
    if (!profile) return;
    loadInteractions();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function loadInteractions() {
    const supabase = createClient();
    let query = supabase
      .from("interactions")
      .select("*, accounts(name)")
      .order("date", { ascending: false });

    if (!isAdmin) {
      query = query.eq("created_by", profile!.id);
    }

    const { data } = await query;

    setInteractions(
      (data || []).map((r: any) => ({
        ...r,
        account_name: r.accounts?.name || "---",
      }))
    );
    setLoading(false);
  }

  async function loadAccounts() {
    const supabase = createClient();
    let query = supabase.from("accounts").select("id, name").order("name");
    if (!isAdmin) {
      query = query.eq("assigned_to", profile!.id);
    }
    const { data } = await query;
    setAccounts(data || []);
  }

  // ── Filtered list ────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = interactions;
    if (filterType !== "all") {
      list = list.filter((i) => i.type === filterType);
    }
    if (filterDay) {
      list = list.filter((i) => i.date.startsWith(filterDay));
    }
    return list;
  }, [interactions, filterType, filterDay]);

  // ── Account autocomplete ─────────────────────────────────────

  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return accounts.slice(0, 10);
    const q = accountSearch.toLowerCase();
    return accounts.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 10);
  }, [accounts, accountSearch]);

  const selectedAccountName = useMemo(() => {
    if (!form.account_id) return "";
    return accounts.find((a) => a.id === form.account_id)?.name || "";
  }, [form.account_id, accounts]);

  // ── Photo handling ───────────────────────────────────────────

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotos((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Submit ───────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!profile || !form.account_id || !form.type || !form.notes.trim()) return;
    setSubmitting(true);

    try {
      const supabase = createClient();

      // Upload photos
      const photoUrls: string[] = [];
      for (const file of photos) {
        const ext = file.name.split(".").pop();
        const path = `interactions/${profile.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("photos")
            .getPublicUrl(path);
          photoUrls.push(urlData.publicUrl);
        }
      }

      // Insert interaction
      const { error } = await supabase.from("interactions").insert({
        account_id: form.account_id,
        type: form.type,
        date: new Date().toISOString(),
        location: form.location || null,
        notes: form.notes,
        photos: photoUrls,
        status: form.status,
        heat_score: form.heat_score,
        created_by: profile.id,
      });

      if (!error) {
        setModalOpen(false);
        resetForm();
        await loadInteractions();
      }
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, form, photos]);

  function resetForm() {
    setForm({
      account_id: "",
      type: "",
      location: "",
      notes: "",
      heat_score: 2,
      status: "a_suivre",
    });
    setAccountSearch("");
    setPhotos([]);
    setPhotoPreviews([]);
  }

  // ── Render ───────────────────────────────────────────────────

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={22} className="text-primary" />
            Interactions
          </h1>
          <p className="text-text-muted text-sm">
            {filtered.length} note{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={18} />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Type
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-text-muted hover:text-text"
                }`}
              >
                Tous
              </button>
              {(Object.keys(TYPE_LABELS) as Interaction["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterType === t
                      ? "bg-primary text-white"
                      : "bg-surface-2 text-text-muted hover:text-text"
                  }`}
                >
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Jour
            </label>
            <input
              type="date"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="mt-1 w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {filterDay && (
              <button
                onClick={() => setFilterDay("")}
                className="text-xs text-primary mt-1"
              >
                Effacer le filtre date
              </button>
            )}
          </div>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <MessageSquare size={40} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-text-muted">Aucune interaction</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setModalOpen(true)}
              >
                <Plus size={16} />
                Ajouter une note
              </Button>
            </div>
          </Card>
        )}

        {filtered.map((interaction) => (
          <Card
            key={interaction.id}
            className="hover:border-primary/30 transition-colors active:scale-[0.98]"
          >
            {/* Top row: account + heat */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-lg">
                  {HEAT_DISPLAY[interaction.heat_score]?.icon}
                </span>
                <span className="font-semibold text-sm truncate">
                  {interaction.account_name}
                </span>
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap ml-2">
                {formatDate(interaction.date)}
              </span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge variant={interaction.type === "meeting" ? "en_cours" : "autre"}>
                {TYPE_ICONS[interaction.type]} {TYPE_LABELS[interaction.type]}
              </Badge>
              <Badge variant={interaction.status}>
                {STATUS_LABELS[interaction.status]}
              </Badge>
              <span className="text-xs text-text-muted">
                {HEAT_DISPLAY[interaction.heat_score]?.label}
              </span>
            </div>

            {/* Notes preview */}
            <p className="text-sm text-text-muted line-clamp-2">
              {interaction.notes || "Pas de notes"}
            </p>

            {/* Location + photos indicator */}
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              {interaction.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {interaction.location}
                </span>
              )}
              {interaction.photos && interaction.photos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Camera size={12} />
                  {interaction.photos.length} photo{interaction.photos.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* ── New Interaction Modal ──────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Nouvelle interaction"
        className="sm:max-w-xl"
      >
        <div className="space-y-5">
          {/* Account selector */}
          <div className="relative">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1 block">
              Compte *
            </label>
            {form.account_id ? (
              <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 py-3">
                <span className="flex-1 font-medium text-sm">
                  {selectedAccountName}
                </span>
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, account_id: "" }));
                    setAccountSearch("");
                  }}
                  className="p-1 hover:bg-border rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => {
                      setAccountSearch(e.target.value);
                      setShowAccountDropdown(true);
                    }}
                    onFocus={() => setShowAccountDropdown(true)}
                    placeholder="Rechercher un compte..."
                    className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                {showAccountDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredAccounts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-text-muted">
                        Aucun compte
                      </div>
                    ) : (
                      filteredAccounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setForm((f) => ({ ...f, account_id: account.id }));
                            setAccountSearch(account.name);
                            setShowAccountDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-surface-2 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                          {account.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
              Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABELS) as Interaction["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    form.type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface-2 text-text-muted hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl">{TYPE_ICONS[t]}</span>
                  <span className="text-xs">{TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1 block">
              <MapPin size={12} className="inline mr-1" />
              Lieu (optionnel)
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Ex: Stand H3-B12, Salle Atlas..."
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1 block">
              Notes *
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Compte-rendu de l'interaction, points cles, next steps..."
              rows={4}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Heat score */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
              <Flame size={12} className="inline mr-1" />
              Temperature
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((score) => (
                <button
                  key={score}
                  onClick={() => setForm((f) => ({ ...f, heat_score: score }))}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all min-h-[72px] ${
                    form.heat_score === score
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface-2 hover:border-primary/30"
                  }`}
                >
                  <span className="text-2xl">{HEAT_DISPLAY[score].icon}</span>
                  <span className="text-xs font-medium">
                    {HEAT_DISPLAY[score].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
              Statut
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STATUS_LABELS) as Interaction["status"][]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={`px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.status === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface-2 text-text-muted hover:border-primary/30"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
              <Camera size={12} className="inline mr-1" />
              Photos
            </label>

            {/* Preview grid */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
                    <img
                      src={preview}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={16} />
              Ajouter des photos
            </Button>
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!form.account_id || !form.type || !form.notes.trim()}
          >
            Enregistrer l'interaction
          </Button>
        </div>
      </Modal>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-24 right-5 z-40 bg-primary text-white w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
