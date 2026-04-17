export interface User {
  id: string;
  username: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function shouldUseSameOriginApi(): boolean {
  if (!API_BASE) {
    return true;
  }

  try {
    const url = new URL(API_BASE);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return true;
  }
}

function apiUrl(path: string): string {
  return shouldUseSameOriginApi() ? path : `${API_BASE}${path}`;
}

export async function checkAuth(): Promise<AuthState> {
  try {
    const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return {
        isAuthenticated: data.authenticated ?? false,
        user: data.user ?? null,
        loading: false,
      };
    }
    return { isAuthenticated: false, user: null, loading: false };
  } catch {
    return { isAuthenticated: false, user: null, loading: false };
  }
}

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || "登录失败" };
  } catch {
    return { success: false, error: "网络错误，请稍后重试" };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}
