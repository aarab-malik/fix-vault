"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      // Drop any previous session before attempting a new login.
      await api.logout().catch(() => undefined);

      const user = await api.login(normalizedEmail, password);
      if (!user?.id || user.email.trim().toLowerCase() !== normalizedEmail) {
        await api.logout().catch(() => undefined);
        throw new ApiError("Invalid email or password", 401);
      }

      // Confirm the cookie actually authenticates this account.
      const me = await api.me();
      if (!me?.id || me.email.trim().toLowerCase() !== normalizedEmail) {
        await api.logout().catch(() => undefined);
        throw new ApiError("Login could not be verified. Try again.", 401);
      }

      window.location.href = me.credentials_configured ? "/dashboard" : "/settings";
    } catch (err) {
      await api.logout().catch(() => undefined);
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell mode="login">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p role="alert" className="alert-error font-mono break-words">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Log in →"}
        </button>
      </form>
    </AuthShell>
  );
}
