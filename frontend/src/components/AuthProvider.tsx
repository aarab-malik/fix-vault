"use client";

import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
      .catch(() => {
        if (!cancelled) setUser(null);
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

    // Login/signup are always reachable so a leftover cookie cannot
    // silently "sign you in" without entering credentials again.
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && !user.credentials_configured && !isPublic && pathname !== "/settings") {
      router.replace("/settings");
    }
  }, [user, ready, pathname, router]);

  if (!ready) {
    return <div className="min-h-screen bg-ground" />;
  }

  return <>{children}</>;
}
