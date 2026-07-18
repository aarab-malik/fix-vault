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
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="panel p-6">
            <h1 className="font-medium text-ok">Incident saved</h1>
            <Link href={`/incidents/${savedId}`} className="btn-primary inline-block mt-4">View incident</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-medium">Add incident</h1>
          <p className="text-sm text-ink/70 mt-1">Paste rough notes. FixVault structures them before you save.</p>
        </div>

        {!draft ? (
          <div className="space-y-3">
            <textarea
              className="input min-h-[160px]"
              placeholder="My Azure VM stopped accepting SSH after I installed Docker…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button className="btn-primary" onClick={generateDraft} disabled={busy || notes.length < 10}>
              {busy ? "Processing…" : "Generate draft"}
            </button>
          </div>
        ) : (
          <div className="panel p-6 space-y-4">
            <div>
              <label className="label">Title</label>
              <input className="input" value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} />
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
            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={save}
                disabled={busy || draft.attempts.some((attempt) => !attempt.action.trim())}
              >
                Save incident
              </button>
              <button className="btn-secondary" onClick={() => setDraft(null)}>Back to notes</button>
            </div>
          </div>
        )}

        {similar.length > 0 && (
          <div className="panel p-4">
            <h2 className="font-medium mb-2">Similar past incidents</h2>
            <div className="space-y-2">
              {similar.map((s) => (
                <Link key={s.id} href={`/incidents/${s.id}`} className="block text-sm border border-panel p-3 hover:border-brand">
                  <span className="font-medium">{s.title}</span>
                  <span className="font-mono text-xs text-ink/60 ml-2">{s.relevance} · {s.similarity}%</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-fail">{error}</p>}
      </main>
    </div>
  );
}
