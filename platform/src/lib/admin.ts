const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface AdminOverview {
  date: string;
  defaultKeyRequests: number;
  defaultKeyInputTokens: number;
  defaultKeyOutputTokens: number;
  activeUsers: number;
  dailyLimit: number;
}

export type UserKind = "anonymous" | "github" | "password";

export interface TopConsumer {
  userId: string;
  username: string | null;
  nickname: string | null;
  kind: UserKind;
  disabled: boolean;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AdminTopConsumers {
  date: string;
  limit: number;
  consumers: TopConsumer[];
}

export interface AnomalyUser extends TopConsumer {
  remaining: number;
}

export interface AdminAnomalies {
  date: string;
  dailyLimit: number;
  threshold: number;
  users: AnomalyUser[];
}

export interface UserUsageDay {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UserUsageSession {
  sessionId: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  lastUsedAt: string | null;
}

export interface AdminUserDetail {
  user: {
    userId: string;
    username: string | null;
    nickname: string | null;
    kind: UserKind;
    role: string | null;
    disabled: boolean;
  };
  byDay: UserUsageDay[];
  bySession: UserUsageSession[];
}

export interface AdminUserView {
  userId: string;
  username: string | null;
  nickname: string | null;
  role: string | null;
  disabled: boolean;
}

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

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(data.message ?? "需要管理员权限");
    }
    throw new Error(data.message ?? "管理后台请求失败");
  }

  return data;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await fetch(apiUrl("/api/admin/overview"), { credentials: "include" });
  return readJson<AdminOverview>(response);
}

export async function getTopConsumers(limit?: number): Promise<AdminTopConsumers> {
  const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
  const response = await fetch(apiUrl(`/api/admin/top-consumers${query}`), {
    credentials: "include",
  });
  return readJson<AdminTopConsumers>(response);
}

export async function getAnomalies(threshold?: number): Promise<AdminAnomalies> {
  const query = threshold !== undefined ? `?threshold=${encodeURIComponent(String(threshold))}` : "";
  const response = await fetch(apiUrl(`/api/admin/anomalies${query}`), {
    credentials: "include",
  });
  return readJson<AdminAnomalies>(response);
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const response = await fetch(apiUrl(`/api/admin/user/${encodeURIComponent(userId)}`), {
    credentials: "include",
  });
  return readJson<AdminUserDetail>(response);
}

export async function disableUser(userId: string): Promise<AdminUserView> {
  const response = await fetch(
    apiUrl(`/api/admin/user/${encodeURIComponent(userId)}/disable`),
    { method: "POST", credentials: "include" },
  );
  return readJson<AdminUserView>(response);
}

export async function enableUser(userId: string): Promise<AdminUserView> {
  const response = await fetch(
    apiUrl(`/api/admin/user/${encodeURIComponent(userId)}/enable`),
    { method: "POST", credentials: "include" },
  );
  return readJson<AdminUserView>(response);
}
