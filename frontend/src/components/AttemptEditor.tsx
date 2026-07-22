import type { Attempt } from "@/lib/api";

const EMPTY_ATTEMPT: Attempt = {
  action: "",
  result: "",
  outcome: "unknown",
};

export function AttemptEditor({
  attempts,
  onChange,
}: {
  attempts: Attempt[];
  onChange: (attempts: Attempt[]) => void;
}) {
  function update(index: number, patch: Partial<Attempt>) {
    onChange(attempts.map((attempt, i) => (i === index ? { ...attempt, ...patch } : attempt)));
  }

  function remove(index: number) {
    onChange(attempts.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="system-label">Attempt trace</p>
          <p className="text-xs text-ink/60 mt-1">
            Record each troubleshooting step, what happened, and whether it worked.
          </p>
        </div>
        <span className="font-mono text-xs text-ink/45">{attempts.length} step(s)</span>
      </div>

      {attempts.map((attempt, index) => (
        <div key={attempt.id || index} className="relative border border-brand/15 bg-ground/40 p-4 space-y-3">
          <span
            className={`absolute left-0 top-0 bottom-0 w-1 ${
              attempt.outcome === "successful" ? "bg-ok" : attempt.outcome === "failed" ? "bg-fail" : "bg-warn"
            }`}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-xs text-brand uppercase">Step {index + 1}</p>
            <button
              type="button"
              className="min-h-11 self-start font-mono text-xs uppercase tracking-wide text-fail hover:underline"
              onClick={() => remove(index)}
            >
              Remove
            </button>
          </div>
          <div>
            <label className="label" htmlFor={`attempt-action-${index}`}>What did you try?</label>
            <input
              id={`attempt-action-${index}`}
              className="input"
              value={attempt.action}
              onChange={(e) => update(index, { action: e.target.value })}
              placeholder="Reinstalled the USB driver"
            />
          </div>
          <div>
            <label className="label" htmlFor={`attempt-result-${index}`}>What happened?</label>
            <textarea
              id={`attempt-result-${index}`}
              className="input min-h-[4.5rem] prose-mono"
              value={attempt.result || ""}
              onChange={(e) => update(index, { result: e.target.value })}
              placeholder="The crash returned after reconnecting the device"
            />
          </div>
          <div>
            <label className="label" htmlFor={`attempt-outcome-${index}`}>Outcome</label>
            <select
              id={`attempt-outcome-${index}`}
              className="input"
              value={attempt.outcome}
              onChange={(e) => update(index, { outcome: e.target.value })}
            >
              <option value="unknown">Inconclusive</option>
              <option value="failed">Failed</option>
              <option value="successful">Successful</option>
            </select>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn-secondary w-full sm:w-auto"
        onClick={() => onChange([...attempts, { ...EMPTY_ATTEMPT }])}
      >
        + Append attempt
      </button>
    </div>
  );
}
