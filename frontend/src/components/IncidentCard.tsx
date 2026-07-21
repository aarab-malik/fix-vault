import type { IncidentSummary } from "@/lib/api";
import Link from "next/link";

export function IncidentCard({ incident }: { incident: IncidentSummary }) {
  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="dossier group block overflow-hidden hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="grid sm:grid-cols-[7rem_1fr_auto]">
        <div className={`p-4 border-b sm:border-b-0 sm:border-r border-brand/10 ${
          incident.status === "resolved" ? "bg-[#E8F5EF]" : "bg-[#FFF4DC]"
        }`}>
          <p className="system-label">{incident.status === "resolved" ? "Recovered" : "Open loop"}</p>
          <p className="font-mono text-2xl mt-2 text-ink/80">
            {incident.status === "resolved" ? "OK" : "!!"}
          </p>
        </div>
        <div className="p-4 sm:px-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink/35 mb-1.5">
            ARCHIVE/{incident.id.slice(0, 8)}
          </p>
          <h3 className="font-medium group-hover:text-brand">{incident.title}</h3>
          {incident.stop_code && (
            <p className="font-mono text-[11px] text-brand mt-2 break-all">
              STOP_CODE: {incident.stop_code}
            </p>
          )}
          {incident.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {incident.tags.map((tag) => (
                <span key={tag} className="border border-brand/15 bg-ground px-2 py-0.5 font-mono text-[10px] text-ink/60">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center px-5 font-mono text-lg text-brand" aria-hidden>→</div>
      </div>
    </Link>
  );
}
