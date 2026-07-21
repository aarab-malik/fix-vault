import { Attempt } from "@/lib/api";

const outcomeColor: Record<string, string> = {
  successful: "text-ok",
  failed: "text-fail",
  unknown: "text-ink/60",
};

export function TraceRail({ attempts, stopCode }: { attempts: Attempt[]; stopCode?: string }) {
  return (
    <div className="dossier grid sm:grid-cols-[10rem_1fr] overflow-hidden">
      {stopCode && (
        <div className="bg-brand text-white p-5 sm:p-6">
          <p className="system-label-light">Stop code</p>
          <p className="font-mono text-sm mt-3 break-all">{stopCode}</p>
        </div>
      )}
      <div className={`p-5 sm:p-6 ${!stopCode ? "sm:col-span-2" : ""}`}>
        <p className="system-label mb-4">Attempt trace / chronological</p>
        {attempts.length === 0 ? (
          <p className="text-sm text-ink/60">No attempts recorded.</p>
        ) : (
          <div className="space-y-0">
            {attempts.map((a, i) => (
              <div key={i} className="relative border-l-2 border-brand/20 pl-6 pb-6 last:pb-0">
                <span className={`absolute -left-[5px] top-0 size-2 ${
                  a.outcome === "successful" ? "bg-ok" : a.outcome === "failed" ? "bg-fail" : "bg-warn"
                }`} />
                <p className="font-mono text-[10px] text-ink/45">TRACE_{String(i + 1).padStart(2, "0")}</p>
                <p className="text-sm font-medium mt-1">{a.action}</p>
                {a.result && <p className="text-sm text-ink/65 mt-1 leading-relaxed">{a.result}</p>}
                <p className={`font-mono text-[10px] uppercase tracking-wide mt-2 ${outcomeColor[a.outcome] || outcomeColor.unknown}`}>
                  Result: {a.outcome}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
