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

  useEffect(() => {
    api.getIncident(id).then(setIncident).catch(() => setIncident(null));
  }, [id]);

  async function save() {
    if (!incident) return;
    setBusy(true);
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
    await api.deleteIncident(id);
    window.location.href = "/dashboard";
  }

  if (!incident) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-sm text-ink/60">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-brand">← Dashboard</Link>
            <h1 className="text-xl font-medium mt-2">{incident.title}</h1>
            <p className={incident.status === "resolved" ? "status-resolved text-sm mt-1" : "status-unresolved text-sm mt-1"}>
              {incident.status}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit"}</button>
            <button className="btn-secondary text-fail" onClick={remove}>Delete</button>
          </div>
        </div>

        {editing ? (
          <div className="panel p-6">
            <AttemptEditor
              attempts={incident.attempts}
              onChange={(attempts) => setIncident({ ...incident, attempts })}
            />
          </div>
        ) : (
          <TraceRail attempts={incident.attempts} stopCode={incident.stop_code} />
        )}

        <div className="panel p-6 space-y-4 text-sm">
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
            <p className="label">Original notes</p>
            <p className="text-ink/70 whitespace-pre-wrap">{incident.original_notes}</p>
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
        {error && <p className="text-sm text-fail">{error}</p>}
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
    <div>
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
