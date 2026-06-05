import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { isIP } from 'node:net';

const PRIVATE_IPV4_RANGES = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

const PRIVATE_IPV6_PREFIXES = ['::1', 'fc', 'fd', 'fe80'];
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

/**
 * 从 IPv4-mapped IPv6 地址里抽出内嵌的 IPv4。两种写法都要认：
 *   - 点分：`::ffff:127.0.0.1`
 *   - 十六进制压缩：`::ffff:7f00:1`（WHATWG URL 会把前者序列化成后者）
 * 否则 `http://[::ffff:127.0.0.1]` 这类会绕过私网校验（回环未被识别）。
 */
function extractMappedIpv4(address: string): string | null {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (dotted) {
    return dotted[1];
  }

  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(address);
  if (hex) {
    const high = Number.parseInt(hex[1], 16);
    const low = Number.parseInt(hex[2], 16);
    return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
  }

  return null;
}

/**
 * SSRF 校验失败时抛出。带独立类型，方便调用方（如 llm-proxy）把它和真正的网络/上游
 * 错误区分开，给出明确的 403 而不是笼统的 502。
 */
export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

export function normalizeApiBaseUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function isPrivateAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return PRIVATE_IPV4_RANGES.some((range) => range.test(address));
  }

  if (ipVersion === 6) {
    const normalizedAddress = address.toLowerCase();
    const mappedIpv4 = extractMappedIpv4(normalizedAddress);
    if (mappedIpv4) {
      return isPrivateAddress(mappedIpv4);
    }

    return PRIVATE_IPV6_PREFIXES.some((prefix) => normalizedAddress.startsWith(prefix));
  }

  return false;
}

function parseAllowedHosts(): Set<string> {
  return new Set(
    (process.env.BYOCC_ALLOWED_LLM_BASE_URLS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(value).hostname.toLowerCase();
        } catch {
          return value.toLowerCase();
        }
      })
  );
}

/**
 * 校验一个 hostname 是否可安全出站，并**返回**解析出的、全部通过私网校验的地址。
 *
 * 这是 SSRF 防护的单一事实来源：把"校验"和"将要连接的 IP"绑在一起返回，调用方
 * 直接用这组 IP 钉死连接（见 ssrf-pinned-fetch.ts），从而消除"校验时解析一次、
 * fetch 出站时再解析一次"之间的 DNS-rebinding 窗口。
 *
 * 检查顺序与 assertSafeApiBaseUrl 一致：
 *   1. 黑名单 hostname / hostname 本身就是私网 IP 字面量
 *   2. 可选白名单 BYOCC_ALLOWED_LLM_BASE_URLS
 *   3. DNS 解析全部地址，任一落私网即拒
 */
export async function resolvePinnedAddresses(hostname: string): Promise<LookupAddress[]> {
  // URL.hostname 对 IPv6 字面量会带方括号（如 [::ffff:7f00:1]），去掉后才能正确
  // 判私网、也才能交给 dns.lookup（带括号会 ENOTFOUND，误伤合法公网 IPv6 字面量）。
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(normalizedHostname) || isPrivateAddress(normalizedHostname)) {
    throw new SsrfBlockedError('apiBaseUrl cannot target localhost or private network addresses.');
  }

  const allowedHosts = parseAllowedHosts();
  if (allowedHosts.size > 0 && !allowedHosts.has(normalizedHostname)) {
    throw new SsrfBlockedError('apiBaseUrl is not in BYOCC_ALLOWED_LLM_BASE_URLS.');
  }

  const addresses = await lookup(normalizedHostname, { all: true });
  if (addresses.length === 0) {
    throw new SsrfBlockedError('apiBaseUrl did not resolve to any address.');
  }

  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new SsrfBlockedError('apiBaseUrl resolves to a private network address.');
  }

  return addresses;
}

export async function assertSafeApiBaseUrl(value: string): Promise<string> {
  const normalizedUrl = normalizeApiBaseUrl(value);
  if (!normalizedUrl) {
    throw new SsrfBlockedError('apiBaseUrl must be a valid http(s) URL.');
  }

  const parsedUrl = new URL(normalizedUrl);
  await resolvePinnedAddresses(parsedUrl.hostname);

  return normalizedUrl;
}
