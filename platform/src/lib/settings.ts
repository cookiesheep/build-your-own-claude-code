const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ApiKeySource = "default" | "user";

export interface ApiKeySettings {
  source: ApiKeySource;
  hasKey: boolean;
  maskedKey?: string;
  apiBaseUrl?: string | null;
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
    throw new Error(data.message ?? "API Key 设置请求失败");
  }

  return data;
}

export async function getApiKeySettings(): Promise<ApiKeySettings> {
  const response = await fetch(apiUrl("/api/settings/api-key"), {
    credentials: "include",
  });

  return readJson<ApiKeySettings>(response);
}

export async function updateApiKey(apiKey: string, apiBaseUrl?: string): Promise<ApiKeySettings> {
  const response = await fetch(apiUrl("/api/settings/api-key"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ apiKey, apiBaseUrl }),
  });

  return readJson<ApiKeySettings>(response);
}

export async function deleteApiKey(): Promise<ApiKeySettings> {
  const response = await fetch(apiUrl("/api/settings/api-key"), {
    method: "DELETE",
    credentials: "include",
  });

  return readJson<ApiKeySettings>(response);
}
