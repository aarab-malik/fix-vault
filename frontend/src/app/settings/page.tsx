"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, ProviderPreset, User } from "@/lib/api";
import Link from "next/link";

const STEPS = ["Account", "Chat", "Embeddings", "Pinecone", "Review"];

type ProviderForm = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  dimensions: string;
};

const emptyForm = (provider = "gemini"): ProviderForm => ({
  provider,
  apiKey: "",
  baseUrl: "",
  model: "",
  dimensions: "1536",
});

function deriveStep(user: User | null): number {
  if (!user) return 0;
  if (user.credentials_configured) return 4;
  if (!user.chat_configured) return 1;
  if (!user.embedding_configured) return 2;
  if (!user.pinecone_configured) return 3;
  return 4;
}

export default function SettingsPage() {
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [presets, setPresets] = useState<{ chat: ProviderPreset[]; embedding: ProviderPreset[] } | null>(null);
  const [chatForm, setChatForm] = useState<ProviderForm>(emptyForm());
  const [embedForm, setEmbedForm] = useState<ProviderForm>(emptyForm());
  const [pineconeKey, setPineconeKey] = useState("");
  const [pineconeHost, setPineconeHost] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsReindex, setNeedsReindex] = useState(false);

  useEffect(() => {
    Promise.all([api.me(), api.getProviderPresets()])
      .then(([u, p]) => {
        setUser(u);
        setPresets(p);
        setStep(deriveStep(u));
        if (u.chat_provider) {
          setChatForm((f) => ({
            ...f,
            provider: u.chat_provider || "gemini",
            baseUrl: u.chat_base_url || "",
            model: u.chat_model || "",
          }));
        }
        if (u.embedding_provider) {
          setEmbedForm((f) => ({
            ...f,
            provider: u.embedding_provider || "gemini",
            baseUrl: u.embedding_base_url || "",
            model: u.embedding_model || "",
            dimensions: String(u.embedding_dimensions || 1536),
          }));
        }
        if (u.pinecone_index_host) setPineconeHost(u.pinecone_index_host);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  function chatPreset(): ProviderPreset | undefined {
    return presets?.chat.find((p) => p.id === chatForm.provider);
  }

  function embedPreset(): ProviderPreset | undefined {
    return presets?.embedding.find((p) => p.id === embedForm.provider);
  }

  async function saveChat() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const u = await api.saveChatProvider({
        provider: chatForm.provider,
        api_key: chatForm.apiKey,
        base_url: chatForm.provider === "custom" ? chatForm.baseUrl : undefined,
        model: chatForm.provider === "custom" ? chatForm.model : chatForm.model || undefined,
      });
      setUser(u);
      await refresh();
      const test = await api.testChat();
      setMessage(test.message);
      if (test.ok) {
        setStep(2);
        setChatForm((f) => ({ ...f, apiKey: "" }));
      } else {
        setError(test.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save chat provider");
    } finally {
      setBusy(false);
    }
  }

  async function saveEmbedding() {
    setBusy(true);
    setError("");
    setMessage("");
    const prevFingerprint = user?.embedding_profile_fingerprint;
    try {
      const u = await api.saveEmbeddingProvider({
        provider: embedForm.provider,
        api_key: embedForm.apiKey,
        base_url: embedForm.provider === "custom" ? embedForm.baseUrl : undefined,
        model: embedForm.provider === "custom" ? embedForm.model : embedForm.model || undefined,
        dimensions: parseInt(embedForm.dimensions, 10) || 1536,
      });
      setUser(u);
      await refresh();
      const test = await api.testEmbedding();
      setMessage(test.message);
      if (test.ok) {
        if (prevFingerprint && prevFingerprint !== u.embedding_profile_fingerprint) {
          setNeedsReindex(true);
        }
        setStep(3);
        setEmbedForm((f) => ({ ...f, apiKey: "" }));
      } else {
        setError(test.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save embedding provider");
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
      if (test.ok) setStep(4);
      else setError(test.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save Pinecone settings");
    } finally {
      setBusy(false);
    }
  }

  async function handleReindex() {
    setBusy(true);
    setError("");
    try {
      const res = await api.reindexAll();
      setMessage(`Reindexed ${res.reindexed} incident(s) with the new embedding profile.`);
      setNeedsReindex(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reindex failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!confirm("Remove all provider keys and start setup again?")) return;
    setBusy(true);
    try {
      const u = await api.clearCredentials();
      setUser(u);
      await refresh();
      setChatForm(emptyForm());
      setEmbedForm(emptyForm());
      setPineconeKey("");
      setPineconeHost("");
      setStep(1);
      setNeedsReindex(false);
      setMessage("Provider settings cleared.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

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
            Choose separate chat and embedding providers. FixVault uses OpenAI-compatible APIs, so Gemini, OpenAI, Grok, and custom gateways are supported.
          </p>
        </header>

        {loading ? (
          <div className="surface-pad" aria-live="polite">
            <p className="system-label">Loading account</p>
            <p className="font-mono text-sm text-ink/60 mt-3">Checking connection status…</p>
          </div>
        ) : (
          <>
            <StepIndicator steps={STEPS} current={step} />

            {step === 0 && (
              <div className="surface-pad space-y-4">
                <p className="system-label">Identity verified</p>
                <h2 className="text-xl font-medium">Account ready</h2>
                <p className="text-sm text-ink/70 break-words">
                  {user?.email ? (
                    <>Signed in as <span className="font-mono">{user.email}</span>.</>
                  ) : (
                    <>Your account is ready.</>
                  )}
                </p>
                <div className="alert-info">
                  You will connect a chat provider, an embedding provider, and Pinecone. Chat and embeddings can use different services.
                </div>
                <button className="btn-primary w-full sm:w-auto" onClick={() => setStep(1)}>Continue</button>
              </div>
            )}

            {step === 1 && presets && (
              <ProviderStep
                title="Chat provider"
                subtitle="Structures incident drafts and writes grounded answers"
                presets={presets.chat}
                form={chatForm}
                onChange={setChatForm}
                currentHint={user?.chat_key_hint}
                validated={user?.chat_validated}
                busy={busy}
                onSave={saveChat}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && presets && (
              <ProviderStep
                title="Embedding provider"
                subtitle="Powers semantic search and incident indexing"
                presets={presets.embedding}
                form={embedForm}
                onChange={setEmbedForm}
                currentHint={user?.embedding_key_hint}
                validated={user?.embedding_validated}
                busy={busy}
                onSave={saveEmbedding}
                onBack={() => setStep(1)}
                showDimensions
                dimensionNote={`Create your Pinecone index with dimension ${embedForm.dimensions || "1536"} and cosine metric.`}
              />
            )}

            {step === 3 && (
              <div className="surface-pad space-y-5">
                <div>
                  <p className="system-label">Semantic index</p>
                  <h2 className="text-xl font-medium mt-1">Pinecone</h2>
                  <p className="text-sm text-ink/60 mt-2">
                    Your index dimension must match your embedding provider ({embedForm.dimensions || user?.embedding_dimensions || 1536}).
                  </p>
                </div>
                <details className="alert-warning">
                  <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                    Setup checklist
                  </summary>
                  <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
                    <li>Create a serverless index in Pinecone</li>
                    <li>Dimension: <span className="font-mono">{embedForm.dimensions || user?.embedding_dimensions || 1536}</span></li>
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
                  <input id="host" className="input font-mono" value={pineconeHost} onChange={(e) => setPineconeHost(e.target.value)} placeholder="your-index-xxxx.svc....pinecone.io" />
                </div>
                <div className="action-row">
                  <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
                  <button className="btn-primary" onClick={savePinecone} disabled={busy || !pineconeKey || !pineconeHost}>
                    Save and test connection
                  </button>
                </div>
              </div>
            )}

            {step === 4 && user && (
              <div className="surface overflow-hidden">
                <div className="bg-ok text-white p-5 sm:p-6">
                  <p className="system-label-light">Connection sequence complete</p>
                  <h2 className="text-2xl font-medium mt-1">Your archive is online.</h2>
                </div>
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <SummaryCard label="Chat" value={`${user.chat_provider} · ${user.chat_model}`} ok={user.chat_validated} />
                    <SummaryCard label="Embeddings" value={`${user.embedding_provider} · ${user.embedding_model} (${user.embedding_dimensions}d)`} ok={user.embedding_validated} />
                    <SummaryCard label="Pinecone" value={user.pinecone_index_host || "Connected"} ok={user.pinecone_validated} />
                    <SummaryCard label="Profile" value={user.embedding_profile_fingerprint || "—"} ok={user.embedding_validated} />
                  </div>
                  {needsReindex && (
                    <div className="alert-warning">
                      <p className="font-medium">Reindex required</p>
                      <p className="text-sm mt-1">Your embedding profile changed. Reindex incidents so search uses the new vectors.</p>
                      <button className="btn-secondary mt-3 w-full sm:w-auto" onClick={handleReindex} disabled={busy}>
                        Reindex all incidents
                      </button>
                    </div>
                  )}
                  <div className="action-row">
                    <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
                    <Link href="/incidents/new" className="btn-secondary">Add first incident</Link>
                    <button className="btn-secondary" onClick={handleReset} disabled={busy}>Change providers</button>
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

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="surface-pad">
      <p className="system-label mb-2 sm:hidden">Step {current + 1} of {steps.length}</p>
      <p className="font-medium sm:hidden mb-3">{steps[current]}</p>
      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-0 sm:border sm:border-brand/20">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === current ? "step" : undefined}
            className={`p-3 sm:p-4 border border-brand/15 sm:border-0 sm:border-r last:sm:border-r-0 ${
              i === current ? "bg-brand text-white" : i < current ? "bg-[#E8F5EF] text-ok" : "text-ink/40 bg-[#F8FBFE]"
            }`}
          >
            <span className="font-mono text-xs block opacity-70">Step {i + 1}</span>
            <span className="text-sm font-medium mt-1 block">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProviderStep({
  title,
  subtitle,
  presets,
  form,
  onChange,
  currentHint,
  validated,
  busy,
  onSave,
  onBack,
  showDimensions,
  dimensionNote,
}: {
  title: string;
  subtitle: string;
  presets: ProviderPreset[];
  form: ProviderForm;
  onChange: (f: ProviderForm) => void;
  currentHint?: string;
  validated?: boolean;
  busy: boolean;
  onSave: () => void;
  onBack: () => void;
  showDimensions?: boolean;
  dimensionNote?: string;
}) {
  const selected = presets.find((p) => p.id === form.provider);

  return (
    <div className="surface-pad space-y-5">
      <div>
        <p className="system-label">{title}</p>
        <h2 className="text-xl font-medium mt-1">{subtitle}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange({
              ...form,
              provider: p.id,
              model: p.default_chat_model || p.default_embedding_model || "",
              dimensions: String(p.default_dimensions || 1536),
              baseUrl: p.id === "custom" ? form.baseUrl : p.base_url,
            })}
            className={`text-left p-4 border min-h-11 ${
              form.provider === p.id
                ? "border-brand bg-brand text-white"
                : "border-brand/20 bg-[#F8FBFE] hover:border-brand"
            }`}
          >
            <p className="font-medium">{p.label}</p>
            {p.default_chat_model && (
              <p className={`text-xs mt-1 ${form.provider === p.id ? "text-white/70" : "text-ink/55"}`}>
                {p.default_chat_model}
              </p>
            )}
            {p.default_embedding_model && (
              <p className={`text-xs mt-1 ${form.provider === p.id ? "text-white/70" : "text-ink/55"}`}>
                {p.default_embedding_model} · {p.default_dimensions}d
              </p>
            )}
            {p.id === "custom" && (
              <p className={`text-xs mt-1 ${form.provider === p.id ? "text-white/70" : "text-ink/55"}`}>
                OpenAI-compatible base URL
              </p>
            )}
          </button>
        ))}
      </div>

      {selected?.docs_url && (
        <p className="text-sm text-ink/70">
          Get a key:{" "}
          <a className="text-brand underline break-all" href={selected.docs_url} target="_blank" rel="noreferrer">
            {selected.docs_url.replace("https://", "")}
          </a>
        </p>
      )}

      {form.provider === "custom" && (
        <div className="alert-info text-sm space-y-1">
          <p>Custom providers must expose OpenAI-compatible endpoints:</p>
          <p className="font-mono text-xs">/v1/chat/completions and /v1/embeddings</p>
          <p className="text-xs text-ink/60">Works with LiteLLM, Ollama gateways, Azure OpenAI, and similar proxies.</p>
        </div>
      )}

      {currentHint && (
        <p className="text-sm font-mono text-ink/60">Current key: {currentHint}{validated ? " · validated" : ""}</p>
      )}

      <div>
        <label className="label" htmlFor={`${title}-key`}>API key</label>
        <input
          id={`${title}-key`}
          type="password"
          className="input font-mono"
          placeholder={selected?.key_hint || "Paste API key"}
          value={form.apiKey}
          onChange={(e) => onChange({ ...form, apiKey: e.target.value })}
        />
      </div>

      {(form.provider === "custom" || form.model) && (
        <div>
          <label className="label" htmlFor={`${title}-model`}>Model</label>
          <input
            id={`${title}-model`}
            className="input font-mono"
            placeholder={selected?.default_chat_model || selected?.default_embedding_model || "model-name"}
            value={form.model}
            onChange={(e) => onChange({ ...form, model: e.target.value })}
          />
        </div>
      )}

      {form.provider === "custom" && (
        <div>
          <label className="label" htmlFor={`${title}-base`}>Base URL</label>
          <input
            id={`${title}-base`}
            className="input font-mono"
            placeholder="https://your-gateway.example/v1"
            value={form.baseUrl}
            onChange={(e) => onChange({ ...form, baseUrl: e.target.value })}
          />
        </div>
      )}

      {showDimensions && (
        <div>
          <label className="label" htmlFor={`${title}-dims`}>Embedding dimensions</label>
          <input
            id={`${title}-dims`}
            type="number"
            className="input font-mono"
            value={form.dimensions}
            onChange={(e) => onChange({ ...form, dimensions: e.target.value })}
            min={64}
            max={4096}
          />
          {dimensionNote && <p className="text-xs text-ink/60 mt-2">{dimensionNote}</p>}
        </div>
      )}

      <div className="action-row">
        <button className="btn-secondary" onClick={onBack}>Back</button>
        <button className="btn-primary" onClick={onSave} disabled={busy || !form.apiKey}>
          Save and test connection
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="border border-brand/15 bg-ground/40 p-4">
      <p className="system-label">{label}</p>
      <p className="text-sm mt-2 break-words">{value}</p>
      <p className={`font-mono text-xs mt-2 ${ok ? "text-ok" : "text-warn"}`}>
        {ok ? "Connected" : "Not validated"}
      </p>
    </div>
  );
}
