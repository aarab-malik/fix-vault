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

    // One quiet session check. Any failure = treat as logged out and show login.
    // Never trap the user on a "recovering session" wall.
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

  if (!ready) {
    // Minimal first paint only — never a multi-second auth theatre.
    return <div className="min-h-screen bg-ground" />;
  }

  return <>{children}</>;
}
