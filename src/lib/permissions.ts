import type { Profile } from "./types";

// Liste interne — ne pas exposer dans l'UI
const MASTER_EMAILS = ["n.bahhar@compucom.ma"];

/**
 * Master = privileges au-dessus de l'admin classique.
 * - Peut voir / modifier toutes les donnees (comme admin)
 * - Peut supprimer n'importe quel record
 * - Peut modifier les roles des autres profils
 * - Affiche aucun badge "master" dans l'UI (reste discret)
 */
export function isMaster(profile: Profile | null | undefined): boolean {
  if (!profile?.email) return false;
  return MASTER_EMAILS.includes(profile.email);
}

/**
 * Admin classique (Achraf + Nabil).
 * Affiche le badge "Admin" dans l'UI.
 */
export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

/**
 * Peut tout voir = admin OU master.
 */
export function canSeeAll(profile: Profile | null | undefined): boolean {
  return isAdmin(profile) || isMaster(profile);
}
