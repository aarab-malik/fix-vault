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
    <div className="space-y-3">
      <div>
        <p className="label">Attempt trace</p>
        <p className="text-xs text-ink/60">
          Record each troubleshooting step, what happened, and whether it worked.
        </p>
      </div>

      {attempts.map((attempt, index) => (
        <div key={attempt.id || index} className="border border-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-brand uppercase">Attempt {index + 1}</p>
            <button
              type="button"
              className="text-xs text-fail"
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
              className="input min-h-[60px]"
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
        className="btn-secondary"
        onClick={() => onChange([...attempts, { ...EMPTY_ATTEMPT }])}
      >
        + Add attempt
      </button>
    </div>
  );
}
