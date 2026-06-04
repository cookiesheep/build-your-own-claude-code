export interface User {
  id: string;
  username: string;
  role: string;
  kind?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
const MOCK_USER: User = {
  id: "mock-user-byocc",
  username: "mock-learner",
  role: "learner",
  kind: "anonymous",
};

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
  if (MOCK_MODE) {
    return { isAuthenticated: true, user: MOCK_USER, loading: false };
  }

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
  if (MOCK_MODE) {
    return { success: true, user: { ...MOCK_USER, username: username || MOCK_USER.username } };
  }

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
  if (MOCK_MODE) return;

  try {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

const AUTH_TOKEN_STORAGE_KEY = "byocc-auth-token";

function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

/**
 * 触发 GitHub OAuth：拿匿名 Bearer token 调后端，让后端把 fromUserId 记进 state，
 * 拿到 GitHub authorize URL 后做 top-level navigation。
 */
export async function startGithubLogin(redirect?: string): Promise<void> {
  if (typeof window === "undefined") return;

  const bearer = getStoredAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearer) {
    headers["Authorization"] = `Bearer ${bearer}`;
  }

  const response = await fetch(apiUrl("/api/auth/github/start"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(redirect ? { redirect } : {}),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `GitHub 登录暂不可用（HTTP ${response.status}）`);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("GitHub 登录响应不完整");
  }

  window.location.href = data.url;
}
