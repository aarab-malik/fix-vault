"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, User } from "@/lib/api";
import Link from "next/link";

const STEPS = ["Account", "Gemini", "Pinecone", "Done"];

export default function SettingsPage() {
  const { user: authUser, refresh } = useAuth();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .me()
      .then((u) => {
        setUser(u);
        const savedBase = u?.openai_base_url || "";
        if (!savedBase || savedBase.includes("api.openai.com")) {
          setBaseUrl("");
        } else {
          setBaseUrl(savedBase);
        }
        if (u?.pinecone_index_host) setPineconeHost(u.pinecone_index_host);
        if (u?.credentials_configured) setStep(3);
        else if (u?.openai_configured) setStep(2);
        else setStep(0);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load account");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authUser) setUser(authUser);
  }, [authUser]);

  async function saveOpenAI() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const u = await api.saveOpenAI(openaiKey, baseUrl || undefined);
      setUser(u);
      await refresh();
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
      await refresh();
      const test = await api.testPinecone();
      setMessage(test.message);
      if (test.ok) {
        setStep(3);
        await refresh();
      } else {
        setError(test.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save Pinecone settings");
    } finally {
      setBusy(false);
    }
  }

  const email = user?.email || authUser?.email || "";

  return (
    <div className="page-shell">
      <Nav />
      <main id="main-content" className="page-main page-main-narrow page-stack">
        <div className="page-header">
          <span className="file-tab">Secure connector bay</span>
          <div className="page-header-rule" />
          <span className="stamp text-ok">Encrypted</span>
        </div>

        <header className="space-y-3">
          <p className="system-label">Connection console</p>
          <h1 className="page-title">Bring your own intelligence.</h1>
          <p className="page-copy max-w-2xl">
            Your Gemini and Pinecone credentials are encrypted for your account. FixVault never shares provider quota between users.
          </p>
        </header>

        {loading ? (
          <div className="surface-pad" aria-live="polite">
            <p className="system-label">Loading account</p>
            <p className="font-mono text-sm text-ink/60 mt-3">Checking connection status…</p>
          </div>
        ) : (
          <>
            <div className="surface-pad">
              <p className="system-label mb-2 sm:hidden">Current step</p>
              <p className="font-medium sm:hidden mb-3">{STEPS[step]}</p>
              <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:border sm:border-brand/20">
                {STEPS.map((s, i) => (
                  <li
                    key={s}
                    aria-current={i === step ? "step" : undefined}
                    className={`p-3 sm:p-4 border border-brand/15 sm:border-0 sm:border-r last:sm:border-r-0 ${
                      i === step ? "bg-brand text-white" : i < step ? "bg-[#E8F5EF] text-ok" : "text-ink/40 bg-[#F8FBFE]"
                    }`}
                  >
                    <span className="font-mono text-xs block opacity-70">Step {i + 1}</span>
                    <span className="text-sm font-medium mt-1 block">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {step === 0 && (
              <div className="surface-pad space-y-4">
                <p className="system-label">Identity verified</p>
                <h2 className="text-xl font-medium">Account ready</h2>
                <p className="text-sm text-ink/70 break-words">
                  {email ? (
                    <>
                      Signed in as <span className="font-mono">{email}</span>. Next you will add Gemini and Pinecone keys.
                    </>
                  ) : (
                    <>Your account is ready. Next you will add Gemini and Pinecone keys.</>
                  )}
                </p>
                <div className="alert-info">
                  Archive, Ask Memory, and Log Incident stay locked until both providers are connected.
                </div>
                <button className="btn-primary w-full sm:w-auto" onClick={() => setStep(1)}>Continue</button>
              </div>
            )}

            {step === 1 && (
              <div className="surface-pad space-y-5">
                <div className="space-y-2">
                  <p className="system-label">Language + embedding engine</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-xl font-medium">Google Gemini</h2>
                    <span className="stamp text-ok self-start">Provider 01</span>
                  </div>
                </div>
                <p className="text-sm text-ink/70 break-words">
                  Free key:{" "}
                  <a className="text-brand underline break-all" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                    aistudio.google.com/apikey
                  </a>
                </p>
                <div className="alert-info space-y-1">
                  <p>Models used:</p>
                  <p className="font-mono text-xs break-all">chat gemini-flash-latest</p>
                  <p className="font-mono text-xs break-all">embeddings gemini-embedding-001 (1536 dims)</p>
                </div>
                {user?.openai_key_hint && (
                  <p className="text-sm font-mono text-ink/60 break-all">Current key: {user.openai_key_hint}</p>
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
                <div className="space-y-3">
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
                        placeholder="Leave empty for Gemini default"
                      />
                      <p className="text-xs text-ink/60 mt-2">
                        Only change if you use a proxy.
                      </p>
                    </div>
                  )}
                </div>
                <div className="action-row sm:justify-start">
                  <button className="btn-primary" onClick={saveOpenAI} disabled={busy || !openaiKey}>
                    Save and test connection
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="surface-pad space-y-5">
                <div className="space-y-2">
                  <p className="system-label">Semantic index</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-xl font-medium">Pinecone</h2>
                    <span className="stamp text-warn self-start">Provider 02</span>
                  </div>
                </div>
                <details className="alert-warning">
                  <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                    Setup checklist
                  </summary>
                  <ul className="list-disc pl-5 mt-3 space-y-1">
                    <li>Create a serverless index in Pinecone</li>
                    <li>Dimension: <span className="font-mono">1536</span></li>
                    <li>Metric: <span className="font-mono">cosine</span></li>
                    <li>Copy the index host from the Pinecone console</li>
                  </ul>
                </details>
                {user?.pinecone_key_hint && (
                  <p className="text-sm font-mono text-ink/60 break-all">Current key: {user.pinecone_key_hint}</p>
                )}
                <div>
                  <label className="label" htmlFor="pinecone">API key</label>
                  <input id="pinecone" type="password" className="input font-mono" value={pineconeKey} onChange={(e) => setPineconeKey(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="host">Index host</label>
                  <input
                    id="host"
                    className="input font-mono"
                    value={pineconeHost}
                    onChange={(e) => setPineconeHost(e.target.value)}
                    placeholder="your-index-xxxx.svc....pinecone.io"
                  />
                </div>
                <div className="action-row sm:justify-start">
                  <button className="btn-primary" onClick={savePinecone} disabled={busy || !pineconeKey || !pineconeHost}>
                    Save and test connection
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="surface overflow-hidden">
                <div className="bg-ok text-white p-5 sm:p-6">
                  <p className="system-label-light">Connection sequence complete</p>
                  <h2 className="text-2xl font-medium mt-1">Your archive is online.</h2>
                </div>
                <div className="p-5 sm:p-6 space-y-4">
                  <p className="text-sm text-ink/70">Your keys are saved and validated. You can start recording incidents.</p>
                  <div className="action-row">
                    <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
                    <Link href="/incidents/new" className="btn-secondary">Add first incident</Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div aria-live="polite" className="space-y-3">
          {message && <p className="alert-success break-words">{message}</p>}
          {error && <p role="alert" className="alert-error break-words">{error}</p>}
        </div>
      </main>
    </div>
  );
}
