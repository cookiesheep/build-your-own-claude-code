const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const AUTH_TOKEN_STORAGE_KEY = "byocc-auth-token";

export interface FileContent {
  path: string;
  content: string;
  language: string;
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

export async function fetchFileContent(
  filePath: string,
  sessionId: string,
): Promise<FileContent> {
  const requestUrl = apiUrl(
    `/api/files/${encodeURIComponent(filePath)}?sessionId=${encodeURIComponent(sessionId)}`,
  );
  const firstResponse = await fetch(
    requestUrl,
    {
      credentials: "include",
    },
  );

  if (firstResponse.ok) {
    return firstResponse.json() as Promise<FileContent>;
  }

  if (firstResponse.status !== 401 || typeof window === "undefined") {
    const data = await firstResponse.json().catch(() => ({ error: "读取文件失败" }));
    throw new Error((data as { error?: string }).error ?? "读取文件失败");
  }

  await firstResponse.text().catch(() => {});
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) {
    const data = await firstResponse.json().catch(() => ({ error: "读取文件失败" }));
    throw new Error((data as { error?: string }).error ?? "读取文件失败");
  }

  const response = await fetch(
    apiUrl(`/api/files/${encodeURIComponent(filePath)}?sessionId=${encodeURIComponent(sessionId)}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "读取文件失败" }));
    throw new Error((data as { error?: string }).error ?? "读取文件失败");
  }

  return response.json() as Promise<FileContent>;
}
