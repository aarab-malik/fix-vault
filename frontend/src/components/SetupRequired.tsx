import Link from "next/link";
import Nav from "@/components/Nav";

const COPY: Record<
  string,
  { title: string; body: string; code: string }
> = {
  archive: {
    title: "No archive is online yet.",
    body: "Finish connecting Gemini and Pinecone before you can view incidents, search history, or open the archive index.",
    code: "ARCHIVE_OFFLINE",
  },
  ask: {
    title: "Memory query is locked.",
    body: "Ask Memory needs your Gemini and Pinecone keys so answers can be grounded in your own incident history.",
    code: "QUERY_LOCKED",
  },
  log: {
    title: "Incident intake is locked.",
    body: "You can open this page, but logging a new incident requires Gemini and Pinecone to structure and store the record.",
    code: "INTAKE_LOCKED",
  },
  incident: {
    title: "Incident dossier is locked.",
    body: "Open Connections and finish provider setup before reading or editing incident records.",
    code: "DOSSIER_LOCKED",
  },
};

export function SetupRequired({
  feature = "archive",
}: {
  feature?: keyof typeof COPY;
}) {
  const copy = COPY[feature] || COPY.archive;

  return (
    <div className="page-shell">
      <Nav />
      <main id="main-content" className="page-main page-main-narrow page-stack">
        <div className="page-header">
          <span className="file-tab-warn">Setup required</span>
          <div className="page-header-rule" />
          <span className="font-mono text-xs text-brand/45">{copy.code}</span>
        </div>

        <section className="surface overflow-hidden" role="status" aria-live="polite">
          <div className="bg-warn text-ink p-5 sm:p-6 border-b border-warn/40">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/70">
              System notice · credentials missing
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-2">{copy.title}</h1>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <p className="page-copy max-w-2xl">{copy.body}</p>

            <div className="alert-warning space-y-2">
              <p className="font-mono text-xs uppercase tracking-wide text-warn">Required before use</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-ink/80">
                <li>Open Connections</li>
                <li>Add and test your Gemini key</li>
                <li>Add and test your Pinecone key</li>
              </ol>
            </div>

            <div className="action-row">
              <Link href="/settings" className="btn-primary">
                Finish setup in Connections →
              </Link>
              <Link href="/dashboard" className="btn-secondary">
                Back to Archive
              </Link>
            </div>

            <p className="font-mono text-xs text-ink/45">
              STATUS: PROVIDERS_NOT_CONFIGURED · ARCHIVE_EMPTY_UNTIL_CONNECTED
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
