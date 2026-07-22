"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import { AttemptEditor } from "@/components/AttemptEditor";
import { MobileSection } from "@/components/MobileSection";
import { SetupRequired } from "@/components/SetupRequired";
import { TraceRail } from "@/components/TraceRail";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, IncidentDetail } from "@/lib/api";
import Link from "next/link";

const MAX_TAGS = 4;

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (user && !user.credentials_configured) {
      setNeedsSetup(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setNeedsSetup(false);
    api
      .getIncident(id)
      .then(setIncident)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 428) {
          setNeedsSetup(true);
          setIncident(null);
          return;
        }
        setIncident(null);
        setError(err instanceof ApiError ? err.message : "Failed to load incident");
      })
      .finally(() => setLoading(false));
  }, [id, user]);

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

  if (needsSetup || (user && !user.credentials_configured)) {
    return <SetupRequired feature="incident" />;
  }

  if (loading) {
    return (
      <div className="page-shell">
        <Nav />
        <main id="main-content" className="page-main page-main-narrow">
          <div className="surface-pad" aria-live="polite">
            <p className="system-label">Reading archive block</p>
            <p className="font-mono text-sm text-ink/60 mt-3">Loading incident trace…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="page-shell">
        <Nav />
        <main id="main-content" className="page-main page-main-narrow">
          <div className="surface-pad space-y-4">
            <p className="system-label">Incident unavailable</p>
            <p className="alert-error break-words" role="alert">
              {error || "Incident not found"}
            </p>
            <Link href="/dashboard" className="btn-primary w-full sm:w-auto inline-flex">
              Back to archive
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const visibleTags = incident.tags.slice(0, MAX_TAGS);
  const hiddenTagCount = incident.tags.length - visibleTags.length;

  return (
    <div className="page-shell">
      <Nav />
      <main id="main-content" className="page-main page-main-narrow page-stack">
        <div className="page-header">
          <span className={incident.status === "resolved" ? "file-tab" : "file-tab-warn"}>
            Incident dossier
          </span>
          <div className="page-header-rule" />
          <span className="font-mono text-xs text-brand/45">
            {id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <header className="surface-pad space-y-4">
          <Link href="/dashboard" className="system-label hover:underline">← Archive</Link>
          <h1 className="page-title break-words">{incident.title}</h1>
          <p
            className={`status-badge ${
              incident.status === "resolved"
                ? "status-resolved border-ok/30 bg-[#E8F5EF]"
                : "status-unresolved border-warn/30 bg-[#FFF4DC]"
            }`}
          >
            {incident.status}
          </p>
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span key={tag} className="border border-brand/20 bg-[#EAF4FF] px-2 py-1 font-mono text-xs text-brand">
                  #{tag}
                </span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="font-mono text-xs text-ink/45 px-1">+{hiddenTagCount}</span>
              )}
            </div>
          )}
          <div className="action-row sm:justify-start">
            <button className="btn-secondary" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : "Edit"}
            </button>
            <button className="btn-danger" onClick={remove}>Delete</button>
          </div>
        </header>

        {editing ? (
          <div className="surface-pad">
            <AttemptEditor
              attempts={incident.attempts}
              onChange={(attempts) => setIncident({ ...incident, attempts })}
            />
          </div>
        ) : (
          <TraceRail attempts={incident.attempts} stopCode={incident.stop_code} />
        )}

        <div className="page-stack">
          <MobileSection title="Problem" defaultOpen>
            <SectionContent
              label="Problem"
              value={incident.problem}
              editing={editing}
              onChange={(v) => setIncident({ ...incident, problem: v })}
            />
          </MobileSection>

          <MobileSection title="Environment">
            <SectionContent
              label="Environment"
              value={incident.environment || ""}
              editing={editing}
              onChange={(v) => setIncident({ ...incident, environment: v })}
            />
          </MobileSection>

          <MobileSection title="Error messages" subtitle="Exact errors and logs" defaultOpen>
            <SectionContent
              label="Error messages"
              value={incident.error_messages || ""}
              editing={editing}
              mono
              onChange={(v) => setIncident({ ...incident, error_messages: v })}
            />
          </MobileSection>

          <MobileSection title="Root cause">
            <SectionContent
              label="Root cause"
              value={incident.root_cause || ""}
              editing={editing}
              onChange={(v) => setIncident({ ...incident, root_cause: v })}
            />
          </MobileSection>

          <MobileSection title="Final fix" subtitle="What actually worked" defaultOpen>
            <SectionContent
              label="Final fix"
              value={incident.final_fix || ""}
              editing={editing}
              onChange={(v) => setIncident({ ...incident, final_fix: v })}
            />
          </MobileSection>

          {editing && (
            <div className="surface-pad">
              <label className="label">Status</label>
              <select className="input" value={incident.status} onChange={(e) => setIncident({ ...incident, status: e.target.value })}>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}

          <details className="surface-pad">
            <summary className="system-label cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Original notes
            </summary>
            <p className="bg-ground/60 border-l-4 border-brand/20 p-4 text-ink/70 prose-mono mt-4 max-w-full overflow-x-auto">
              {incident.original_notes}
            </p>
          </details>
        </div>

        {editing && (
          <div className="action-row">
            <button
              className="btn-primary"
              onClick={save}
              disabled={busy || incident.attempts.some((attempt) => !attempt.action.trim())}
            >
              Save changes
            </button>
          </div>
        )}
        {error && <p role="alert" className="alert-error break-words">{error}</p>}
      </main>
    </div>
  );
}

function SectionContent({
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
      <p className="label sm:sr-only">{label}</p>
      {editing ? (
        <textarea
          className={`input min-h-24 ${mono ? "prose-mono" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className={`whitespace-pre-wrap break-words ${mono ? "prose-mono" : ""} ${value ? "" : "text-ink/50"}`}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}
