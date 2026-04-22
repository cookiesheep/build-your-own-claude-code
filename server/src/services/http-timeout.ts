export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = Number.parseInt(process.env.BYOCC_LLM_PROXY_TIMEOUT_MS ?? '120000', 10)
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 120000);
  const abortFromCaller = () => controller.abort();

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', abortFromCaller, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    init.signal?.removeEventListener('abort', abortFromCaller);
    clearTimeout(timeout);
  }
}
