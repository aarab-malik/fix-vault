"use client";

import { useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { IncidentCard } from "@/components/IncidentCard";
import { SetupRequired } from "@/components/SetupRequired";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DashboardData = {
  total: number;
  unresolved: number;
  recent: Awaited<ReturnType<typeof api.dashboard>>["recent"];
  recurring_tags: { tag: string; count: number }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<{ status?: string; tag?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const fetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      setLoading(false);
      return;
    }

    if (!user.credentials_configured) {
      setNeedsSetup(true);
      setLoading(false);
      return;
    }

    // Avoid refetching when AuthProvider only refreshes the same account object.
    if (fetchedForUser.current === user.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setNeedsSetup(false);

    api
      .dashboard()
      .then((res) => {
        if (cancelled) return;
        fetchedForUser.current = user.id;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 428) {
          setNeedsSetup(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, router]);

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

  async function applyFilter(next: { status?: string; tag?: string }) {
    setFilter(next);
    setError("");
    try {
      const res = await api.listIncidents({
        ...next,
        search: search || undefined,
      });
      setData((d) => (d ? { ...d, recent: res.items } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filter failed");
    }
  }

  if (!ready || (loading && !data && !needsSetup)) {
    return (
      <div className="page-shell">
        <Nav />
        <main id="main-content" className="page-main page-stack">
          <div className="page-header">
            <span className="file-tab">Archive index</span>
          </div>
          <div className="surface-pad" aria-live="polite">
            <p className="system-label">Archive</p>
            <p className="font-mono text-sm text-ink/60 mt-3">Loading incident memory…</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="metric-tile h-24 animate-pulse bg-brand/5" />
            <div className="metric-tile h-24 animate-pulse bg-brand/5" />
            <div className="metric-tile h-24 animate-pulse bg-brand/5 col-span-2 sm:col-span-1" />
          </div>
        </main>
      </div>
    );
  }

  if (needsSetup || (user && !user.credentials_configured)) {
    return <SetupRequired feature="archive" />;
  }

  if (error && !data) {
    return (
      <div className="page-shell">
        <Nav />
        <main id="main-content" className="page-main page-stack">
          <div className="page-header">
            <span className="file-tab-warn">Interrupted read</span>
          </div>
          <section className="surface overflow-hidden">
            <div className="bg-fail text-white p-5 sm:p-6">
              <p className="system-label-light">Archive read fault</p>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-2">The archive did not answer.</h1>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <p className="page-copy">
                Your API is up. This usually means the login cookie was not sent, or an incident
                request failed. Log in again, then retry.
              </p>
              <p className="alert-error" role="alert">{error}</p>
              <div className="action-row">
                <button
                  className="btn-primary"
                  onClick={() => {
                    fetchedForUser.current = null;
                    setLoading(true);
                    setError("");
                    api
                      .dashboard()
                      .then((res) => {
                        if (user) fetchedForUser.current = user.id;
                        setData(res);
                      })
                      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
                      .finally(() => setLoading(false));
                  }}
                >
                  Retry archive read →
                </button>
                <Link href="/login" className="btn-secondary">
                  Go to login
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page-shell">
      <Nav />
      <main id="main-content" className="page-main page-stack">
        <div className="page-header">
          <span className="file-tab">Archive index</span>
          <div className="page-header-rule" />
          <span className="font-mono text-xs text-brand/45">
            {data.total} records
          </span>
        </div>

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}

        <section className="surface overflow-hidden">
          <div className="p-5 sm:p-6 lg:grid lg:grid-cols-[1.4fr_0.8fr] lg:gap-6">
            <div>
              <p className="system-label mb-2">Overview</p>
              <h1 className="page-title">Your recovery history is ready.</h1>
              <p className="page-copy mt-3">
                Search what broke, inspect failed paths, and reuse the fix that held.
              </p>
              <form onSubmit={runSearch} className="mt-6 space-y-3">
                <label htmlFor="archive-search" className="sr-only">Search incident archive</label>
                <input
                  id="archive-search"
                  className="input"
                  placeholder="Describe the symptom, error, or environment…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className="btn-primary w-full sm:w-auto">
                  Scan archive →
                </button>
              </form>
            </div>
            <div className="mt-5 lg:mt-0 bg-brand text-white p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div>
                <p className="system-label-light">Archive health</p>
                <p className="font-mono text-4xl mt-3">{data.total}</p>
                <p className="text-sm text-white/65 mt-1">incidents retained</p>
              </div>
              <div className="border-t border-white/20 pt-4 flex items-center justify-between gap-3">
                <span className="font-mono text-xs uppercase tracking-wide text-white/55">Open loops</span>
                <span className="status-badge border-warn/50 text-[#FFD784]">{data.unresolved} unresolved</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="metric-tile">
            <p className="system-label">Recovered</p>
            <p className="font-mono text-2xl sm:text-3xl text-ok mt-2">{Math.max(data.total - data.unresolved, 0)}</p>
          </div>
          <div className="metric-tile bg-[#FFF4DC]">
            <p className="system-label text-warn">Still open</p>
            <p className="font-mono text-2xl sm:text-3xl text-warn mt-2">{data.unresolved}</p>
          </div>
          <div className="metric-tile bg-[#EAF4FF] col-span-2 sm:col-span-1">
            <p className="system-label">Recurring signals</p>
            <p className="font-mono text-2xl sm:text-3xl text-brand mt-2">{data.recurring_tags.length}</p>
          </div>
        </section>

        <section className="surface-pad space-y-4" aria-label="Incident filters">
          <div>
            <p className="system-label mb-1">Filters</p>
            <p className="text-xs text-ink/55">Narrow by status or recurring tags</p>
          </div>
          <div className="action-row">
            <FilterButton
              label="All records"
              active={!filter.status && !filter.tag}
              onClick={() => applyFilter({})}
            />
            <FilterButton
              label="Unresolved"
              active={filter.status === "unresolved"}
              onClick={() => applyFilter({ status: "unresolved" })}
            />
            <FilterButton
              label="Resolved"
              active={filter.status === "resolved"}
              onClick={() => applyFilter({ status: "resolved" })}
            />
          </div>
          {data.recurring_tags.length > 0 && (
            <div>
              <p className="system-label mb-3">Tags</p>
              <div className="action-row">
                {data.recurring_tags.slice(0, 6).map((t) => (
                  <FilterButton
                    key={t.tag}
                    label={`${t.tag} · ${t.count}`}
                    active={filter.tag === t.tag}
                    onClick={() => applyFilter({ tag: t.tag })}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <p className="system-label mb-1">Incident stream</p>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Recent records</h2>
            </div>
            <Link href="/incidents/new" className="btn-secondary w-full sm:w-auto shrink-0">
              + Log incident
            </Link>
          </div>
          <div className="space-y-3">
            {data.recent.length === 0 ? (
              <div className="surface-pad text-center">
                <p className="font-mono text-4xl text-brand" aria-hidden>:)</p>
                <h3 className="font-medium mt-3">No matching incidents</h3>
                <p className="page-copy mt-1">The archive is quiet. Record the next failure while the details are fresh.</p>
                <Link href="/incidents/new" className="btn-primary mt-5 w-full sm:w-auto inline-flex">Add your first incident</Link>
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
