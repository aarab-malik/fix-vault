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
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="flex items-center gap-4">
          <span className="file-tab-warn">Memory interrogation</span>
          <div className="diagnostic-ruler flex-1 opacity-60" />
          <span className="hidden sm:block stamp text-brand">Grounded mode</span>
        </div>
        <section className="dossier paper-stack grid lg:grid-cols-[0.8fr_1.5fr] overflow-hidden">
          <div className="relative bg-brand text-white p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
            <span className="pointer-events-none absolute -right-3 top-4 font-mono text-[10rem] text-white/[0.04]" aria-hidden>?</span>
            <div>
              <p className="system-label-light">Memory query / semantic scan</p>
              <p className="font-mono text-5xl mt-7" aria-hidden>?</p>
              <h1 className="text-2xl font-medium mt-4">Ask what your archive remembers.</h1>
              <p className="text-sm leading-relaxed text-white/70 mt-3">
                FixVault compares prior incidents, recovered fixes, and failed attempts before it answers.
              </p>
            </div>
            <p className="font-mono text-[10px] text-white/40 mt-10">
              RESPONSE_MODE: GROUNDED_ONLY
            </p>
          </div>

          <form onSubmit={submit} className="relative p-6 sm:p-8 flex flex-col bg-[#F8FBFE]">
            <div className="absolute right-5 top-4 font-mono text-[9px] text-brand/30">QUERY_FORM / 0x02</div>
            <label className="label" htmlFor="memory-question">Question for your archive</label>
            <textarea
              id="memory-question"
              className="input min-h-40 resize-y"
              placeholder="What finally fixed the SSH timeout on my Azure VM?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
              <p className="font-mono text-[10px] text-ink/45">CITATIONS + FAILED-FIX CHECK ENABLED</p>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Scanning memory…" : "Run memory query →"}
              </button>
            </div>
          </form>
        </section>

        {error && <p role="alert" className="alert-error">{error}</p>}

        {answer && (
          <section className="dossier overflow-hidden">
            <div className="bg-[#EAF4FF] border-b border-brand/15 px-5 py-3 flex items-center justify-between">
              <h2 className="system-label">Recovered answer</h2>
              <span className="font-mono text-[10px] text-brand/55">{citations.length} SOURCE(S)</span>
            </div>
            <div className="p-5 sm:p-7 space-y-6">
              <div className="grid sm:grid-cols-[5rem_1fr] gap-4">
                <div className="hidden sm:block border-r border-brand/15 font-mono text-[9px] leading-5 text-brand/35">
                  0001<br />0010<br />0011<br />0100<br />0101<br />0110
                </div>
                <p className="text-[15px] leading-7 whitespace-pre-wrap">{answer}</p>
              </div>

              {warnings.length > 0 && (
                <div className="alert-warning">
                  <p className="font-mono text-[11px] text-warn uppercase tracking-wide mb-2">Known dead end</p>
                  {warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              {citations.length > 0 && (
                <div className="section-rule">
                  <h3 className="system-label mb-3">Evidence register</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {citations.map((c, i) => (
                      <Link
                        key={i}
                        href={`/incidents/${c.incident_id}`}
                        className="border border-brand/15 bg-ground/50 p-4 text-sm hover:border-brand group"
                      >
                        <span className="font-mono text-[10px] text-brand">REF_{String(i + 1).padStart(2, "0")}</span>
                        <p className="font-medium mt-2 group-hover:text-brand">{c.title}</p>
                        <p className="font-mono text-[10px] text-ink/50 mt-1">
                          {c.match_score}% match · {c.section}
                        </p>
                        <p className="text-ink/65 mt-3 leading-relaxed">{c.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
