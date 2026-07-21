import Link from "next/link";

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.18fr_0.82fr] bg-[#DCE7F0]">
      <aside className="relative bg-brand text-white px-6 py-8 sm:px-10 lg:px-14 lg:py-12 flex flex-col justify-between overflow-hidden border-b-8 lg:border-b-0 lg:border-r-8 border-[#073867]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 font-mono text-[18rem] leading-none text-white/[0.035] select-none">
          :(
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center border border-white/35 bg-[#073867] font-mono text-xl shadow-[3px_3px_0_#062B50]">
              FV
            </span>
            <div>
              <p className="font-mono text-sm tracking-wide text-white">FixVault</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45 mt-0.5">
                Personal recovery console
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 border border-white/20 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-widest text-white/55">
            <span className="size-1.5 bg-[#8FC7B0]" />
            Memory online
          </span>
        </div>

        <div className="relative z-10 max-w-xl my-14 lg:my-10">
          <div className="flex items-center gap-4">
            <p className="font-mono text-6xl leading-none select-none" aria-hidden>:(</p>
            <div className="h-px flex-1 bg-white/25" />
            <p className="font-mono text-[10px] text-white/40">0xF1XVAULT</p>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.045em] leading-[0.98] mt-8 max-w-lg">
            Don’t debug the same ghost twice.
          </h1>
          <p className="mt-6 text-white/72 text-sm leading-6 max-w-lg">
            FixVault keeps the ugly details: the exact failure, every dead end, and the one repair
            that finally held.
          </p>

          <div className="mt-9 border border-white/20 bg-[#073867] shadow-[5px_5px_0_#062B50]">
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">Crash dump preview</p>
              <p className="font-mono text-[9px] text-[#F2D7A2]">RECOVERABLE</p>
            </div>
            <div className="grid sm:grid-cols-[7rem_1fr] font-mono text-[10px]">
              <div className="border-b sm:border-b-0 sm:border-r border-white/15 p-4 text-white/35">
                <p>FAULT</p>
                <p className="mt-2">ATTEMPTS</p>
                <p className="mt-2">RESOLUTION</p>
              </div>
              <div className="p-4 text-white/72">
                <p>SSH_TIMEOUT_AFTER_DOCKER</p>
                <p className="mt-2 text-[#E7B2AA]">03 FAILED / 01 SUCCESSFUL</p>
                <p className="mt-2 text-[#B8D8CA]">NETWORK BRIDGE RESTORED</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">
          <span>Archive format · Incident / Attempt / Fix</span>
          <span>Keys remain yours</span>
        </div>
      </aside>

      <section className="relative px-6 py-12 lg:px-12 lg:py-14 flex items-center overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-3 diagnostic-ruler opacity-60" />
        <div className="w-full max-w-md mx-auto paper-stack">
          <div className="dossier p-6 sm:p-8">
          <div className="flex items-center justify-between mb-7">
            <span className={mode === "login" ? "file-tab" : "file-tab-warn"}>
              {mode === "login" ? "Log in" : "New archive"}
            </span>
            <span className="font-mono text-[9px] text-ink/35">
              FORM_{mode === "login" ? "AUTH_01" : "AUTH_02"}
            </span>
          </div>
          <p className="system-label mb-2">
            {mode === "login" ? "Sign in" : "Create account"}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-ink mb-2">
            {mode === "login" ? "Log in to FixVault" : "Sign up for FixVault"}
          </h2>
          <p className="text-sm leading-relaxed text-ink/60 mb-7">
            {mode === "login"
              ? "Enter your email and password to open your incident archive."
              : "Create an account, then connect Gemini and Pinecone in Settings."}
          </p>

          {children}

          <div className="diagnostic-ruler mt-7 opacity-60" />
          <p className="text-sm text-ink/60 mt-6">
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
    </main>
  );
}
