"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { AttemptEditor } from "@/components/AttemptEditor";
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
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<IncidentDraft | null>(null);
  const [similar, setSimilar] = useState<{ id: string; title: string; status: string; similarity: number; relevance: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

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
      setError(err instanceof ApiError ? err.message : "Failed to generate draft");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const incident = await api.createIncident({ ...draft, original_notes: notes });
      setSavedId(incident.id);
    } catch (err) {
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
      <div className="min-h-screen">
        <Nav />
        <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="dossier paper-stack overflow-hidden">
            <div className="bg-ok text-white p-7">
              <p className="font-mono text-4xl" aria-hidden>:)</p>
              <p className="system-label-light mt-5">Write complete</p>
              <h1 className="text-2xl font-medium mt-1">Incident saved to memory.</h1>
            </div>
            <div className="p-6">
              <Link href={`/incidents/${savedId}`} className="btn-primary">Inspect saved incident →</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="flex items-center gap-4">
          <span className="file-tab-warn">Unfiled crash report</span>
          <div className="diagnostic-ruler flex-1 opacity-60" />
          <span className="hidden sm:block font-mono text-[9px] text-brand/45">INTAKE_BUFFER: EMPTY</span>
        </div>
        <header>
          <p className="system-label mb-2">New memory / intake</p>
          <h1 className="page-title">Capture the failure while it’s fresh.</h1>
          <p className="page-copy mt-2 max-w-2xl">Paste the messy version. FixVault will separate the symptom, environment, attempts, cause, and final fix before anything is saved.</p>
        </header>

        {!draft ? (
          <section className="dossier paper-stack grid lg:grid-cols-[1fr_2fr] overflow-hidden">
            <div className="relative bg-brand text-white p-6 sm:p-8 overflow-hidden">
              <span className="pointer-events-none absolute -right-3 -bottom-10 font-mono text-[10rem] text-white/[0.04]" aria-hidden>!!</span>
              <p className="system-label-light">Raw incident buffer</p>
              <p className="font-mono text-5xl mt-8" aria-hidden>!!</p>
              <p className="text-sm text-white/70 leading-relaxed mt-5">
                Include commands, exact errors, what changed, what you tried, and what finally restored service.
              </p>
              <p className="font-mono text-[10px] text-white/40 mt-10">MIN_INPUT: 10 CHARACTERS</p>
            </div>
            <div className="p-6 sm:p-8">
              <label htmlFor="incident-notes" className="label">Rough troubleshooting notes</label>
              <textarea
                id="incident-notes"
                className="input min-h-64 resize-y font-mono text-sm"
                placeholder="My Azure VM stopped accepting SSH after I installed Docker…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <span className="font-mono text-[10px] text-ink/45">{notes.length} CHARACTERS CAPTURED</span>
                <button className="btn-primary" onClick={generateDraft} disabled={busy || notes.length < 10}>
                  {busy ? "Structuring incident…" : "Generate structured draft →"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="dossier paper-stack p-6 sm:p-8 space-y-5">
            <div className="alert-info">
              <p className="font-mono text-[11px] text-brand uppercase tracking-wide">Draft generated</p>
              Review every field before writing this incident to your permanent archive.
            </div>
            <div>
              <label className="label" htmlFor="draft-title">Title</label>
              <input id="draft-title" className="input" value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} />
            </div>
            <div>
              <label className="label">Problem</label>
              <textarea className="input min-h-[80px]" value={draft.problem} onChange={(e) => updateDraft("problem", e.target.value)} />
            </div>
            <div>
              <label className="label">Environment</label>
              <input className="input" value={draft.environment || ""} onChange={(e) => updateDraft("environment", e.target.value)} />
            </div>
            <div>
              <label className="label">Error messages</label>
              <textarea className="input font-mono text-sm" value={draft.error_messages || ""} onChange={(e) => updateDraft("error_messages", e.target.value)} />
            </div>
            <div>
              <label className="label">Root cause</label>
              <textarea className="input" value={draft.root_cause || ""} onChange={(e) => updateDraft("root_cause", e.target.value)} />
            </div>
            <div>
              <label className="label">Final fix</label>
              <textarea className="input" value={draft.final_fix || ""} onChange={(e) => updateDraft("final_fix", e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={draft.status} onChange={(e) => updateDraft("status", e.target.value)}>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input className="input" value={draft.tags.join(", ")} onChange={(e) => updateDraft("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
            </div>
            <AttemptEditor
              attempts={draft.attempts}
              onChange={(attempts) => updateDraft("attempts", attempts)}
            />
            <div className="flex flex-wrap gap-3 section-rule">
              <button
                className="btn-primary"
                onClick={save}
                disabled={busy || draft.attempts.some((attempt) => !attempt.action.trim())}
              >
                Save incident
              </button>
              <button className="btn-secondary" onClick={() => setDraft(null)}>Back to notes</button>
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <aside className="dossier p-5 sm:p-6">
            <p className="system-label mb-1">Collision detected</p>
            <h2 className="font-medium mb-3">Similar records already exist</h2>
            <div className="space-y-2">
              {similar.map((s) => (
                <Link key={s.id} href={`/incidents/${s.id}`} className="block text-sm border border-brand/15 bg-ground/40 p-3 hover:border-brand">
                  <span className="font-medium">{s.title}</span>
                  <span className="font-mono text-xs text-ink/60 ml-2">{s.relevance} · {s.similarity}%</span>
                </Link>
              ))}
            </div>
          </aside>
        )}

        {error && <p role="alert" className="alert-error">{error}</p>}
      </main>
    </div>
  );
}
