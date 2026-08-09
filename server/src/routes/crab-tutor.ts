import { Router } from 'express';

const DEFAULT_MODEL = 'MiniCPM-O-4.5-9B';
const DEFAULT_TIMEOUT_MS = 60_000;

interface ChatPayload {
  model?: unknown;
  messages?: unknown;
  [key: string]: unknown;
}

export const crabTutorRouter = Router();

export function resolveMiniCPMEndpoint(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/$/, '');
  if (/\/v1$/i.test(normalized)) {
    return `${normalized}/chat/completions`;
  }
  return normalized;
}

export function createMiniCPMPayload(
  body: ChatPayload,
  configuredModel?: string
): ChatPayload {
  if (!Array.isArray(body.messages)) {
    throw new Error('messages must be an array');
  }

  return {
    ...body,
    model: configuredModel?.trim() ||
      (typeof body.model === 'string' && body.model.trim()) ||
      DEFAULT_MODEL,
    stream: false,
  };
}

crabTutorRouter.post('/api/crab-tutor', async (req, res) => {
  const upstreamUrl = (
    process.env.MINICPM_API_URL ??
    process.env.NEXT_PUBLIC_MINICPM_API_URL ??
    ''
  ).trim();
  const apiKey = (
    process.env.MINICPM_API_KEY ??
    process.env.NEXT_PUBLIC_MINICPM_API_KEY ??
    ''
  ).trim();

  if (!upstreamUrl || upstreamUrl.startsWith('/api/crab-tutor')) {
    res.status(503).json({
      error: {
        message: 'MiniCPM upstream is not configured on the BYOCC server',
      },
    });
    return;
  }

  let payload: ChatPayload;
  try {
    payload = createMiniCPMPayload(
      req.body as ChatPayload,
      process.env.MINICPM_MODEL
    );
  } catch (error) {
    res.status(400).json({
      error: {
        message: error instanceof Error ? error.message : 'Invalid MiniCPM request',
      },
    });
    return;
  }

  const controller = new AbortController();
  const timeoutMs = Number.parseInt(
    process.env.MINICPM_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
    10
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(resolveMiniCPMEndpoint(upstreamUrl), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const responseText = await upstream.text();
    const contentType = upstream.headers.get('content-type') ?? 'application/json';
    res.status(upstream.status).type(contentType).send(responseText);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    res.status(timedOut ? 504 : 502).json({
      error: {
        message: timedOut
          ? 'MiniCPM upstream timed out'
          : 'MiniCPM upstream request failed',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
});
