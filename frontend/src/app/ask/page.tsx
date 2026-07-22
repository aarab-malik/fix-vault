"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { SetupRequired } from "@/components/SetupRequired";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, Citation } from "@/lib/api";
import Link from "next/link";

export default function AskPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  if (user && !user.credentials_configured) {
    return <SetupRequired feature="ask" />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.ask(question);
      setAnswer(res.answer);
      setCitations(res.citations);
      setWarnings(res.failed_fix_warnings);
      setNeedsSetup(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 428) {
        setNeedsSetup(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  if (needsSetup) {
    return <SetupRequired feature="ask" />;
  }

  return (
    <div className="page-shell">
      <Nav />
      <main id="main-content" className="page-main page-main-narrow page-stack">
        <div className="page-header">
          <span className="file-tab-warn">Memory interrogation</span>
          <div className="page-header-rule" />
          <span className="stamp text-brand">Grounded mode</span>
        </div>

        <section className="surface overflow-hidden">
          <div className="bg-brand text-white p-5 sm:p-6">
            <p className="system-label-light">Memory query</p>
            <h1 className="text-xl sm:text-2xl font-medium mt-2">Ask what your archive remembers.</h1>
            <p className="text-sm leading-relaxed text-white/70 mt-2">
              FixVault compares prior incidents, recovered fixes, and failed attempts before it answers.
            </p>
          </div>

          <form onSubmit={submit} className="p-5 sm:p-6 space-y-4">
            <label className="label" htmlFor="memory-question">Question for your archive</label>
            <textarea
              id="memory-question"
              className="input min-h-36 resize-y"
              placeholder="What finally fixed the SSH timeout on my Azure VM?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
            <div className="action-row sm:justify-end">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Scanning memory…" : "Run memory query →"}
              </button>
            </div>
          </form>
        </section>

        {error && <p role="alert" className="alert-error">{error}</p>}

        {answer && (
          <section className="surface overflow-hidden">
            <div className="bg-[#EAF4FF] border-b border-brand/15 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="system-label">Recovered answer</h2>
              <span className="font-mono text-xs text-brand/55">{citations.length} source(s)</span>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              <p className="text-[15px] leading-7 whitespace-pre-wrap break-words">{answer}</p>

              {warnings.length > 0 && (
                <details className="alert-warning" open={warnings.length <= 2}>
                  <summary className="font-mono text-xs text-warn uppercase tracking-wide cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    Known dead ends ({warnings.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {warnings.map((w, i) => (
                      <p key={i} className="break-words">{w}</p>
                    ))}
                  </div>
                </details>
              )}

              {citations.length > 0 && (
                <details className="section-rule" open={citations.length <= 2}>
                  <summary className="system-label cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    Evidence register ({citations.length})
                  </summary>
                  <div className="grid md:grid-cols-2 gap-3 mt-4">
                    {citations.map((c, i) => (
                      <Link
                        key={i}
                        href={`/incidents/${c.incident_id}`}
                        className="border border-brand/15 bg-ground/50 p-4 text-sm hover:border-brand group"
                      >
                        <span className="font-mono text-xs text-brand">Ref {i + 1}</span>
                        <p className="font-medium mt-2 group-hover:text-brand break-words">{c.title}</p>
                        <p className="font-mono text-xs text-ink/50 mt-1">
                          {c.match_score}% match · {c.section}
                        </p>
                        <p className="text-ink/65 mt-3 leading-relaxed break-words line-clamp-4">{c.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
