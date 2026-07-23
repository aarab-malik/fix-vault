import Link from "next/link";
import Nav from "@/components/Nav";

const COPY: Record<string, { title: string; body: string; code: string; needs: string[] }> = {
  archive: {
    title: "Your archive is not fully connected yet.",
    body: "FixVault needs a chat provider, an embedding provider, and Pinecone before semantic search and incident indexing can work.",
    code: "ARCHIVE_OFFLINE",
    needs: ["Chat provider for drafting incidents", "Embedding provider for semantic search", "Pinecone index for vector storage"],
  },
  ask: {
    title: "Memory query is locked.",
    body: "Ask Memory needs both a chat provider and embeddings plus Pinecone so answers can be grounded in your incident history.",
    code: "QUERY_LOCKED",
    needs: ["Chat provider", "Embedding provider", "Pinecone index"],
  },
  log: {
    title: "Incident intake needs a chat provider.",
    body: "Connect a chat provider to structure rough notes. You will also need embeddings and Pinecone before saving incidents to semantic memory.",
    code: "INTAKE_LOCKED",
    needs: ["Chat provider to structure notes", "Embedding provider + Pinecone to save to memory"],
  },
  incident: {
    title: "Semantic memory is not connected.",
    body: "Open Connections and finish your embedding provider and Pinecone setup before indexing or searching incidents.",
    code: "DOSSIER_LOCKED",
    needs: ["Embedding provider", "Pinecone index"],
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
              System notice · providers missing
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-2">{copy.title}</h1>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <p className="page-copy max-w-2xl">{copy.body}</p>

            <div className="alert-warning space-y-2">
              <p className="font-mono text-xs uppercase tracking-wide text-warn">Still needed</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-ink/80">
                {copy.needs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="action-row">
              <Link href="/settings" className="btn-primary">
                Finish setup in Connections →
              </Link>
              <Link href="/dashboard" className="btn-secondary">
                Back to Archive
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
