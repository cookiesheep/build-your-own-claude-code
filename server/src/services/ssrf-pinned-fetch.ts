import { Agent, fetch as undiciFetch } from 'undici';
import type { LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';

const DEFAULT_TIMEOUT_MS = 120000;

/**
 * 构造一个把出站连接钉死到预先校验过的 IP 上的 undici dispatcher。
 *
 * 关键点：自定义 lookup **忽略真实 hostname**，直接回 resolvePinnedAddresses
 * 已经校验为非私网的那组地址。这样"校验的 IP"与"连接的 IP"是同一个，攻击者无法
 * 在校验之后用低 TTL 的 DNS 把同一域名翻转到内网（DNS rebinding）。
 *
 * 注意：这里只改变 DNS 解析层，TLS 的 servername / 证书校验仍按 URL 里的 hostname
 * 进行（undici 默认行为），所以钉 IP 不会破坏 HTTPS。
 */
export function createPinnedDispatcher(addresses: LookupAddress[]): Agent {
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses);
      return;
    }

    const [first] = addresses;
    callback(null, first.address, first.family);
  };

  return new Agent({ connect: { lookup } });
}

/**
 * 等价于 fetchWithTimeout，但走 undici 自带的 fetch + 传入的钉 IP dispatcher。
 *
 * 用安装版 undici 的 fetch（而非全局 fetch）配它自己的 Agent，避免"内置 undici vs
 * 安装版 undici"两份副本之间的 dispatcher 兼容问题。
 *
 * dispatcher 的生命周期由调用方负责：流式响应必须等流读完才能 close()，所以这里不在
 * finally 里关 dispatcher——否则会在 body 被消费前掐断连接。
 */
export async function pinnedFetch(
  url: string,
  init: RequestInit,
  dispatcher: Agent,
  timeoutMs = Number.parseInt(process.env.BYOCC_LLM_PROXY_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS), 10)
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS
  );

  const callerSignal = init.signal ?? undefined;
  const abortFromCaller = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener('abort', abortFromCaller, { once: true });
    }
  }

  try {
    const response = await undiciFetch(url, {
      ...init,
      dispatcher,
      signal: controller.signal,
    } as Parameters<typeof undiciFetch>[1]);
    return response as unknown as Response;
  } finally {
    callerSignal?.removeEventListener('abort', abortFromCaller);
    clearTimeout(timeout);
  }
}
