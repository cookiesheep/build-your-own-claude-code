const LOCAL_HOSTS = new Set(['', '127.0.0.1', 'localhost', '::1']);

function hasPublicCorsOrigin(): boolean {
  const origins = process.env.CORS_ORIGINS ?? '';
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .some((origin) => {
      try {
        return !LOCAL_HOSTS.has(new URL(origin).hostname.toLowerCase());
      } catch {
        return false;
      }
    });
}

function isPublicRuntime(): boolean {
  const host = (process.env.HOST ?? '127.0.0.1').trim().toLowerCase();
  return process.env.NODE_ENV === 'production' || !LOCAL_HOSTS.has(host) || hasPublicCorsOrigin();
}

export function getRuntimeSecret(input: {
  envNames: string[];
  fallback: string;
  description: string;
}): string {
  for (const envName of input.envNames) {
    const secret = process.env[envName]?.trim();
    if (secret) {
      return secret;
    }
  }

  if (isPublicRuntime()) {
    throw new Error(
      `${input.envNames.join(' or ')} must be set when running in production or with public host/origins.`
    );
  }

  console.warn(
    `${input.envNames.join(' and ')} are not set. Using a development-only ${input.description}; do not use this for public deployment.`
  );
  return input.fallback;
}
