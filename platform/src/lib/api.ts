const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
// 进入后端联调阶段后，默认应该优先走真实后端。
// 如果你只是单独调前端，也可以手动设置 NEXT_PUBLIC_MOCK_MODE=true 切回 mock。
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export type SessionResponse = {
  sessionId: string;
  status: "running" | "creating";
};

export type SubmitResponse = {
  success: boolean;
  buildLog: string;
};

export type ProgressResponse = {
  labs: Array<{ labNumber: number; completed: boolean }>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createSession(
  sessionId?: string,
): Promise<SessionResponse> {
  if (MOCK_MODE) {
    await delay(300);
    return {
      sessionId: sessionId ?? "mock-session-byocc",
      status: "running",
    };
  }

  const response = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return (await response.json()) as SessionResponse;
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

  const response = await fetch(`${API_BASE}/api/submit`, {
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

  const response = await fetch(`${API_BASE}/api/reset`, {
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

  const response = await fetch(
    `${API_BASE}/api/progress?sessionId=${encodeURIComponent(sessionId)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch progress");
  }

  return (await response.json()) as ProgressResponse;
}

export function getTerminalWebSocketUrl(sessionId: string): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/api/terminal/${sessionId}`;
}
