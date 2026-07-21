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
    try {
      await api.signup(email, password);
      window.location.href = "/settings";
    } catch (err) {
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
          <p className="font-mono text-[10px] text-ink/45 mt-1.5">MIN_LENGTH: 8 CHARACTERS</p>
        </div>
        {error && (
          <p role="alert" className="alert-error font-mono">
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
