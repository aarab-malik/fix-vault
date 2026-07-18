import type { IncidentSummary } from "@/lib/api";
import Link from "next/link";

export function IncidentCard({ incident }: { incident: IncidentSummary }) {
  return (
    <Link href={`/incidents/${incident.id}`} className="panel block p-4 hover:border-brand">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{incident.title}</h3>
          {incident.stop_code && (
            <p className="font-mono text-xs text-brand mt-1">{incident.stop_code}</p>
          )}
        </div>
        <span className={incident.status === "resolved" ? "status-resolved text-sm" : "status-unresolved text-sm"}>
          {incident.status}
        </span>
      </div>
      {incident.tags.length > 0 && (
        <p className="text-xs text-ink/60 mt-2">{incident.tags.join(" · ")}</p>
      )}
    </Link>
  );
}
