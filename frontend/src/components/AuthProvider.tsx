"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup"];

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  refresh: async () => null,
  setUser: () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const next = await api.me();
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

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

    if (!user && !isPublic) {
      router.replace("/login");
    }
  }, [user, ready, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, ready, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
