"use client";

import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-ink/60">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
