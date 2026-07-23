"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { AttemptEditor } from "@/components/AttemptEditor";
import { MobileSection } from "@/components/MobileSection";
import { SetupRequired } from "@/components/SetupRequired";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, IncidentDraft } from "@/lib/api";
import Link from "next/link";

const emptyDraft = (): IncidentDraft => ({
  title: "",
  problem: "",
  status: "unresolved",
  tags: [],
  attempts: [],
});

export default function NewIncidentPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<IncidentDraft | null>(null);
  const [similar, setSimilar] = useState<{ id: string; title: string; status: string; similarity: number; relevance: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  if ((user && !user.chat_configured) || needsSetup) {
    return <SetupRequired feature="log" />;
  }

  const canSaveToMemory = Boolean(user?.semantic_configured);

  async function generateDraft() {
    setBusy(true);
    setError("");
    try {
      const [d, sim] = await Promise.all([
        api.draftIncident(notes),
        api.similarIncidents(notes),
      ]);
      setDraft(d);
      setSimilar(sim.incidents);
    } catch (err) {
      if (err instanceof ApiError && err.status === 428) {
        setNeedsSetup(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to generate draft");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    if (!canSaveToMemory) {
      setError("Connect an embedding provider and Pinecone in Connections before saving to semantic memory.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const incident = await api.createIncident({ ...draft, original_notes: notes });
      setSavedId(incident.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 428) {
        setNeedsSetup(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(field: keyof IncidentDraft, value: IncidentDraft[keyof IncidentDraft]) {
    setDraft((d) => (d ? { ...d, [field]: value } : emptyDraft()));
  }

  if (savedId) {
    return (
      <div className="page-shell">
        <Nav />
        <main id="main-content" className="page-main page-main-narrow">
          <div className="surface overflow-hidden">
            <div className="bg-ok text-white p-5 sm:p-6">
              <p className="system-label-light">Write complete</p>
              <h1 className="text-2xl font-medium mt-1">Incident saved to memory.</h1>
            </div>
            <div className="p-5 sm:p-6">
              <Link href={`/incidents/${savedId}`} className="btn-primary w-full sm:w-auto inline-flex">
                Inspect saved incident →
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Nav />
      <main id="main-content" className="page-main page-main-narrow page-stack">
        <div className="page-header">
          <span className="file-tab-warn">Unfiled crash report</span>
        </div>

        <header>
          <p className="system-label mb-2">New memory / intake</p>
          <h1 className="page-title">Capture the failure while it&apos;s fresh.</h1>
          <p className="page-copy mt-2 max-w-2xl">
            Paste the messy version. FixVault will separate the symptom, environment, attempts, cause, and final fix before anything is saved.
          </p>
        </header>

        {!draft ? (
          <section className="surface overflow-hidden">
            <div className="bg-brand text-white p-5 sm:p-6">
              <p className="system-label-light">Raw incident buffer</p>
              <p className="text-sm text-white/70 leading-relaxed mt-2">
                Include commands, exact errors, what changed, what you tried, and what finally restored service.
              </p>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <label htmlFor="incident-notes" className="label">Rough troubleshooting notes</label>
              <textarea
                id="incident-notes"
                className="input min-h-52 resize-y prose-mono"
                placeholder="My Azure VM stopped accepting SSH after I installed Docker…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono text-xs text-ink/45">{notes.length} characters</span>
                <button className="btn-primary w-full sm:w-auto" onClick={generateDraft} disabled={busy || notes.length < 10}>
                  {busy ? "Structuring incident…" : "Generate structured draft →"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="page-stack">
            <div className="alert-info">
              <p className="font-mono text-xs text-brand uppercase tracking-wide">Draft generated</p>
              <p className="mt-1">Review every field before writing this incident to your permanent archive.</p>
            </div>

            <MobileSection title="Core" subtitle="Title and problem" defaultOpen>
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="draft-title">Title</label>
                  <input id="draft-title" className="input" value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} />
                </div>
                <div>
                  <label className="label">Problem</label>
                  <textarea className="input min-h-24" value={draft.problem} onChange={(e) => updateDraft("problem", e.target.value)} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={draft.status} onChange={(e) => updateDraft("status", e.target.value)}>
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </MobileSection>

            <MobileSection title="Diagnostics" subtitle="Environment and error messages">
              <div className="space-y-4">
                <div>
                  <label className="label">Environment</label>
                  <input className="input" value={draft.environment || ""} onChange={(e) => updateDraft("environment", e.target.value)} />
                </div>
                <div>
                  <label className="label">Error messages</label>
                  <textarea className="input prose-mono min-h-24" value={draft.error_messages || ""} onChange={(e) => updateDraft("error_messages", e.target.value)} />
                </div>
              </div>
            </MobileSection>

            <MobileSection title="Resolution" subtitle="Root cause and final fix" defaultOpen>
              <div className="space-y-4">
                <div>
                  <label className="label">Root cause</label>
                  <textarea className="input min-h-24" value={draft.root_cause || ""} onChange={(e) => updateDraft("root_cause", e.target.value)} />
                </div>
                <div>
                  <label className="label">Final fix</label>
                  <textarea className="input min-h-24" value={draft.final_fix || ""} onChange={(e) => updateDraft("final_fix", e.target.value)} />
                </div>
              </div>
            </MobileSection>

            <MobileSection title="Attempts" subtitle="What you tried and what happened">
              <AttemptEditor
                attempts={draft.attempts}
                onChange={(attempts) => updateDraft("attempts", attempts)}
              />
            </MobileSection>

            <MobileSection title="Tags" subtitle="Comma-separated labels">
              <div>
                <label className="label">Tags</label>
                <input
                  className="input"
                  value={draft.tags.join(", ")}
                  onChange={(e) => updateDraft("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                />
              </div>
            </MobileSection>

            <div className="action-row section-rule">
              {!canSaveToMemory && (
                <p className="alert-warning w-full">
                  Drafting works with chat only. Connect embeddings and Pinecone in Connections to save incidents to memory.
                </p>
              )}
              <button
                className="btn-primary"
                onClick={save}
                disabled={busy || !canSaveToMemory || draft.attempts.some((attempt) => !attempt.action.trim())}
              >
                Save incident
              </button>
              <button className="btn-secondary" onClick={() => setDraft(null)}>Back to notes</button>
            </div>
          </div>
        )}

        {similar.length > 0 && (
          <aside className="surface-pad">
            <p className="system-label mb-1">Similar records already exist</p>
            <div className="space-y-2 mt-3">
              {similar.map((s) => (
                <Link key={s.id} href={`/incidents/${s.id}`} className="block text-sm border border-brand/15 bg-ground/40 p-3 hover:border-brand">
                  <p className="font-medium break-words">{s.title}</p>
                  <p className="font-mono text-xs text-ink/60 mt-1">{s.relevance} · {s.similarity}%</p>
                </Link>
              ))}
            </div>
          </aside>
        )}

        {error && <p role="alert" className="alert-error break-words">{error}</p>}
      </main>
    </div>
  );
}
