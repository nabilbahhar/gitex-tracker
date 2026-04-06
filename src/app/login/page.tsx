"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold">GITEX Tracker</h1>
          <p className="text-text-muted mt-1">Compucom Morocco</p>
        </div>

        {sent ? (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">📧</div>
            <h2 className="text-lg font-bold mb-2">Email envoyé !</h2>
            <p className="text-text-muted text-sm">
              Clique sur le lien dans ton email pour te connecter.
            </p>
            <p className="text-xs text-text-muted mt-4">{email}</p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-primary text-sm hover:underline"
            >
              Utiliser un autre email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Email Compucom
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@compucom.ma"
                required
                autoFocus
                className="text-lg"
              />
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 px-4 py-2 rounded-xl">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              Se connecter
            </Button>

            <p className="text-xs text-text-muted text-center">
              Un lien magique sera envoyé à ton email
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
