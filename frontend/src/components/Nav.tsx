"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Archive", code: "01" },
  { href: "/ask", label: "Ask memory", code: "02" },
  { href: "/incidents/new", label: "Log incident", code: "03" },
  { href: "/settings", label: "Connections", code: "04" },
];

export default function Nav() {
  const pathname = usePathname();

  async function logout() {
    await api.logout();
    window.location.href = "/login";
  }

  return (
    <header className="bg-brand text-white border-b-4 border-warn">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:text-brand focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="min-h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <span className="flex size-8 items-center justify-center border border-white/30 font-mono text-lg group-hover:bg-white group-hover:text-brand">
              :(
            </span>
            <span>
              <span className="block font-mono text-sm tracking-wide">FixVault</span>
              <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.15em] text-white/45">
                personal recovery console
              </span>
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-white/55">
            <span className="size-1.5 bg-ok" />
            MEMORY_SERVICE: ONLINE
          </div>
          <button
            onClick={logout}
            className="hidden sm:block border border-white/25 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-white/75 hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn"
          >
            End session
          </button>
        </div>
        <nav aria-label="Primary navigation" className="flex overflow-x-auto border-t border-white/15">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={
                pathname === l.href || pathname.startsWith(l.href + "/") ? "page" : undefined
              }
              className={`shrink-0 border-r border-white/15 px-3 sm:px-4 py-2.5 font-mono text-[11px] uppercase tracking-wide ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-white text-brand"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="mr-2 opacity-50">{l.code}</span>
              {l.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="sm:hidden shrink-0 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-white/65 hover:text-white"
          >
            Exit
          </button>
        </nav>
      </div>
    </header>
  );
}
