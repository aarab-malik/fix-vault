import type { IncidentSummary } from "@/lib/api";
import Link from "next/link";

const MAX_TAGS = 3;

export function IncidentCard({ incident }: { incident: IncidentSummary }) {
  const visibleTags = incident.tags.slice(0, MAX_TAGS);
  const hiddenTagCount = incident.tags.length - visibleTags.length;

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="surface group block hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex flex-col sm:grid sm:grid-cols-[6.5rem_1fr_auto]">
        <div
          className={`px-4 py-3 sm:py-4 border-b sm:border-b-0 sm:border-r border-brand/10 ${
            incident.status === "resolved" ? "bg-[#E8F5EF]" : "bg-[#FFF4DC]"
          }`}
        >
          <p className="system-label">{incident.status === "resolved" ? "Recovered" : "Open loop"}</p>
          <p className="font-mono text-xl mt-1 text-ink/80">
            {incident.status === "resolved" ? "OK" : "!!"}
          </p>
        </div>
        <div className="p-4 sm:px-5 min-w-0">
          <p className="font-mono text-xs uppercase tracking-wide text-ink/40 mb-1">
            {incident.id.slice(0, 8)}
          </p>
          <h3 className="font-medium group-hover:text-brand break-words line-clamp-2">{incident.title}</h3>
          {incident.stop_code && (
            <p className="font-mono text-xs text-brand mt-2 break-all">
              {incident.stop_code}
            </p>
          )}
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {visibleTags.map((tag) => (
                <span key={tag} className="border border-brand/15 bg-ground px-2 py-0.5 font-mono text-xs text-ink/60">
                  {tag}
                </span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="font-mono text-xs text-ink/45 px-1">+{hiddenTagCount}</span>
              )}
            </div>
          )}
        </div>
        <div className="hidden sm:flex items-center px-5 font-mono text-lg text-brand" aria-hidden>
          →
        </div>
      </div>
    </Link>
  );
}
