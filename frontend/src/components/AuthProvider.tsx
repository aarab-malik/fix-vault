"use client";

import { useEffect, useState } from "react";
import { ApiError, api, User } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        if (cancelled) return;
        // Any auth-check failure = treat as logged out and show login.
        // Login / dashboard will surface a clearer API error if the backend is down.
        if (!(err instanceof ApiError && err.status === 401)) {
          console.warn("[FixVault] /auth/me failed:", err);
        }
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
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
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="bg-brand text-white p-8 sm:p-12 flex items-center">
          <div>
            <p className="font-mono text-5xl" aria-hidden>
              :(
            </p>
            <p className="system-label-light mt-6">FixVault boot sequence</p>
            <h1 className="text-2xl font-medium mt-2">Recovering your session.</h1>
          </div>
        </div>
        <div className="flex items-center p-8">
          <div className="panel p-6 w-full max-w-md mx-auto" aria-live="polite">
            <p className="font-mono text-xs text-brand">AUTH_CHECK: IN_PROGRESS</p>
            <div className="h-1 bg-panel mt-4 overflow-hidden">
              <div className="h-full w-2/3 bg-brand" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
