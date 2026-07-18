"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { api, ApiError, User } from "@/lib/api";
import Link from "next/link";

const STEPS = ["Account", "Gemini", "Pinecone", "Done"];

export default function SettingsPage() {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pineconeKey, setPineconeKey] = useState("");
  const [pineconeHost, setPineconeHost] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.me().then((u) => {
      setUser(u);
      const savedBase = u?.openai_base_url || "";
      // Prefer Gemini default if empty or leftover OpenAI URL
      if (!savedBase || savedBase.includes("api.openai.com")) {
        setBaseUrl("");
      } else {
        setBaseUrl(savedBase);
      }
      if (u?.pinecone_index_host) setPineconeHost(u.pinecone_index_host);
      if (u?.credentials_configured) setStep(3);
      else if (u?.openai_configured) setStep(2);
      else if (u) setStep(1);
    });
  }, []);

  async function saveOpenAI() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const u = await api.saveOpenAI(openaiKey, baseUrl || undefined);
      setUser(u);
      const test = await api.testOpenAI();
      setMessage(test.message);
      if (test.ok) setStep(2);
      else setError(test.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save OpenAI settings");
    } finally {
      setBusy(false);
    }
  }

  async function savePinecone() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const u = await api.savePinecone(pineconeKey, pineconeHost);
      setUser(u);
      const test = await api.testPinecone();
      setMessage(test.message);
      if (test.ok) setStep(3);
      else setError(test.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save Pinecone settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-medium mb-2">Settings</h1>
        <p className="text-sm text-ink/70 mb-6">Connect your own API keys. FixVault uses them only for your account.</p>

        <div className="flex gap-2 mb-8 text-sm font-mono">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? "text-brand" : "text-ink/40"}>
              {i + 1}. {s}{i < STEPS.length - 1 ? " →" : ""}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="panel p-6 space-y-4">
            <h2 className="font-medium">Account ready</h2>
            <p className="text-sm text-ink/70">
              Signed in as <span className="font-mono">{user?.email}</span>. Next you will add Gemini and Pinecone keys.
            </p>
            <button className="btn-primary" onClick={() => setStep(1)}>Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="panel p-6 space-y-4">
            <h2 className="font-medium">Google Gemini</h2>
            <p className="text-sm text-ink/70">
              Free key:{" "}
              <a className="text-brand underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
            </p>
            <p className="text-sm text-ink/70">
              Models used: chat <span className="font-mono">gemini-flash-latest</span>, embeddings{" "}
              <span className="font-mono">gemini-embedding-001</span> (1536 dims)
            </p>
            {user?.openai_key_hint && (
              <p className="text-sm font-mono text-ink/60">Current key: {user.openai_key_hint}</p>
            )}
            <div>
              <label className="label" htmlFor="openai">Gemini API key</label>
              <input
                id="openai"
                type="password"
                className="input font-mono"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="AIza…"
              />
            </div>
            <button type="button" className="text-sm text-brand" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? "Hide" : "Show"} advanced: base URL override
            </button>
            {showAdvanced && (
              <div>
                <label className="label" htmlFor="baseurl">Base URL</label>
                <input
                  id="baseurl"
                  className="input font-mono"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com/v1beta/openai/"
                />
                <p className="text-xs text-ink/60 mt-1">
                  Leave empty for Gemini (default). Only change if you use a proxy.
                </p>
              </div>
            )}
            <button className="btn-primary" onClick={saveOpenAI} disabled={busy || !openaiKey}>
              Save and test connection
            </button>
          </div>        )}

        {step === 2 && (
          <div className="panel p-6 space-y-4">
            <h2 className="font-medium">Pinecone</h2>
            <ul className="text-sm text-ink/70 list-disc pl-5 space-y-1">
              <li>Create a serverless index in Pinecone</li>
              <li>Dimension: <span className="font-mono">1536</span></li>
              <li>Metric: <span className="font-mono">cosine</span></li>
              <li>Copy the index host from the Pinecone console</li>
            </ul>
            {user?.pinecone_key_hint && (
              <p className="text-sm font-mono text-ink/60">Current key: {user.pinecone_key_hint}</p>
            )}
            <div>
              <label className="label" htmlFor="pinecone">API key</label>
              <input id="pinecone" type="password" className="input font-mono" value={pineconeKey} onChange={(e) => setPineconeKey(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="host">Index host</label>
              <input id="host" className="input font-mono" value={pineconeHost} onChange={(e) => setPineconeHost(e.target.value)} placeholder="your-index-xxxx.svc....pinecone.io" />
            </div>
            <button className="btn-primary" onClick={savePinecone} disabled={busy || !pineconeKey || !pineconeHost}>
              Save and test connection
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="panel p-6 space-y-4">
            <h2 className="font-medium text-ok">You are set</h2>
            <p className="text-sm text-ink/70">Your keys are saved and validated. You can start recording incidents.</p>
            <div className="flex gap-3">
              <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
              <Link href="/incidents/new" className="btn-secondary">Add first incident</Link>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-ok mt-4">{message}</p>}
        {error && <p className="text-sm text-fail mt-4">{error}</p>}
      </main>
    </div>
  );
}
