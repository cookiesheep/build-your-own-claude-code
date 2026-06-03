import { lookup } from 'node:dns/promises';
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

function isPrivateAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return PRIVATE_IPV4_RANGES.some((range) => range.test(address));
  }

  if (ipVersion === 6) {
    const normalizedAddress = address.toLowerCase();
    const ipv4MappedMatch = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalizedAddress);
    if (ipv4MappedMatch) {
      return isPrivateAddress(ipv4MappedMatch[1]);
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

export async function assertSafeApiBaseUrl(value: string): Promise<string> {
  const normalizedUrl = normalizeApiBaseUrl(value);
  if (!normalizedUrl) {
    throw new Error('apiBaseUrl must be a valid http(s) URL.');
  }

  const parsedUrl = new URL(normalizedUrl);
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || isPrivateAddress(hostname)) {
    throw new Error('apiBaseUrl cannot target localhost or private network addresses.');
  }

  const allowedHosts = parseAllowedHosts();
  if (allowedHosts.size > 0 && !allowedHosts.has(hostname)) {
    throw new Error('apiBaseUrl is not in BYOCC_ALLOWED_LLM_BASE_URLS.');
  }

  const addresses = await lookup(hostname, { all: true });
  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('apiBaseUrl resolves to a private network address.');
  }

  return normalizedUrl;
}
