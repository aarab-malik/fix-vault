"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
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
      await api.logout().catch(() => undefined);
      const user = await api.signup(normalizedEmail, password);
      if (!user?.id || user.email.trim().toLowerCase() !== normalizedEmail) {
        await api.logout().catch(() => undefined);
        throw new ApiError("Signup could not be verified. Try again.", 400);
      }
      window.location.href = "/settings";
    } catch (err) {
      await api.logout().catch(() => undefined);
      setError(err instanceof ApiError ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell mode="signup">
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
            minLength={8}
            autoComplete="new-password"
            required
          />
          <p className="font-mono text-xs text-ink/45 mt-1.5">Minimum 8 characters</p>
        </div>
        {error && (
          <p role="alert" className="alert-error font-mono break-words">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Building archive…" : "Initialize my archive →"}
        </button>
      </form>
    </AuthShell>
  );
}
