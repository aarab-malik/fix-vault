import { Attempt } from "@/lib/api";

const outcomeColor: Record<string, string> = {
  successful: "text-ok",
  failed: "text-fail",
  unknown: "text-ink/60",
};

export function TraceRail({ attempts, stopCode }: { attempts: Attempt[]; stopCode?: string }) {
  return (
    <div className="surface overflow-hidden">
      <div className="grid sm:grid-cols-[9rem_1fr]">
        {stopCode && (
          <div className="bg-brand text-white p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-brand/20">
            <p className="system-label-light">Stop code</p>
            <p className="font-mono text-sm mt-2 break-all">{stopCode}</p>
          </div>
        )}
        <div className={`p-4 sm:p-5 ${!stopCode ? "sm:col-span-2" : ""}`}>
          <p className="system-label mb-4">Attempt trace</p>
          {attempts.length === 0 ? (
            <p className="text-sm text-ink/60">No attempts recorded.</p>
          ) : (
            <div className="space-y-0">
              {attempts.map((a, i) => (
                <div key={i} className="relative border-l-2 border-brand/20 pl-5 pb-5 last:pb-0">
                  <span
                    className={`absolute -left-[5px] top-0 size-2 ${
                      a.outcome === "successful" ? "bg-ok" : a.outcome === "failed" ? "bg-fail" : "bg-warn"
                    }`}
                  />
                  <p className="font-mono text-xs text-ink/45">Step {i + 1}</p>
                  <p className="text-sm font-medium mt-1 break-words">{a.action}</p>
                  {a.result && <p className="text-sm text-ink/65 mt-1 leading-relaxed break-words">{a.result}</p>}
                  <p className={`font-mono text-xs uppercase tracking-wide mt-2 ${outcomeColor[a.outcome] || outcomeColor.unknown}`}>
                    {a.outcome}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
