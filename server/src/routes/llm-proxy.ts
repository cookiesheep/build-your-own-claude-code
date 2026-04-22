import { Router, type Request, type Response } from 'express';
import { once } from 'node:events';
import { getSession, recordApiUsage } from '../db/database.js';
import {
  getContainerStatus,
  resolveContainerApiConfig,
  validateContainerSessionToken,
} from '../services/container-manager.js';
import { fetchWithTimeout } from '../services/http-timeout.js';
import { checkRateLimit } from '../services/rate-limit.js';

export const llmProxyRouter = Router();

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

type SseUsageState = {
  buffer: string;
  inputTokens: number;
  outputTokens: number;
};

function extractSessionToken(req: Request): string | null {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

async function validateSessionToken(token: string): Promise<{ sessionId: string; userId: string } | null> {
  const cachedToken = validateContainerSessionToken(token);
  if (!cachedToken) {
    return null;
  }

  const session = getSession(cachedToken.sessionId);
  if (!session || session.environmentStatus !== 'running' || !session.userId) {
    return null;
  }

  if (cachedToken.userId && cachedToken.userId !== session.userId) {
    return null;
  }

  const containerStatus = await getContainerStatus(session.id);
  if (containerStatus !== 'running') {
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.userId,
  };
}

export function getAnthropicPathFromOriginalUrl(originalUrl: string): string {
  const requestUrl = new URL(originalUrl, 'http://127.0.0.1');
  let targetPath = requestUrl.pathname.replace(/^\/api\/llm/, '');
  if (!targetPath.startsWith('/')) {
    targetPath = `/${targetPath}`;
  }

  if (!targetPath.startsWith('/v1/')) {
    targetPath = `/v1${targetPath}`;
  }

  return `${targetPath}${requestUrl.search}`;
}

function getAnthropicPath(req: Request): string {
  return getAnthropicPathFromOriginalUrl(req.originalUrl);
}

function readRequestModel(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { model } = body as { model?: unknown };
  return typeof model === 'string' ? model : null;
}

function readUsageFromBody(body: unknown): AnthropicUsage {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const { usage } = body as { usage?: unknown };
  if (typeof usage !== 'object' || usage === null) {
    return {};
  }

  const { input_tokens: inputTokens, output_tokens: outputTokens } = usage as {
    input_tokens?: unknown;
    output_tokens?: unknown;
  };

  return {
    input_tokens: typeof inputTokens === 'number' ? inputTokens : 0,
    output_tokens: typeof outputTokens === 'number' ? outputTokens : 0,
  };
}

function updateSseUsageState(state: SseUsageState, chunk: string): void {
  state.buffer += chunk;
  const lines = state.buffer.split(/\r?\n/);
  state.buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue;
    }

    const data = line.slice('data:'.length).trim();
    if (!data || data === '[DONE]') {
      continue;
    }

    try {
      const parsed = JSON.parse(data) as { usage?: AnthropicUsage; delta?: { usage?: AnthropicUsage } };
      const usage = parsed.usage ?? parsed.delta?.usage;
      if (typeof usage?.input_tokens === 'number') {
        state.inputTokens = Math.max(state.inputTokens, usage.input_tokens);
      }
      if (typeof usage?.output_tokens === 'number') {
        state.outputTokens = Math.max(state.outputTokens, usage.output_tokens);
      }
    } catch {
      // Anthropic-compatible providers may include non-JSON keepalive lines.
    }
  }
}

export function collectUsageFromSseText(text: string): Required<AnthropicUsage> {
  const state: SseUsageState = {
    buffer: '',
    inputTokens: 0,
    outputTokens: 0,
  };
  updateSseUsageState(state, text);
  return {
    input_tokens: state.inputTokens,
    output_tokens: state.outputTokens,
  };
}

function writeRateLimitError(res: Response): void {
  res.status(429).json({
    type: 'error',
    error: {
      type: 'rate_limit_error',
      message: '今日平台共享 Key 额度已用完，请使用自己的 API Key 或明天再试。',
    },
  });
}

async function proxyRequest(req: Request, res: Response, input: {
  apiKey: string;
  apiBaseUrl: string;
  sessionId: string;
  userId: string;
  keySource: 'default' | 'user';
}): Promise<void> {
  // apiBaseUrl 已在保存设置时校验；代理热路径避免每次 DNS lookup。
  const targetUrl = `${input.apiBaseUrl.replace(/\/$/, '')}${getAnthropicPath(req)}`;
  const controller = new AbortController();
  req.on('close', () => controller.abort());
  res.on('close', () => controller.abort());
  const response = await fetchWithTimeout(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': req.header('content-type') || 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': req.header('anthropic-version') || '2023-06-01',
      ...(req.header('anthropic-beta') ? { 'anthropic-beta': req.header('anthropic-beta') ?? '' } : {}),
    },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
    signal: controller.signal,
  });

  const contentType = response.headers.get('content-type') ?? 'application/json';
  res.status(response.status);

  if (contentType.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    const usageState: SseUsageState = {
      buffer: '',
      inputTokens: 0,
      outputTokens: 0,
    };
    if (reader) {
      const decoder = new TextDecoder();
      const cancelReader = () => {
        void reader.cancel().catch(() => {});
      };
      req.once('close', cancelReader);
      res.once('close', cancelReader);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        updateSseUsageState(usageState, chunk);
        if (!res.write(chunk)) {
          await Promise.race([once(res, 'drain'), once(res, 'close')]);
          if (res.destroyed) {
            break;
          }
        }
      }

      req.off('close', cancelReader);
      res.off('close', cancelReader);
    }

    recordApiUsage({
      userId: input.userId,
      sessionId: input.sessionId,
      model: readRequestModel(req.body),
      inputTokens: usageState.inputTokens,
      outputTokens: usageState.outputTokens,
      keySource: input.keySource,
    });
    res.end();
    return;
  }

  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => ({}));
    const usage = readUsageFromBody(data);
    recordApiUsage({
      userId: input.userId,
      sessionId: input.sessionId,
      model: readRequestModel(req.body),
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      keySource: input.keySource,
    });
    res.json(data);
    return;
  }

  const text = await response.text();
  recordApiUsage({
    userId: input.userId,
    sessionId: input.sessionId,
    model: readRequestModel(req.body),
    inputTokens: 0,
    outputTokens: 0,
    keySource: input.keySource,
  });
  res.setHeader('Content-Type', contentType);
  res.send(text);
}

llmProxyRouter.all('/api/llm/*', async (req, res) => {
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ message: 'Missing LLM proxy session token.' });
    return;
  }

  const tokenPayload = await validateSessionToken(token);
  if (!tokenPayload) {
    res.status(403).json({ message: 'Invalid or expired LLM proxy session token.' });
    return;
  }

  const apiConfig = resolveContainerApiConfig(tokenPayload.userId);
  if (!apiConfig.apiKey) {
    res.status(503).json({
      type: 'error',
      error: {
        type: 'api_key_missing',
        message: '平台默认 API Key 未配置，请设置自己的 API Key 后重试。',
      },
    });
    return;
  }

  if (apiConfig.keyFallback) {
    res.setHeader('X-BYOCC-Key-Fallback', 'true');
  }

  const limit = checkRateLimit(tokenPayload.userId, tokenPayload.sessionId, apiConfig.keySource);
  if (!limit.allowed) {
    writeRateLimitError(res);
    return;
  }

  res.setHeader('X-BYOCC-RateLimit-Remaining', String(limit.remaining));

  try {
    await proxyRequest(req, res, {
      apiKey: apiConfig.apiKey,
      apiBaseUrl: apiConfig.apiBaseUrl,
      sessionId: tokenPayload.sessionId,
      userId: tokenPayload.userId,
      keySource: apiConfig.keySource,
    });
  } catch (error) {
    console.error('[llm-proxy] Failed to proxy request', error);
    if (!res.headersSent) {
      res.status(502).json({
        type: 'error',
        error: {
          type: 'proxy_error',
          message: 'LLM 代理请求失败，请稍后重试。',
        },
      });
      return;
    }

    res.end();
  }
});
