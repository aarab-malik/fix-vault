"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { IncidentCard } from "@/components/IncidentCard";
import { api } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<{
    total: number;
    unresolved: number;
    recent: Awaited<ReturnType<typeof api.dashboard>>["recent"];
    recurring_tags: { tag: string; count: number }[];
  } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<{ status?: string; tag?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .dashboard()
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.listIncidents({ search, ...filter });
      setData((d) => (d ? { ...d, recent: res.items } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="panel p-6" aria-live="polite">
            <p className="system-label">Boot sequence / archive</p>
            <p className="font-mono text-sm text-ink/60 mt-3">Loading incident memory…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-4 mb-7">
            <span className="file-tab-warn">Interrupted read</span>
            <div className="diagnostic-ruler flex-1 opacity-60" />
          </div>
          <div className="dossier paper-stack grid lg:grid-cols-[0.72fr_1.28fr] overflow-hidden">
            <div className="bg-fail text-white p-7 sm:p-9">
              <p className="font-mono text-6xl leading-none" aria-hidden>:(</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55 mt-7">Archive read fault</p>
              <p className="font-mono text-xs mt-2 text-white/80">CODE: API_CONNECTION_RESET</p>
            </div>
            <div className="p-7 sm:p-9">
              <p className="system-label">Recovery instruction</p>
              <h1 className="text-2xl font-semibold tracking-tight mt-2">The archive did not answer.</h1>
              <p className="page-copy mt-3">
                Your incident data is untouched. The API may be waking up or the current request was interrupted.
              </p>
              <p className="alert-error mt-5" role="alert">{error}</p>
              <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
                Retry archive read →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen">
      <Nav />
      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        <div className="flex items-center gap-4">
          <span className="file-tab">Archive index / A–Z</span>
          <div className="diagnostic-ruler flex-1 opacity-60" />
          <span className="hidden sm:block font-mono text-[9px] text-brand/45">
            VAULT_BLOCK: {String(data.total).padStart(4, "0")}
          </span>
        </div>
        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        <section className="dossier paper-stack grid lg:grid-cols-[1.55fr_0.75fr]">
          <div className="p-6 sm:p-8">
            <p className="system-label mb-3">System memory / overview</p>
            <h1 className="page-title max-w-2xl">Your recovery history is ready.</h1>
            <p className="page-copy mt-3 max-w-xl">
              Search what broke, inspect failed paths, and reuse the fix that held.
            </p>
            <form onSubmit={runSearch} className="mt-7 flex flex-col sm:flex-row gap-2">
              <label htmlFor="archive-search" className="sr-only">Search incident archive</label>
              <input
                id="archive-search"
                className="input flex-1"
                placeholder="Describe the symptom, error, or environment…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                Scan archive →
              </button>
            </form>
          </div>
          <div className="relative bg-brand text-white p-6 sm:p-8 flex flex-col justify-between min-h-56 overflow-hidden">
            <span className="pointer-events-none absolute -right-4 -top-8 font-mono text-[9rem] text-white/[0.045]" aria-hidden>
              FV
            </span>
            <div>
              <p className="system-label-light">Archive health</p>
              <p className="font-mono text-5xl mt-5">{data.total}</p>
              <p className="text-sm text-white/65 mt-1">incidents retained</p>
            </div>
            <div className="border-t border-white/20 pt-4 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wide text-white/55">Open loops</span>
              <span className="status-badge border-warn/50 text-[#FFD784]">{data.unresolved} unresolved</span>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-3">
          <div className="metric-tile">
            <p className="system-label">Recovered</p>
            <p className="font-mono text-3xl text-ok mt-3">{Math.max(data.total - data.unresolved, 0)}</p>
            <p className="text-xs text-ink/50 mt-1">closed incident loops</p>
          </div>
          <div className="metric-tile !bg-[#FFF4DC]">
            <p className="system-label !text-warn">Still open</p>
            <p className="font-mono text-3xl text-warn mt-3">{data.unresolved}</p>
            <p className="text-xs text-ink/50 mt-1">awaiting a durable fix</p>
          </div>
          <div className="metric-tile !bg-[#EAF4FF]">
            <p className="system-label">Recurring signals</p>
            <p className="font-mono text-3xl text-brand mt-3">{data.recurring_tags.length}</p>
            <p className="text-xs text-ink/50 mt-1">tag patterns detected</p>
          </div>
        </section>

        <section className="dossier p-4 sm:p-5" aria-label="Incident filters">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="system-label">Filter channels</p>
              <p className="hidden sm:block font-mono text-[10px] text-ink/45">SELECT ONE SIGNAL</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <FilterButton
                label="All records"
                active={!filter.status && !filter.tag}
                onClick={async () => {
                  setFilter({});
                  setError("");
                  try {
                    const res = await api.listIncidents({ search: search || undefined });
                    setData((d) => (d ? { ...d, recent: res.items } : null));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Filter failed");
                  }
                }}
              />
              <FilterButton
                label="Unresolved"
                active={filter.status === "unresolved"}
                onClick={async () => {
                  setFilter({ status: "unresolved" });
                  setError("");
                  try {
                    const res = await api.listIncidents({
                      status: "unresolved",
                      search: search || undefined,
                    });
                    setData((d) => (d ? { ...d, recent: res.items } : null));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Filter failed");
                  }
                }}
              />
              <FilterButton
                label="Resolved"
                active={filter.status === "resolved"}
                onClick={async () => {
                  setFilter({ status: "resolved" });
                  setError("");
                  try {
                    const res = await api.listIncidents({
                      status: "resolved",
                      search: search || undefined,
                    });
                    setData((d) => (d ? { ...d, recent: res.items } : null));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Filter failed");
                  }
                }}
              />
              {data.recurring_tags.slice(0, 6).map((t) => (
                <FilterButton
                  key={t.tag}
                  label={`${t.tag} · ${t.count}`}
                  active={filter.tag === t.tag}
                  onClick={async () => {
                    setFilter({ tag: t.tag });
                    setError("");
                    try {
                      const res = await api.listIncidents({
                        tag: t.tag,
                        search: search || undefined,
                      });
                      setData((d) => (d ? { ...d, recent: res.items } : null));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Filter failed");
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="system-label mb-1">Incident stream</p>
              <h2 className="text-2xl font-semibold tracking-tight">Recent records</h2>
            </div>
            <Link href="/incidents/new" className="btn-secondary">
              + Log incident
            </Link>
          </div>
          <div className="space-y-3">
            {data.recent.length === 0 ? (
              <div className="panel p-8 sm:p-12 text-center">
                <p className="font-mono text-4xl text-brand" aria-hidden>:)</p>
                <h3 className="font-medium mt-3">No matching incidents</h3>
                <p className="page-copy mt-1">The archive is quiet. Record the next failure while the details are fresh.</p>
                <Link href="/incidents/new" className="btn-primary mt-5">Add your first incident</Link>
              </div>
            ) : (
              data.recent.map((i) => <IncidentCard key={i.id} incident={i} />)
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={active ? "btn-primary" : "btn-secondary"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
