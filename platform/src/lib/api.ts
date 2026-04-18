const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
// 进入后端联调阶段后，默认应该优先走真实后端。
// 如果你只是单独调前端，也可以手动设置 NEXT_PUBLIC_MOCK_MODE=true 切回 mock。
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
export const AUTH_TOKEN_STORAGE_KEY = "byocc-auth-token";
export const SESSION_STORAGE_KEY = "byocc-session-id";

export type User = {
  id: string;
  kind: "anonymous";
  githubId: string | null;
  nickname: string | null;
  avatarUrl: string | null;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type CurrentUserResponse = {
  user: User;
};

export type SessionStatus = "created" | "restored";

export type EnvironmentStatus =
  | "not_started"
  | "starting"
  | "running"
  | "stopped"
  | "expired"
  | "error";

export type SessionResponse = {
  sessionId: string;
  status: SessionStatus;
  environmentStatus: EnvironmentStatus;
  userId?: string | null;
};

export type EnvironmentResponse = {
  success: boolean;
  sessionId: string;
  environmentStatus: EnvironmentStatus;
  containerId?: string | null;
  terminalUrl?: string;
  message?: string;
};

export type SubmitResponse = {
  success: boolean;
  buildLog: string;
};

export type ProgressResponse = {
  labs: Array<{ labNumber: number; completed: boolean }>;
};

export type WorkspaceResponse = {
  labNumber: number;
  code: string | null;
  updatedAt: string | null;
};

type CookieAuthResponse = {
  authenticated?: boolean;
};

function apiUrl(path: string): string {
  if (!API_BASE) {
    return path;
  }

  try {
    const url = new URL(API_BASE);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return path;
    }
  } catch {
    return path;
  }

  return `${API_BASE}${path}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function setStoredAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
}

function clearStoredAuthToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

function clearStoredSessionId(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function withAuthHeader(
  headers: HeadersInit | undefined,
  token: string,
): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}

async function hasCookieAuth(): Promise<boolean> {
  if (MOCK_MODE) {
    return false;
  }

  const response = await fetch(apiUrl("/api/auth/me"), {
    credentials: "include",
  });
  if (!response.ok) {
    return false;
  }

  const data = (await response.json().catch(() => null)) as CookieAuthResponse | null;
  if (data?.authenticated) {
    clearStoredAuthToken();
    return true;
  }

  return false;
}

async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const existingToken = getStoredAuthToken();
  const bearerToken = existingToken && !(await hasCookieAuth()) ? existingToken : null;
  const firstResponse = await fetch(input, {
    ...init,
    credentials: "include",
    headers: bearerToken ? withAuthHeader(init.headers, bearerToken) : init.headers,
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  if (await hasCookieAuth()) {
    return firstResponse;
  }

  const token = await ensureAnonymousUser();
  const secondResponse = await fetch(input, {
    ...init,
    credentials: "include",
    headers: withAuthHeader(init.headers, token),
  });

  if (secondResponse.status !== 401) {
    return secondResponse;
  }

  clearStoredAuthToken();
  const refreshedToken = await ensureAnonymousUser();
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: withAuthHeader(init.headers, refreshedToken),
  });
}

export async function createAnonymousUser(): Promise<AuthResponse> {
  if (MOCK_MODE) {
    await delay(200);
    const token = "mock-anonymous-token";
    setStoredAuthToken(token);
    return {
      token,
      user: {
        id: "mock-user-byocc",
        kind: "anonymous",
        githubId: null,
        nickname: null,
        avatarUrl: null,
      },
    };
  }

  const existingToken = getStoredAuthToken();
  const response = await fetch(apiUrl("/api/auth/anonymous"), {
    method: "POST",
    credentials: "include",
    headers: existingToken
      ? {
          Authorization: `Bearer ${existingToken}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error("Failed to create anonymous user");
  }

  const result = (await response.json()) as AuthResponse;
  setStoredAuthToken(result.token);
  return result;
}

export async function ensurePlatformIdentity(): Promise<void> {
  if (await hasCookieAuth()) {
    return;
  }

  await ensureAnonymousUser();
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  if (MOCK_MODE) {
    await delay(150);
    return {
      user: {
        id: "mock-user-byocc",
        kind: "anonymous",
        githubId: null,
        nickname: null,
        avatarUrl: null,
      },
    };
  }

  const token = getStoredAuthToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  const response = await fetch(apiUrl("/api/me"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearStoredAuthToken();
    throw new Error("Invalid auth token");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch current user");
  }

  return (await response.json()) as CurrentUserResponse;
}

export async function ensureAnonymousUser(): Promise<string> {
  const existingToken = getStoredAuthToken();
  if (!existingToken) {
    const auth = await createAnonymousUser();
    return auth.token;
  }

  try {
    await getCurrentUser();
    return existingToken;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid auth token") {
      const auth = await createAnonymousUser();
      return auth.token;
    }

    throw error;
  }
}

export async function createSession(
  sessionId?: string,
): Promise<SessionResponse> {
  if (MOCK_MODE) {
    await delay(300);
    return {
      sessionId: sessionId ?? "mock-session-byocc",
      status: sessionId ? "restored" : "created",
      environmentStatus: "not_started",
      userId: "mock-user-byocc",
    };
  }

  const requestSession = async (nextSessionId?: string) =>
    authorizedFetch(apiUrl("/api/session"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextSessionId ? { sessionId: nextSessionId } : {}),
    });

  let response = await requestSession(sessionId);

  if (response.status === 403 && sessionId) {
    clearStoredSessionId();
    response = await requestSession();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to create session (${response.status})${body ? `: ${body}` : ""}`,
    );
  }

  return (await response.json()) as SessionResponse;
}

export async function startEnvironment(
  sessionId: string,
): Promise<EnvironmentResponse> {
  if (MOCK_MODE) {
    await delay(1200);
    return {
      success: true,
      sessionId,
      environmentStatus: "running",
      containerId: "mock-container-byocc",
      terminalUrl: getTerminalWebSocketUrl(sessionId),
    };
  }

  const response = await authorizedFetch(apiUrl("/api/environment/start"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error("Failed to start environment");
  }

  return (await response.json()) as EnvironmentResponse;
}

export async function getEnvironmentStatus(
  sessionId: string,
): Promise<EnvironmentResponse> {
  if (MOCK_MODE) {
    await delay(250);
    return {
      success: true,
      sessionId,
      environmentStatus: "not_started",
      containerId: null,
    };
  }

  const response = await authorizedFetch(
    apiUrl(`/api/environment/status?sessionId=${encodeURIComponent(sessionId)}`),
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch environment status");
  }

  return (await response.json()) as EnvironmentResponse;
}

export async function resetEnvironment(
  sessionId: string,
): Promise<EnvironmentResponse> {
  if (MOCK_MODE) {
    await delay(1200);
    return {
      success: true,
      sessionId,
      environmentStatus: "running",
      containerId: "mock-container-byocc-reset",
      terminalUrl: getTerminalWebSocketUrl(sessionId),
    };
  }

  const response = await authorizedFetch(apiUrl("/api/environment/reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error("Failed to reset environment");
  }

  return (await response.json()) as EnvironmentResponse;
}

export async function submitCode(
  sessionId: string,
  code: string,
  labNumber: number,
): Promise<SubmitResponse> {
  if (MOCK_MODE) {
    await delay(1400);
    return {
      success: true,
      buildLog: `✅ Build successful for session ${sessionId}\n→ Injected code for Lab ${labNumber}\n→ Ready to launch node cli.js`,
    };
  }

  const response = await authorizedFetch(apiUrl("/api/submit"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId, code, labNumber }),
  });

  if (!response.ok) {
    throw new Error("Failed to submit code");
  }

  return (await response.json()) as SubmitResponse;
}

export async function resetSession(
  sessionId: string,
): Promise<{ success: boolean }> {
  if (MOCK_MODE) {
    await delay(500);
    return { success: true };
  }

  const response = await authorizedFetch(apiUrl("/api/reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error("Failed to reset session");
  }

  return (await response.json()) as { success: boolean };
}

export async function getProgress(
  sessionId: string,
): Promise<ProgressResponse> {
  if (MOCK_MODE) {
    await delay(250);
    return {
      labs: [
        { labNumber: 0, completed: true },
        { labNumber: 1, completed: true },
        { labNumber: 2, completed: false },
        { labNumber: 3, completed: false },
        { labNumber: 4, completed: false },
        { labNumber: 5, completed: false },
      ],
    };
  }

  const response = await authorizedFetch(
    apiUrl(`/api/progress?sessionId=${encodeURIComponent(sessionId)}`),
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch progress");
  }

  return (await response.json()) as ProgressResponse;
}

export async function getWorkspace(labNumber: number): Promise<WorkspaceResponse> {
  if (MOCK_MODE) {
    await delay(250);
    return {
      labNumber,
      code: null,
      updatedAt: null,
    };
  }

  const response = await authorizedFetch(apiUrl(`/api/labs/${labNumber}/workspace`), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch workspace");
  }

  return (await response.json()) as WorkspaceResponse;
}

export async function saveWorkspace(
  labNumber: number,
  code: string,
): Promise<WorkspaceResponse> {
  if (MOCK_MODE) {
    await delay(350);
    return {
      labNumber,
      code,
      updatedAt: new Date().toISOString(),
    };
  }

  const response = await authorizedFetch(apiUrl(`/api/labs/${labNumber}/workspace`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error("Failed to save workspace");
  }

  return (await response.json()) as WorkspaceResponse;
}

export function getTerminalWebSocketUrl(sessionId: string): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/api/terminal/${sessionId}`;
}
