"use client";

import { useEffect, useState } from "react";
import { ApiError, api, User } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Only block the UI on the first session check — never again on route changes.
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!(err instanceof ApiError && err.status === 401)) {
          console.warn("[FixVault] /auth/me failed:", err);
        }
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isPublic = publicPaths.includes(pathname);
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && isPublic) {
      router.replace(user.credentials_configured ? "/dashboard" : "/settings");
      return;
    }
    if (user && !user.credentials_configured && pathname !== "/settings") {
      router.replace("/settings");
    }
  }, [user, ready, pathname, router]);

  // Tiny first-paint placeholder — not the full BSOD boot screen on every click.
  if (!ready) {
    return (
      <div className="min-h-screen bg-ground flex items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand/50">
          Loading…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
