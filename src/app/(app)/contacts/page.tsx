"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import type { Contact } from "@/lib/types";
import Link from "next/link";
import { Users, Plus, Search, Camera, User } from "lucide-react";

interface AccountOption {
  id: string;
  name: string;
}

const TAG_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "client", label: "Client" },
  { value: "partenaire", label: "Partenaire" },
  { value: "autre", label: "Autre" },
] as const;

const TAG_LABELS: Record<string, string> = {
  prospect: "Prospect",
  client: "Client",
  partenaire: "Partenaire",
  autre: "Autre",
};

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: profileLoading, isAdmin } = useProfile();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tag, setTag] = useState<Contact["tag"]>("prospect");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-open modal if ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setModalOpen(true);
    }
  }, [searchParams]);

  // Load contacts
  useEffect(() => {
    if (profileLoading || !profile) return;
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profileLoading]);

  // Load accounts for the selector
  useEffect(() => {
    if (!modalOpen || !profile) return;
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, profile]);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadContacts() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("contacts")
      .select("*, accounts(name)")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("created_by", profile!.id);
    }

    const { data } = await query;

    setContacts(
      (data || []).map((c: any) => ({
        ...c,
        account_name: c.accounts?.name || "—",
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

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  function resetForm() {
    setSelectedAccount(null);
    setAccountSearch("");
    setFirstName("");
    setLastName("");
    setJobTitle("");
    setEmail("");
    setPhone("");
    setLinkedin("");
    setTag("prospect");
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !selectedAccount || !firstName.trim() || !lastName.trim()) return;

    setSubmitting(true);
    const supabase = createClient();

    let photoUrl: string | null = null;

    // Upload photo if provided
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("photos")
        .upload(`contacts/${fileName}`, photoFile);

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(`contacts/${fileName}`);
        photoUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("contacts").insert({
      account_id: selectedAccount.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      job_title: jobTitle.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      linkedin: linkedin.trim() || null,
      photo_url: photoUrl,
      tag,
      created_by: profile.id,
    });

    setSubmitting(false);

    if (!error) {
      setModalOpen(false);
      resetForm();
      loadContacts();
      // Remove ?new=true from URL
      if (searchParams.get("new") === "true") {
        router.replace("/contacts");
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={22} className="text-accent" />
          <h1 className="text-xl font-bold">Contacts</h1>
        </div>
        <Button size="md" onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          Ajouter
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Rechercher un contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
        />
      </div>

      {/* Contacts list */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Chargement...</div>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <User size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">
              {search ? "Aucun contact trouvé" : "Aucun contact pour le moment"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="hover:border-primary/30 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {contact.photo_url ? (
                    <img
                      src={contact.photo_url}
                      alt={`${contact.first_name} ${contact.last_name}`}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {getInitials(`${contact.first_name} ${contact.last_name}`)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {contact.first_name} {contact.last_name}
                      </span>
                      <Badge variant={contact.tag}>
                        {TAG_LABELS[contact.tag] || contact.tag}
                      </Badge>
                    </div>
                    {contact.job_title && (
                      <p className="text-xs text-text-muted truncate">{contact.job_title}</p>
                    )}
                    <p className="text-xs text-text-muted truncate">{contact.account_name}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Nouveau contact">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account selector */}
          <div ref={accountDropdownRef} className="relative">
            <label className="block text-sm font-medium text-text-muted mb-1">
              Compte *
            </label>
            <input
              type="text"
              placeholder="Rechercher un compte..."
              value={selectedAccount ? selectedAccount.name : accountSearch}
              onChange={(e) => {
                setAccountSearch(e.target.value);
                setSelectedAccount(null);
                setAccountDropdownOpen(true);
              }}
              onFocus={() => setAccountDropdownOpen(true)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            {accountDropdownOpen && !selectedAccount && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredAccounts.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-text-muted">Aucun compte trouvé</div>
                ) : (
                  filteredAccounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccount(a);
                        setAccountSearch(a.name);
                        setAccountDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-surface-2 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {a.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Nom *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Job title */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Poste</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="ex: Directeur Commercial"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212 6XX XXX XXX"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">LinkedIn</label>
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Tag</label>
            <div className="grid grid-cols-2 gap-2">
              {TAG_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
                    tag === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="radio"
                    name="tag"
                    value={opt.value}
                    checked={tag === opt.value}
                    onChange={() => setTag(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Aperçu"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                  <Camera size={24} className="text-text-muted" />
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={16} />
                {photoPreview ? "Changer" : "Ajouter une photo"}
              </Button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={submitting}
            disabled={!selectedAccount || !firstName.trim() || !lastName.trim()}
          >
            Créer le contact
          </Button>
        </form>
      </Modal>
    </div>
  );
}
