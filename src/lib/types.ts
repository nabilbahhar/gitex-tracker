export type UserRole = "admin" | "sales";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  sector?: string;
  assigned_to: string;
  assigned_name?: string;
  created_at: string;
  contact_count?: number;
  interaction_count?: number;
}

export interface Contact {
  id: string;
  account_id: string;
  account_name?: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  photo_url?: string;
  tag: "prospect" | "client" | "partenaire" | "autre";
  created_by: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  account_id: string;
  account_name?: string;
  contact_ids: string[];
  type: "visite_stand" | "meeting" | "rencontre" | "dinner" | "soiree";
  date: string;
  location?: string;
  notes: string;
  photos: string[];
  status: "a_suivre" | "en_cours" | "termine";
  heat_score: 1 | 2 | 3;
  created_by: string;
  created_at: string;
}

export interface DinnerEvent {
  id: string;
  day: string;
  date: string;
  restaurant: string;
  menu_type: string;
  notes?: string;
}

export interface DinnerGuest {
  id: string;
  dinner_id: string;
  contact_id: string;
  contact_name?: string;
  account_name?: string;
  invited_by: string;
  invited_by_name?: string;
  confirmation: "oui" | "non" | "peut_etre";
  created_at: string;
}
