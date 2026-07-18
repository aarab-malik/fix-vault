"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { api, ApiError, Citation } from "@/lib/api";
import Link from "next/link";

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.ask(question);
      setAnswer(res.answer);
      setCitations(res.citations);
      setWarnings(res.failed_fix_warnings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-medium">Ask</h1>
          <p className="text-sm text-ink/70 mt-1">Search your archive in plain language.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <textarea
            className="input min-h-[100px]"
            placeholder="Have I faced something similar before? What fixed my SSH issue?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Searching…" : "Ask"}
          </button>
        </form>

        {error && <p className="text-sm text-fail">{error}</p>}

        {answer && (
          <div className="panel p-4 space-y-4">
            <h2 className="font-medium">Answer</h2>
            <p className="text-sm whitespace-pre-wrap">{answer}</p>

            {warnings.length > 0 && (
              <div className="border border-warn/40 bg-panel/50 p-3">
                <p className="font-mono text-xs text-warn uppercase mb-2">Failed fix warning</p>
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm">{w}</p>
                ))}
              </div>
            )}

            {citations.length > 0 && (
              <div>
                <h3 className="font-mono text-xs text-ink/60 uppercase mb-2">Sources used</h3>
                <div className="space-y-2">
                  {citations.map((c, i) => (
                    <div key={i} className="border border-panel p-3 text-sm">
                      <Link href={`/incidents/${c.incident_id}`} className="text-brand font-medium">
                        {i + 1}. {c.title}
                      </Link>
                      <p className="font-mono text-xs text-ink/60 mt-1">
                        Match: {c.match_score}% · {c.section}
                      </p>
                      <p className="text-ink/70 mt-1">{c.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
