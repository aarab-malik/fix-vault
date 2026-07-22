import Link from "next/link";

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.1fr_0.9fr] bg-[#DCE7F0]">
      <section className="order-1 lg:order-2 px-4 py-8 sm:px-6 lg:px-10 lg:py-12 flex items-center">
        <div className="w-full max-w-md mx-auto surface-pad">
          <div className="flex items-center justify-between gap-3 mb-6">
            <span className={mode === "login" ? "file-tab" : "file-tab-warn"}>
              {mode === "login" ? "Log in" : "New archive"}
            </span>
          </div>
          <p className="system-label mb-2">
            {mode === "login" ? "Sign in" : "Create account"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink mb-2">
            {mode === "login" ? "Log in to FixVault" : "Sign up for FixVault"}
          </h2>
          <p className="text-sm leading-relaxed text-ink/60 mb-6">
            {mode === "login"
              ? "Enter your email and password to open your incident archive."
              : "Create an account, then connect Gemini and Pinecone in Settings."}
          </p>

          {children}

          <div className="border-t border-brand/15 mt-6 pt-5">
            <p className="text-sm text-ink/60">
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <Link href="/signup" className="archive-link">
                    Create archive
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="archive-link">
                    Resume session
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <aside className="order-2 lg:order-1 bg-brand text-white px-4 py-8 sm:px-8 lg:px-12 lg:py-12 flex flex-col justify-between border-b-8 lg:border-b-0 lg:border-r-8 border-[#073867]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center border border-white/35 bg-[#073867] font-mono text-xl">
            FV
          </span>
          <div>
            <p className="font-mono text-sm tracking-wide text-white">FixVault</p>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-white/45 mt-0.5">
              Personal recovery console
            </p>
          </div>
        </div>

        <div className="my-8 lg:my-10 max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] leading-tight">
            Don&apos;t debug the same ghost twice.
          </h1>
          <p className="mt-4 text-white/72 text-sm leading-6">
            FixVault is a personal bug journal. Save what broke, what you tried, and what finally
            fixed it. Next time the same problem shows up, you can search your own history instead
            of starting from zero.
          </p>

          <details className="mt-6 lg:hidden border border-white/20 bg-[#073867]">
            <summary className="px-4 py-3 font-mono text-xs uppercase tracking-wide text-white/70 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              See example incident
            </summary>
            <div className="px-4 pb-4 font-mono text-xs text-white/70 space-y-2 border-t border-white/15 pt-3">
              <p>SSH_TIMEOUT_AFTER_DOCKER</p>
              <p className="text-[#E7B2AA]">03 failed / 01 successful</p>
              <p className="text-[#B8D8CA]">Network bridge restored</p>
            </div>
          </details>

          <div className="hidden lg:block mt-8 border border-white/20 bg-[#073867] p-4 font-mono text-xs text-white/70 space-y-2">
            <p className="text-white/45 uppercase tracking-wide">Example incident</p>
            <p>SSH_TIMEOUT_AFTER_DOCKER</p>
            <p className="text-[#E7B2AA]">03 failed / 01 successful</p>
            <p className="text-[#B8D8CA]">Network bridge restored</p>
          </div>
        </div>

        <p className="font-mono text-xs uppercase tracking-[0.12em] text-white/35">
          Archive format · Incident / Attempt / Fix
        </p>
      </aside>
    </main>
  );
}
