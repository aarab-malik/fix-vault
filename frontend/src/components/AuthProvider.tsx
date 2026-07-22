"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup"];

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  refresh: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  refresh: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function refresh() {
    try {
      const next = await api.me();
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    }
  }

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

    // Login/signup stay reachable so leftover cookies cannot silently skip auth.
    // Missing provider keys must not force-redirect; feature pages show a setup gate instead.
    if (!user && !isPublic) {
      router.replace("/login");
    }
  }, [user, ready, pathname, router]);

  if (!ready) {
    return <div className="min-h-screen bg-ground" />;
  }

  return (
    <AuthContext.Provider value={{ user, ready, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
