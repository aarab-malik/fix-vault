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

  useEffect(() => {
    api.dashboard().then(setData);
  }, []);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.listIncidents({ search, ...filter });
    setData((d) => (d ? { ...d, recent: res.items } : null));
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <p className="font-mono text-sm text-ink/60">Loading dashboard…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-medium">Dashboard</h1>
          <p className="text-sm text-ink/70 mt-1">Your personal bug-fix archive.</p>
        </div>

        <form onSubmit={runSearch} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Search incidents in plain language…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <div className="flex flex-wrap gap-2 text-sm">
          <FilterButton label="All" active={!filter.status && !filter.tag} onClick={async () => { setFilter({}); const res = await api.listIncidents({ search: search || undefined }); setData((d) => d ? { ...d, recent: res.items } : null); }} />
          <FilterButton label="Unresolved" active={filter.status === "unresolved"} onClick={async () => { setFilter({ status: "unresolved" }); const res = await api.listIncidents({ status: "unresolved", search: search || undefined }); setData((d) => d ? { ...d, recent: res.items } : null); }} />
          <FilterButton label="Resolved" active={filter.status === "resolved"} onClick={async () => { setFilter({ status: "resolved" }); const res = await api.listIncidents({ status: "resolved", search: search || undefined }); setData((d) => d ? { ...d, recent: res.items } : null); }} />
          {data.recurring_tags.slice(0, 6).map((t) => (
            <FilterButton key={t.tag} label={`${t.tag} (${t.count})`} active={filter.tag === t.tag} onClick={async () => { setFilter({ tag: t.tag }); const res = await api.listIncidents({ tag: t.tag, search: search || undefined }); setData((d) => d ? { ...d, recent: res.items } : null); }} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="panel p-4">
            <p className="text-sm text-ink/60">Total incidents</p>
            <p className="text-2xl font-medium">{data.total}</p>
          </div>
          <div className="panel p-4">
            <p className="text-sm text-ink/60">Unresolved</p>
            <p className="text-2xl font-medium text-warn">{data.unresolved}</p>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Recent incidents</h2>
            <Link href="/incidents/new" className="text-sm text-brand">Add incident</Link>
          </div>
          <div className="space-y-3">
            {data.recent.length === 0 ? (
              <p className="text-sm text-ink/60">No incidents yet. <Link href="/incidents/new" className="text-brand">Add your first</Link>.</p>
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
    <button className={active ? "btn-primary" : "btn-secondary"} onClick={onClick}>
      {label}
    </button>
  );
}
