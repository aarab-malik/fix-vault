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
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center gap-4 mb-7">
          <span className="file-tab">Secure connector bay</span>
          <div className="diagnostic-ruler flex-1 opacity-60" />
          <span className="hidden sm:block stamp text-ok">Encrypted</span>
        </div>
        <header className="grid lg:grid-cols-[1fr_auto] gap-6 items-end mb-7">
          <div>
            <p className="system-label mb-2">Connection console</p>
            <h1 className="page-title">Bring your own intelligence.</h1>
            <p className="page-copy mt-2 max-w-xl">
              Your Gemini and Pinecone credentials are encrypted for your account. FixVault never shares provider quota between users.
            </p>
          </div>
          <div className="dossier bg-[#EAF4FF] px-5 py-4 font-mono text-[10px] leading-5 text-brand">
            CREDENTIAL_MODE: BYOK<br />ENCRYPTION: ACTIVE
          </div>
        </header>

        <ol className="grid grid-cols-2 sm:grid-cols-4 border border-brand/25 bg-[#F8FBFE] mb-7 shadow-[5px_5px_0_rgba(7,56,103,0.12)]">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={`p-3 sm:p-4 border-r border-b sm:border-b-0 border-brand/15 last:border-r-0 ${
                i === step ? "bg-brand text-white" : i < step ? "bg-[#E8F5EF] text-ok" : "text-ink/40"
              }`}
            >
              <span className="font-mono text-[10px] block opacity-60">STEP_{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm font-medium mt-1 block">{s}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="dossier paper-stack p-6 sm:p-8 space-y-4">
            <p className="system-label">Identity verified</p>
            <h2 className="text-xl font-medium">Account ready</h2>
            <p className="text-sm text-ink/70">
              Signed in as <span className="font-mono">{user?.email}</span>. Next you will add Gemini and Pinecone keys.
            </p>
            <button className="btn-primary" onClick={() => setStep(1)}>Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="dossier paper-stack p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="system-label">Language + embedding engine</p>
                <h2 className="text-xl font-medium mt-1">Google Gemini</h2>
              </div>
              <span className="stamp text-ok">Provider 01</span>
            </div>
            <p className="text-sm text-ink/70">
              Free key:{" "}
              <a className="text-brand underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
            </p>
            <p className="alert-info">
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
            <button type="button" className="archive-link text-left" onClick={() => setShowAdvanced(!showAdvanced)}>
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
          </div>
        )}

        {step === 2 && (
          <div className="dossier paper-stack p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="system-label">Semantic index</p>
                <h2 className="text-xl font-medium mt-1">Pinecone</h2>
              </div>
              <span className="stamp text-warn">Provider 02</span>
            </div>
            <ul className="alert-warning list-disc pl-8 space-y-1">
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
          <div className="dossier paper-stack overflow-hidden">
            <div className="bg-ok text-white p-6 sm:p-8">
              <p className="font-mono text-4xl" aria-hidden>:)</p>
              <p className="system-label-light mt-5">Connection sequence complete</p>
              <h2 className="text-2xl font-medium mt-1">Your archive is online.</h2>
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <p className="text-sm text-ink/70">Your keys are saved and validated. You can start recording incidents.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
                <Link href="/incidents/new" className="btn-secondary">Add first incident</Link>
              </div>
            </div>
          </div>
        )}

        <div aria-live="polite">
          {message && <p className="alert-success mt-4">{message}</p>}
          {error && <p role="alert" className="alert-error mt-4">{error}</p>}
        </div>
      </main>
    </div>
  );
}
