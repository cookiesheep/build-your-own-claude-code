"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

import { checkAuth, type User } from "@/lib/auth";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let cancelled = false;

    void checkAuth().then((auth) => {
      if (cancelled) return;
      if (auth.isAuthenticated) {
        setState("authenticated");
      } else {
        setState("unauthenticated");
        const redirect = encodeURIComponent(pathname);
        router.replace(`/login?redirect=${redirect}`);
      }
    });

    return () => { cancelled = true; };
  }, [pathname, router]);

  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-page)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span className="text-sm text-[var(--text-muted)]">正在验证身份...</span>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkAuth().then((auth) => {
      setUser(auth.user);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
