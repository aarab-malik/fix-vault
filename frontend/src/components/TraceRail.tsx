import { Attempt } from "@/lib/api";

const outcomeColor: Record<string, string> = {
  successful: "text-ok",
  failed: "text-fail",
  unknown: "text-ink/60",
};

export function TraceRail({ attempts, stopCode }: { attempts: Attempt[]; stopCode?: string }) {
  return (
    <div className="flex gap-4">
      {stopCode && (
        <div className="w-28 shrink-0 border-r border-panel pr-3">
          <p className="font-mono text-xs text-brand uppercase tracking-wide">Stop code</p>
          <p className="font-mono text-sm mt-1 break-all">{stopCode}</p>
        </div>
      )}
      <div className="flex-1 space-y-2">
        <p className="font-mono text-xs text-ink/60 uppercase">Attempt trace</p>
        {attempts.length === 0 ? (
          <p className="text-sm text-ink/60">No attempts recorded.</p>
        ) : (
          attempts.map((a, i) => (
            <div key={i} className="border-l-2 border-panel pl-3 py-1">
              <p className="text-sm">{a.action}</p>
              {a.result && <p className="text-sm text-ink/70 mt-1">{a.result}</p>}
              <p className={`font-mono text-xs mt-1 ${outcomeColor[a.outcome] || outcomeColor.unknown}`}>
                {a.outcome}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
