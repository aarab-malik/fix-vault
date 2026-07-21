"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import { AttemptEditor } from "@/components/AttemptEditor";
import { TraceRail } from "@/components/TraceRail";
import { api, ApiError, IncidentDetail } from "@/lib/api";
import Link from "next/link";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getIncident(id)
      .then(setIncident)
      .catch((err) => {
        setIncident(null);
        setError(err instanceof ApiError ? err.message : "Failed to load incident");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!incident) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.updateIncident(id, {
        title: incident.title,
        problem: incident.problem,
        environment: incident.environment,
        error_messages: incident.error_messages,
        root_cause: incident.root_cause,
        final_fix: incident.final_fix,
        status: incident.status,
        tags: incident.tags,
        attempts: incident.attempts,
      });
      setIncident(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this incident?")) return;
    setError("");
    try {
      await api.deleteIncident(id);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="panel p-6" aria-live="polite">
            <p className="system-label">Reading archive block</p>
            <p className="font-mono text-sm text-ink/60 mt-3">Loading incident trace…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="panel p-6 space-y-4">
            <p className="system-label">Incident unavailable</p>
            <p className="alert-error" role="alert">
              {error || "Incident not found"}
            </p>
            <Link href="/dashboard" className="btn-primary">
              Back to archive
            </Link>
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
          <span className={incident.status === "resolved" ? "file-tab" : "file-tab-warn"}>
            Incident dossier
          </span>
          <div className="diagnostic-ruler flex-1 opacity-60" />
          <span className="hidden sm:block font-mono text-[9px] text-brand/45">
            ID: {id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <header className="dossier paper-stack p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <Link href="/dashboard" className="system-label hover:underline">← Archive</Link>
            <h1 className="page-title mt-3">{incident.title}</h1>
            <p className={`status-badge mt-4 ${
              incident.status === "resolved"
                ? "status-resolved border-ok/30 bg-[#E8F5EF]"
                : "status-unresolved border-warn/30 bg-[#FFF4DC]"
            }`}>
              {incident.status}
            </p>
            {incident.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {incident.tags.map((tag) => (
                  <span key={tag} className="border border-brand/20 bg-[#EAF4FF] px-2 py-1 font-mono text-[10px] text-brand">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit"}</button>
            <button className="btn-secondary !border-fail/25 text-fail hover:!border-fail hover:!bg-[#FCEAEA]" onClick={remove}>Delete</button>
          </div>
        </header>

        {editing ? (
          <div className="panel p-6 sm:p-8">
            <AttemptEditor
              attempts={incident.attempts}
              onChange={(attempts) => setIncident({ ...incident, attempts })}
            />
          </div>
        ) : (
          <TraceRail attempts={incident.attempts} stopCode={incident.stop_code} />
        )}

        <div className="dossier p-6 sm:p-8 space-y-6 text-sm">
          <Section label="Problem" value={incident.problem} editing={editing} onChange={(v) => setIncident({ ...incident, problem: v })} />
          <Section label="Environment" value={incident.environment || ""} editing={editing} onChange={(v) => setIncident({ ...incident, environment: v })} />
          <Section label="Error messages" value={incident.error_messages || ""} editing={editing} mono onChange={(v) => setIncident({ ...incident, error_messages: v })} />
          <Section label="Root cause" value={incident.root_cause || ""} editing={editing} onChange={(v) => setIncident({ ...incident, root_cause: v })} />
          <Section label="Final fix" value={incident.final_fix || ""} editing={editing} onChange={(v) => setIncident({ ...incident, final_fix: v })} />
          {editing && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={incident.status} onChange={(e) => setIncident({ ...incident, status: e.target.value })}>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}
          <div>
            <p className="system-label mb-2">Original notes / immutable source</p>
            <p className="bg-ground/60 border-l-4 border-brand/20 p-4 text-ink/70 whitespace-pre-wrap font-mono text-xs leading-relaxed">{incident.original_notes}</p>
          </div>
        </div>

        {editing && (
          <button
            className="btn-primary"
            onClick={save}
            disabled={busy || incident.attempts.some((attempt) => !attempt.action.trim())}
          >
            Save changes
          </button>
        )}
        {error && <p role="alert" className="alert-error">{error}</p>}
      </main>
    </div>
  );
}

function Section({
  label,
  value,
  editing,
  mono,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  mono?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="section-rule first:border-t-0 first:pt-0">
      <p className="label">{label}</p>
      {editing ? (
        <textarea className={`input min-h-[60px] ${mono ? "font-mono text-sm" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className={`whitespace-pre-wrap ${mono ? "font-mono text-sm" : ""} ${value ? "" : "text-ink/50"}`}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}
