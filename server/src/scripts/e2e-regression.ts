import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import { initDatabase } from '../db/database.js';
import { cleanupContainers } from '../services/container-cleanup.js';

type ParsedArgs = {
  baseUrl: string;
  fullDocker: boolean;
  codeFile: string;
  labNumber: number;
  skipWebSocket: boolean;
  keepContainer: boolean;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
  };
};

type SessionResponse = {
  sessionId: string;
  userId: string | null;
};

type EnvironmentResponse = {
  success: boolean;
  sessionId: string;
  environmentStatus: string;
  terminalUrl?: string;
};

type SubmitResponse = {
  success: boolean;
  buildLog: string;
};

type ProgressResponse = {
  labs: Array<{ labNumber: number; completed: boolean }>;
};

const DEFAULT_BASE_URL = process.env.BYOCC_E2E_BASE_URL ?? 'http://127.0.0.1:3001';
const DEFAULT_CODE_FILE =
  process.env.BYOCC_E2E_CODE_FILE ?? 'D:\\test-claude-code\\claude-code\\src\\query-lab.ts';

function readValue(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function parseArgs(args: string[]): ParsedArgs {
  const labNumber = Number.parseInt(readValue(args, '--lab-number') ?? '3', 10);
  if (!Number.isInteger(labNumber) || labNumber < 0) {
    throw new Error('--lab-number must be a non-negative integer');
  }

  return {
    baseUrl: readValue(args, '--base-url') ?? DEFAULT_BASE_URL,
    fullDocker: args.includes('--full-docker'),
    codeFile: readValue(args, '--code-file') ?? DEFAULT_CODE_FILE,
    labNumber,
    skipWebSocket: args.includes('--skip-websocket'),
    keepContainer: args.includes('--keep-container'),
  };
}

function logPass(message: string): void {
  console.log(`PASS ${message}`);
}

function logInfo(message: string): void {
  console.log(`INFO ${message}`);
}

function makeUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

function asBearer(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: T }> {
  const response = await fetch(makeUrl(baseUrl, path), init);
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);

  return {
    status: response.status,
    body,
  };
}

async function expectStatus(
  label: string,
  baseUrl: string,
  path: string,
  expectedStatus: number,
  init: RequestInit = {}
): Promise<void> {
  const { status } = await requestJson<unknown>(baseUrl, path, init);
  if (status !== expectedStatus) {
    throw new Error(`${label}: expected HTTP ${expectedStatus}, received ${status}`);
  }

  logPass(`${label}: HTTP ${expectedStatus}`);
}

async function expectOk<T>(
  label: string,
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { status, body } = await requestJson<T>(baseUrl, path, init);
  if (status < 200 || status >= 300) {
    throw new Error(`${label}: expected 2xx, received HTTP ${status}`);
  }

  logPass(`${label}: HTTP ${status}`);
  return body;
}

function jsonPost(body: unknown, headers: Record<string, string> = {}): RequestInit {
  return {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function websocketUpgradeStatus(rawUrl: string): Promise<number> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'ws:') {
    throw new Error(`Only ws:// terminal URLs are supported by this smoke check: ${rawUrl}`);
  }

  const host = url.hostname;
  const port = Number.parseInt(url.port || '80', 10);
  const path = `${url.pathname}${url.search}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    let response = '';
    const socket = net.createConnection({ host, port }, () => {
      const key = randomBytes(16).toString('base64');
      socket.write(
        [
          `GET ${path} HTTP/1.1`,
          `Host: ${url.host}`,
          'Connection: Upgrade',
          'Upgrade: websocket',
          'Sec-WebSocket-Version: 13',
          `Sec-WebSocket-Key: ${key}`,
          'Sec-WebSocket-Protocol: tty',
          '',
          '',
        ].join('\r\n')
      );
    });

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      callback();
    };

    socket.setTimeout(10_000, () => {
      finish(() => reject(new Error(`Timed out waiting for WebSocket upgrade: ${rawUrl}`)));
    });

    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (!response.includes('\r\n\r\n')) {
        return;
      }

      const statusLine = response.split('\r\n')[0] ?? '';
      const match = /^HTTP\/1\.1\s+(\d+)/.exec(statusLine);
      finish(() => {
        if (!match) {
          reject(new Error(`Could not parse WebSocket upgrade response: ${statusLine}`));
          return;
        }
        resolve(Number.parseInt(match[1], 10));
      });
    });

    socket.on('error', (error) => {
      finish(() => reject(error));
    });
  });
}

async function runBoundaryChecks(options: ParsedArgs): Promise<{
  authA: AuthResponse;
  authB: AuthResponse;
  sessionA: SessionResponse;
  legacySession: SessionResponse;
}> {
  const health = await expectOk<{ status: string }>('health', options.baseUrl, '/api/health');
  if (health.status !== 'ok') {
    throw new Error(`health: expected status "ok", received "${health.status}"`);
  }

  const authA = await expectOk<AuthResponse>(
    'auth user A',
    options.baseUrl,
    '/api/auth/anonymous',
    jsonPost({})
  );
  const authB = await expectOk<AuthResponse>(
    'auth user B',
    options.baseUrl,
    '/api/auth/anonymous',
    jsonPost({})
  );

  const headersA = asBearer(authA.token);
  const headersB = asBearer(authB.token);
  const sessionA = await expectOk<SessionResponse>(
    'session A',
    options.baseUrl,
    '/api/session',
    jsonPost({}, headersA)
  );
  const legacySession = await expectOk<SessionResponse>(
    'legacy unowned session',
    options.baseUrl,
    '/api/session',
    jsonPost({})
  );

  if (sessionA.userId !== authA.user.id) {
    throw new Error('session A is not owned by user A');
  }
  if (legacySession.userId !== null) {
    throw new Error('legacy session should be unowned');
  }
  logPass('session ownership baseline');

  const sessionBody = { sessionId: sessionA.sessionId };
  const submitBody = {
    sessionId: sessionA.sessionId,
    code: 'export {};',
    labNumber: options.labNumber,
  };

  await expectStatus('restore owned session without token', options.baseUrl, '/api/session', 401, jsonPost(sessionBody));
  await expectStatus('restore owned session as user B', options.baseUrl, '/api/session', 403, jsonPost(sessionBody, headersB));
  await expectStatus(
    'environment status as user B',
    options.baseUrl,
    `/api/environment/status?sessionId=${encodeURIComponent(sessionA.sessionId)}`,
    403,
    { headers: headersB }
  );
  await expectStatus(
    'environment start as user B',
    options.baseUrl,
    '/api/environment/start',
    403,
    jsonPost(sessionBody, headersB)
  );
  await expectStatus(
    'environment reset as user B',
    options.baseUrl,
    '/api/environment/reset',
    403,
    jsonPost(sessionBody, headersB)
  );
  await expectStatus(
    'submit as user B',
    options.baseUrl,
    '/api/submit',
    403,
    jsonPost(submitBody, headersB)
  );
  await expectStatus('legacy reset as user B', options.baseUrl, '/api/reset', 403, jsonPost(sessionBody, headersB));
  await expectStatus(
    'progress merge as user B',
    options.baseUrl,
    `/api/progress?sessionId=${encodeURIComponent(sessionA.sessionId)}`,
    403,
    { headers: headersB }
  );
  await expectStatus(
    'progress merge for unowned legacy session',
    options.baseUrl,
    `/api/progress?sessionId=${encodeURIComponent(legacySession.sessionId)}`,
    403,
    { headers: headersA }
  );

  await expectOk<EnvironmentResponse>(
    'environment status as owner',
    options.baseUrl,
    `/api/environment/status?sessionId=${encodeURIComponent(sessionA.sessionId)}`,
    { headers: headersA }
  );

  return { authA, authB, sessionA, legacySession };
}

async function runFullDockerChecks(options: ParsedArgs, authA: AuthResponse, sessionA: SessionResponse): Promise<void> {
  const headersA = asBearer(authA.token);
  const environment = await expectOk<EnvironmentResponse>(
    'environment start as owner',
    options.baseUrl,
    '/api/environment/start',
    jsonPost({ sessionId: sessionA.sessionId }, headersA)
  );

  if (!environment.success || environment.environmentStatus !== 'running') {
    throw new Error(`environment start did not return running: ${JSON.stringify(environment)}`);
  }
  if (!environment.terminalUrl || !environment.terminalUrl.includes('token=')) {
    throw new Error('environment terminalUrl is missing terminal token');
  }
  logPass('terminal URL includes token');

  const code = await readFile(options.codeFile, 'utf8');
  const submit = await expectOk<SubmitResponse>(
    'submit lab code',
    options.baseUrl,
    '/api/submit',
    jsonPost(
      {
        sessionId: sessionA.sessionId,
        code,
        labNumber: options.labNumber,
      },
      headersA
    )
  );

  if (!submit.success) {
    throw new Error(`submit returned success=false:\n${submit.buildLog}`);
  }

  const progress = await expectOk<ProgressResponse>(
    'progress after submit',
    options.baseUrl,
    `/api/progress?sessionId=${encodeURIComponent(sessionA.sessionId)}`,
    { headers: headersA }
  );
  const labProgress = progress.labs.find((lab) => lab.labNumber === options.labNumber);
  if (!labProgress?.completed) {
    throw new Error(`expected Lab ${options.labNumber} completed progress, received ${JSON.stringify(progress)}`);
  }
  logPass(`Lab ${options.labNumber} progress completed`);

  if (options.skipWebSocket) {
    logInfo('Skipping WebSocket upgrade checks because --skip-websocket was provided.');
  } else {
    const terminalUrl = new URL(environment.terminalUrl);
    const noTokenUrl = new URL(environment.terminalUrl);
    noTokenUrl.search = '';
    const noTokenStatus = await websocketUpgradeStatus(noTokenUrl.toString());
    if (noTokenStatus !== 401) {
      throw new Error(`terminal websocket without token expected HTTP 401, received ${noTokenStatus}`);
    }
    logPass('terminal websocket without token rejected');

    const tokenStatus = await websocketUpgradeStatus(terminalUrl.toString());
    if (tokenStatus !== 101) {
      throw new Error(`terminal websocket with token expected HTTP 101, received ${tokenStatus}`);
    }
    logPass('terminal websocket with token upgraded');
  }

  if (options.keepContainer) {
    logInfo(`Keeping test container for session ${sessionA.sessionId} because --keep-container was provided.`);
    return;
  }

  initDatabase();
  const cleanup = await cleanupContainers({
    dryRun: false,
    maxAgeMinutes: 0,
    sessionPrefix: sessionA.sessionId,
  });

  if (cleanup.removed.length === 0) {
    throw new Error(`Expected cleanup to remove test container for session ${sessionA.sessionId}`);
  }

  logPass(`removed ${cleanup.removed.length} test container(s) for session ${sessionA.sessionId}`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  logInfo(`baseUrl=${options.baseUrl}`);
  logInfo(`mode=${options.fullDocker ? 'full-docker' : 'boundary'}`);

  const { authA, sessionA } = await runBoundaryChecks(options);

  if (options.fullDocker) {
    logInfo(`codeFile=${options.codeFile}`);
    await runFullDockerChecks(options, authA, sessionA);
  }

  console.log('PASS BYOCC E2E regression checks completed.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`FAIL BYOCC E2E regression checks failed.\n${message}`);
  process.exitCode = 1;
});
