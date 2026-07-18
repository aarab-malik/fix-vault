import Link from "next/link";

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Overview — quiet BSOD panel */}
      <aside className="relative bg-brand text-white px-8 py-10 lg:px-12 lg:py-14 flex flex-col justify-between overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10">
          <p className="font-mono text-sm tracking-wide text-white/80">FixVault</p>
          <p className="font-mono text-xs text-white/50 mt-1">STOP_CODE: PERSONAL_BUG_MEMORY</p>
        </div>

        <div className="relative z-10 max-w-md my-12 lg:my-0">
          <p className="font-mono text-5xl leading-none mb-6 select-none" aria-hidden>
            :(
          </p>
          <h1 className="text-3xl lg:text-4xl font-medium leading-tight">
            Your past fixes, when the next crash hits.
          </h1>
          <p className="mt-4 text-white/80 text-sm leading-relaxed">
            Record rough troubleshooting notes once. Later, ask in plain language what you already
            tried, what failed, and what finally worked — without replaying the same dead ends.
          </p>

          <ul className="mt-8 space-y-2 font-mono text-xs text-white/70">
            <li className="border border-white/25 px-3 py-2">Record · search · compare incidents</li>
            <li className="border border-white/25 px-3 py-2">Attempt traces mark failed vs fixed</li>
            <li className="border border-white/25 px-3 py-2">Your Gemini + Pinecone keys stay yours</li>
          </ul>
        </div>

        <p className="relative z-10 font-mono text-[11px] text-white/40">
          v1 · personal technical memory
        </p>
      </aside>

      {/* Auth form side */}
      <section className="bg-ground px-6 py-10 lg:px-14 lg:py-14 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <p className="font-mono text-xs text-brand uppercase tracking-wide mb-2">
            {mode === "login" ? "Resume session" : "Create archive"}
          </p>
          <h2 className="text-2xl font-medium text-ink mb-2">
            {mode === "login" ? "Log in to FixVault" : "Sign up for FixVault"}
          </h2>
          <p className="text-sm text-ink/65 mb-8">
            {mode === "login"
              ? "Continue with the account that holds your incident archive."
              : "Create an account, then connect Gemini and Pinecone in Settings."}
          </p>

          {children}

          <p className="text-sm text-ink/65 mt-6">
            {mode === "login" ? (
              <>
                No account?{" "}
                <Link href="/signup" className="text-brand underline underline-offset-2">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-brand underline underline-offset-2">
                  Log in
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
