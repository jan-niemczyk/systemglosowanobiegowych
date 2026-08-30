"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.error) {
      setError("Nieprawidłowy e-mail lub hasło.");
      return;
    }
    router.push(from === "/login" ? "/" : from);
    router.refresh();
  }

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center px-3">
      <div className="w-100" style={{ maxWidth: 440 }}>
        <header className="mb-5">
          <div className="eyebrow mb-3">System Głosowań Obiegowych</div>
          <h1 style={{ fontSize: 44, lineHeight: 1.05 }}>
            iGŁOSOWANIA.
          </h1>
          <p className="mt-3 small text-secondary-emphasis">
            Zaloguj się, aby przejść do swoich spraw.
          </p>
        </header>

        <form onSubmit={onSubmit} className="card shadow p-4 p-sm-5">
          <div className="mb-4">
            <label className="form-label eyebrow" htmlFor="email">Adres e-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="np. anna.kowalska@miasto.pl"
            />
          </div>
          <div className="mb-4">
            <label className="form-label eyebrow" htmlFor="password">Hasło</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
            />
          </div>

          {error && (
            <div className="alert alert-danger py-2 mb-4">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100" disabled={pending}>
            {pending ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>
      </div>
    </main>
  );
}
