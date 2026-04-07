"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sparkles, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.endsWith("@compucom.ma")) {
      setError("Seuls les emails @compucom.ma sont autorisés");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-5 items-center justify-center shadow-lg">
              <Sparkles size={28} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">GITEX Tracker</h1>
            <p className="text-text-muted text-sm mt-1">Compucom Morocco — 7-9 Avril 2026</p>
          </div>

          {sent ? (
            <div className="bg-surface border border-border rounded-2xl p-6 text-center shadow-sm animate-slide-up">
              <div className="inline-flex w-12 h-12 rounded-full bg-success/10 text-success mb-4 items-center justify-center">
                <Mail size={20} />
              </div>
              <h2 className="text-lg font-semibold mb-2">Email envoyé !</h2>
              <p className="text-text-muted text-sm">
                Clique sur le lien dans ton email pour te connecter.
              </p>
              <p className="text-xs text-text-muted mt-4 bg-surface-2 px-3 py-2 rounded-lg inline-block">
                {email}
              </p>
              <button
                onClick={() => setSent(false)}
                className="block mt-5 text-primary text-sm hover:underline mx-auto"
              >
                Utiliser un autre email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                  Email Compucom
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@compucom.ma"
                  required
                  autoFocus
                  className="text-base"
                />
              </div>

              {error && (
                <p className="text-danger text-sm bg-danger/10 px-4 py-3 rounded-xl border border-danger/20">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full">
                Se connecter
                <ArrowRight size={18} />
              </Button>

              <p className="text-xs text-text-muted text-center pt-2">
                Un lien magique sera envoyé à votre email
              </p>
            </form>
          )}
        </div>
      </div>

      <div className="text-center pb-6 text-xs text-text-muted">
        <p>Marrakech • 7-9 Avril 2026</p>
      </div>
    </div>
  );
}
