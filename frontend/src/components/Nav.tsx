"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Archive" },
  { href: "/ask", label: "Ask memory" },
  { href: "/incidents/new", label: "Log incident" },
  { href: "/settings", label: "Connections" },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  async function logout() {
    await api.logout();
    window.location.href = "/login";
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
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
        <div className="min-h-14 sm:min-h-16 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="group flex items-center gap-3 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center border border-white/30 font-mono text-lg group-hover:bg-white group-hover:text-brand">
              :(
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-sm tracking-wide truncate">FixVault</span>
              <span className="hidden sm:block font-mono text-xs uppercase tracking-[0.12em] text-white/45">
                personal recovery console
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-white/55">
              <span className="size-1.5 bg-ok" />
              MEMORY_SERVICE: ONLINE
            </div>
            <button
              onClick={logout}
              className="hidden sm:inline-flex min-h-11 items-center border border-white/25 px-3 py-2 font-mono text-xs uppercase tracking-wide text-white/75 hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn"
            >
              End session
            </button>
            <button
              type="button"
              className="lg:hidden inline-flex min-h-11 min-w-11 items-center justify-center border border-white/25 px-3 font-mono text-xs uppercase tracking-wide text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="hidden lg:flex border-t border-white/15">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`border-r border-white/15 px-4 py-3 font-mono text-xs uppercase tracking-wide ${
                isActive(l.href)
                  ? "bg-white text-brand"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav-panel"
          aria-label="Mobile navigation"
          className="lg:hidden border-t border-white/15 bg-[#073867]"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`block min-h-11 px-3 py-3 font-mono text-sm uppercase tracking-wide border border-white/10 ${
                  isActive(l.href)
                    ? "bg-white text-brand"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="w-full min-h-11 px-3 py-3 text-left font-mono text-sm uppercase tracking-wide text-white/80 border border-white/10 hover:bg-white/10"
            >
              End session
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
