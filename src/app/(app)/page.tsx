"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import {
  Building2,
  User,
  Phone,
  Mail,
  MessageSquare,
  Camera,
  Check,
  Search,
  Plus,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountSuggestion {
  id: string;
  name: string;
  city?: string;
  assigned_email?: string;
}

export default function QuickAddPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const supabase = createClient();

  // Account
  const [accountQuery, setAccountQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactJob, setContactJob] = useState("");

  // Note
  const [notes, setNotes] = useState("");
  const [heat, setHeat] = useState<1 | 2 | 3>(2);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Search accounts as user types
  useEffect(() => {
    if (!accountQuery || accountQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, name, city, assigned_email")
        .ilike("name", `%${accountQuery}%`)
        .limit(8);
      setSuggestions(data || []);
    }, 150);
    return () => clearTimeout(t);
  }, [accountQuery, supabase]);

  const selectAccount = (acc: AccountSuggestion) => {
    setSelectedAccount(acc);
    setAccountQuery(acc.name);
    setShowSuggestions(false);
    if (acc.assigned_email && acc.assigned_email !== profile?.email) {
      setDuplicateWarning(`⚠️ Compte déjà attribué à ${acc.assigned_email.split("@")[0]}`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const clearAccount = () => {
    setSelectedAccount(null);
    setAccountQuery("");
    setDuplicateWarning(null);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhoto(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const canSave = useMemo(() => {
    return (selectedAccount || accountQuery.trim()) && (contactName.trim() || notes.trim());
  }, [selectedAccount, accountQuery, contactName, notes]);

  const handleSave = async () => {
    if (!canSave || !profile) return;
    setSaving(true);

    try {
      // 1. Account
      let accountId = selectedAccount?.id;
      if (!accountId) {
        const { data: acc, error: accErr } = await supabase
          .from("accounts")
          .insert({
            name: accountQuery.trim(),
            assigned_to: profile.id,
            assigned_email: profile.email,
          })
          .select("id")
          .single();
        if (accErr) throw accErr;
        accountId = acc.id;
      }

      // 2. Photo upload
      let photoUrl: string | null = null;
      if (photo) {
        const filename = `${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: up, error: upErr } = await supabase.storage
          .from("photos")
          .upload(`quick/${filename}`, photo);
        if (!upErr && up) {
          const { data: url } = supabase.storage.from("photos").getPublicUrl(up.path);
          photoUrl = url.publicUrl;
        }
      }

      // 3. Contact (if name provided)
      let contactId: string | null = null;
      if (contactName.trim()) {
        const parts = contactName.trim().split(" ");
        const firstName = parts[0];
        const lastName = parts.slice(1).join(" ") || "";
        const { data: ct } = await supabase
          .from("contacts")
          .insert({
            account_id: accountId,
            first_name: firstName,
            last_name: lastName,
            job_title: contactJob.trim() || null,
            email: contactEmail.trim() || null,
            phone: contactPhone.trim() || null,
            photo_url: photoUrl,
            tag: "prospect",
            created_by: profile.id,
          })
          .select("id")
          .single();
        contactId = ct?.id || null;
      }

      // 4. Interaction
      await supabase.from("interactions").insert({
        account_id: accountId,
        type: "rencontre",
        date: new Date().toISOString(),
        notes: notes.trim() || null,
        photos: photoUrl ? [photoUrl] : [],
        status: "a_suivre",
        heat_score: heat,
        created_by: profile.id,
      });

      setSaved(true);
      setTimeout(() => {
        // Reset
        setAccountQuery("");
        setSelectedAccount(null);
        setContactName("");
        setContactPhone("");
        setContactEmail("");
        setContactJob("");
        setNotes("");
        setHeat(2);
        setPhoto(null);
        setPhotoPreview(null);
        setSaved(false);
        setDuplicateWarning(null);
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-success/15 text-success flex items-center justify-center mb-4">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-xl font-bold">Enregistré !</h2>
        <p className="text-text-muted text-sm mt-1">Prêt pour le suivant</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capture rapide</h1>
        <p className="text-text-muted text-sm">Prends note en 1 shot</p>
      </div>

      {/* ACCOUNT */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          <Building2 size={14} /> Compte / Entreprise
        </label>
        <div className="relative">
          {selectedAccount ? (
            <div className="flex items-center gap-2 bg-primary-soft border border-primary/30 rounded-xl px-3 py-3">
              <Building2 size={16} className="text-primary" />
              <span className="font-medium flex-1">{selectedAccount.name}</span>
              {selectedAccount.city && (
                <span className="text-xs text-text-muted">{selectedAccount.city}</span>
              )}
              <button
                onClick={clearAccount}
                className="text-text-muted hover:text-danger text-xs"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={accountQuery}
                  onChange={(e) => {
                    setAccountQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Tape le nom du compte..."
                  className="pl-9 text-base"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-64 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectAccount(s)}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-2 transition-colors flex items-center justify-between border-b border-border last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        {s.city && <div className="text-xs text-text-muted">{s.city}</div>}
                      </div>
                      {s.assigned_email && (
                        <div className="text-[10px] text-text-muted">
                          {s.assigned_email.split("@")[0]}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {duplicateWarning && (
          <div className="mt-2 flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}
        {accountQuery && !selectedAccount && suggestions.length === 0 && accountQuery.length > 2 && (
          <div className="mt-2 text-xs text-text-muted flex items-center gap-1">
            <Plus size={12} /> Sera créé : <span className="font-medium text-text">{accountQuery}</span>
          </div>
        )}
      </div>

      {/* CONTACT */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          <User size={14} /> Personne rencontrée
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Nom Prénom"
            className="text-base"
          />
          <input
            type="text"
            value={contactJob}
            onChange={(e) => setContactJob(e.target.value)}
            placeholder="Fonction (optionnel)"
            className="text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Téléphone"
                className="pl-9 text-sm"
              />
            </div>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Email"
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* NOTE */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          <MessageSquare size={14} /> Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ce qu'on a discuté, besoins, projets, prochaine action..."
          rows={4}
          className="text-base resize-none"
        />

        {/* Heat */}
        <div className="mt-3">
          <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-2">
            Température
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 1 as const, label: "Froid", emoji: "🟢", color: "border-blue-500/30 bg-blue-500/5" },
              { v: 2 as const, label: "Tiède", emoji: "🟡", color: "border-yellow-500/30 bg-yellow-500/5" },
              { v: 3 as const, label: "Chaud", emoji: "🔥", color: "border-red-500/30 bg-red-500/5" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setHeat(opt.v)}
                className={cn(
                  "py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  heat === opt.v
                    ? `${opt.color} scale-[1.02]`
                    : "border-border bg-surface-2 hover:border-border-strong"
                )}
              >
                <div className="text-lg">{opt.emoji}</div>
                <div className="text-xs mt-0.5">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PHOTO */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          <Camera size={14} /> Photo (optionnel)
        </label>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="" className="w-full h-48 object-cover rounded-xl" />
            <button
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
              }}
              className="absolute top-2 right-2 bg-bg/80 backdrop-blur text-text px-3 py-1 rounded-lg text-xs"
            >
              Retirer
            </button>
          </div>
        ) : (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-all"
          >
            <Camera size={28} />
            <span className="text-sm mt-1">Prendre une photo</span>
          </button>
        )}
      </div>

      {/* SAVE BUTTON */}
      <Button
        onClick={handleSave}
        disabled={!canSave}
        loading={saving}
        size="lg"
        className="w-full sticky bottom-24"
      >
        <Check size={20} />
        Enregistrer
      </Button>
    </div>
  );
}
