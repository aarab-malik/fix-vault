"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ask", label: "Ask" },
  { href: "/incidents/new", label: "Add incident" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();

  async function logout() {
    await api.logout();
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-panel bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="font-mono text-brand text-lg tracking-tight">
          FixVault
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href || pathname.startsWith(l.href + "/") ? "text-brand font-medium" : "text-ink/70 hover:text-ink"}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="text-ink/70 hover:text-ink">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
