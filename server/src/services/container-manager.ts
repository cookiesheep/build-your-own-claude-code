/**
 * Docker 容器管理服务
 *
 * 职责：创建、管理、销毁学习者的 Lab 容器
 * 每个学习者会话对应一个独立的 Docker 容器，容器内有：
 *   - Node.js 18 运行环境
 *   - claude-code-diy 预克隆代码
 *   - ttyd 终端服务（端口 7681）
 *
 * 当前阶段已实现：
 *   - createContainer
 *   - injectCode
 *   - buildInContainer
 *   - getTtydPort
 *   - removeContainer
 *   - getContainerStatus
 *
 * 后续阶段待实现：
 *   - 更完整的构建镜像（claude-code-diy 运行底座）
 */

import Docker from 'dockerode';
import type { Readable } from 'node:stream';

// 自动连接到本地 Docker（Docker Desktop 必须在运行）
const docker = new Docker();

// Lab 容器使用的镜像名称
const LAB_IMAGE = 'byocc-lab';
const TTYD_PORT_KEY = '7681/tcp';
const CONTAINER_MEMORY_LIMIT = 512 * 1024 * 1024;
const CPU_PERIOD = 100000;
const CPU_QUOTA = 50000;

// 存储 sessionId → containerId 的映射
// 这只是“本进程内缓存”，不是长期真相。
// 真正需要时，我们仍然会回到 Docker 自己那里做 inspect。
const sessionContainers = new Map<string, string>();

type ResolvedContainer = {
  container: Docker.Container;
  info: Docker.ContainerInspectInfo;
};

type ExecResult = {
  exitCode: number | null;
  output: string;
};

function getContainerName(sessionId: string): string {
  if (sessionId.trim() === '') {
    throw new Error('sessionId must be a non-empty string');
  }

  // Docker 名称对字符有限制，这里先做最保守的清洗。
  return `lab-${sessionId.trim().replace(/[^a-zA-Z0-9_.-]/g, '-')}`;
}

function isDockerNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: unknown }).statusCode === 404
  );
}

async function inspectContainerByHandle(handle: string): Promise<ResolvedContainer | null> {
  const container = docker.getContainer(handle);

  try {
    const info = await container.inspect();
    return { container, info };
  } catch (error) {
    if (isDockerNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

async function resolveContainer(sessionId: string): Promise<ResolvedContainer | null> {
  const cachedContainerId = sessionContainers.get(sessionId);
  if (cachedContainerId) {
    const cachedContainer = await inspectContainerByHandle(cachedContainerId);
    if (cachedContainer) {
      return cachedContainer;
    }

    sessionContainers.delete(sessionId);
  }

  const namedContainer = await inspectContainerByHandle(getContainerName(sessionId));
  if (namedContainer) {
    sessionContainers.set(sessionId, namedContainer.info.Id);
  }

  return namedContainer;
}

async function ensureLabImageExists(): Promise<void> {
  try {
    await docker.getImage(LAB_IMAGE).inspect();
  } catch (error) {
    if (!isDockerNotFoundError(error)) {
      throw error;
    }

    throw new Error(
      `Docker image "${LAB_IMAGE}" was not found. Build it first with: docker build -t ${LAB_IMAGE} -f infrastructure/Dockerfile.lab infrastructure`
    );
  }
}

function readStreamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';

    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      output += chunk;
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(output));
    stream.on('close', () => resolve(output));
  });
}

async function getContainerOrThrow(sessionId: string): Promise<ResolvedContainer> {
  const resolvedContainer = await resolveContainer(sessionId);
  if (!resolvedContainer) {
    throw new Error(`No container found for session "${sessionId}"`);
  }

  return resolvedContainer;
}

function sanitizeExecOutput(output: string): string {
  let cleaned = output;

  // 某些 Docker exec 输出前面会混入 8 字节的流复用头。
  // 当前阶段先做一个保守清理：如果开头看起来像这种头，就先裁掉。
  while (
    cleaned.length >= 8 &&
    (cleaned.charCodeAt(0) === 1 || cleaned.charCodeAt(0) === 2) &&
    cleaned.charCodeAt(1) === 0 &&
    cleaned.charCodeAt(2) === 0 &&
    cleaned.charCodeAt(3) === 0
  ) {
    cleaned = cleaned.slice(8);
  }

  // 再统一清理不可见控制字符，保留换行、回车、制表符和 ANSI ESC。
  // 这样日志仍能保留颜色，但不会混入奇怪的乱码字节。
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001A]/g, '');

  return cleaned.trim();
}

async function runExecCommand(
  container: Docker.Container,
  command: string[]
): Promise<ExecResult> {
  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
    // 当前阶段优先保证执行稳定。
    // 这里直接把 stdout/stderr 合成一条流来读取，后面再按需要做更细的拆分。
    Tty: true,
  });

  const stream = (await exec.start({})) as Readable;
  const output = sanitizeExecOutput(await readStreamToString(stream));
  const execInfo = await exec.inspect();

  return {
    exitCode: execInfo.ExitCode,
    output,
  };
}

/**
 * 为学习者会话创建一个新的 Docker 容器
 *
 * @param sessionId - 学习者的会话 ID（例如 "user-abc123"）
 * @returns containerId - Docker 容器 ID
 *
 * 实现思路：
 *   1. 调用 docker.createContainer() 创建容器
 *   2. 设置镜像为 LAB_IMAGE
 *   3. 端口映射：容器 7681 → 主机随机端口
 *   4. 资源限制：512MB 内存，50% CPU
 *   5. 启动容器
 *   6. 记录到 sessionContainers Map
 *   7. 返回容器 ID
 */
export async function createContainer(sessionId: string): Promise<string> {
  const existingContainer = await resolveContainer(sessionId);
  if (existingContainer) {
    if (existingContainer.info.State.Status !== 'running') {
      await existingContainer.container.start();
    }

    sessionContainers.set(sessionId, existingContainer.info.Id);
    return existingContainer.info.Id;
  }

  await ensureLabImageExists();

  const container = await docker.createContainer({
    Image: LAB_IMAGE,
    name: getContainerName(sessionId),
    ExposedPorts: { [TTYD_PORT_KEY]: {} },
    Labels: {
      'byocc.managed': 'true',
      'byocc.session-id': sessionId,
    },
    HostConfig: {
      PortBindings: { [TTYD_PORT_KEY]: [{ HostPort: '0' }] },
      Memory: CONTAINER_MEMORY_LIMIT,
      CpuPeriod: CPU_PERIOD,
      CpuQuota: CPU_QUOTA,
    },
  });

  await container.start();

  const info = await container.inspect();
  sessionContainers.set(sessionId, info.Id);
  return info.Id;
}

/**
 * 将学习者的代码注入到容器内
 *
 * @param sessionId - 会话 ID
 * @param code - 学习者编写的 TypeScript 代码（字符串）
 * @param labNumber - Lab 编号（0-6）
 *
 * 实现思路：
 *   1. 根据 sessionId 找到容器 ID
 *   2. 用 container.exec() 在容器内执行命令
 *   3. 将 code 写入容器的 /workspace/src/query-lab.ts
 *   4. 注意：code 可能包含特殊字符，建议用 base64 编码传输
 */
export async function injectCode(
  sessionId: string,
  code: string,
  labNumber: number
): Promise<void> {
  const { container } = await getContainerOrThrow(sessionId);

  // 当前阶段先统一写到 query-lab.ts。
  // 以后如果要按 lab 拆成不同入口，再从这里扩展目标路径策略。
  const targetFile = '/workspace/src/query-lab.ts';
  const encodedCode = Buffer.from(code, 'utf8').toString('base64');

  const { exitCode, output } = await runExecCommand(container, [
    'bash',
    '-lc',
    [
      'mkdir -p /workspace/src',
      `printf '%s' '${encodedCode}' | base64 -d > ${targetFile}`,
      `echo 'Injected Lab ${labNumber} code into ${targetFile}'`,
    ].join(' && '),
  ]);

  if (exitCode !== 0) {
    throw new Error(
      [
        `Failed to inject code into container for session "${sessionId}".`,
        output || 'No container output was captured.',
      ].join('\n')
    );
  }
}

/**
 * 在容器内触发构建
 *
 * @param sessionId - 会话 ID
 * @param labNumber - Lab 编号
 * @returns 构建日志（stdout + stderr）
 *
 * 实现思路：
 *   1. 在容器内执行 `node build.mjs --lab`
 *   2. 收集 stdout 和 stderr
 *   3. 返回构建日志
 */
export async function buildInContainer(
  sessionId: string,
  labNumber: number
): Promise<{ success: boolean; log: string }> {
  const { container } = await getContainerOrThrow(sessionId);

  const { exitCode, output } = await runExecCommand(container, [
    'bash',
    '-lc',
    [
      'cd /workspace',
      `if [ ! -f build.mjs ]; then echo 'build.mjs not found in container image. Current image is still the ttyd+bash PoC and not the full claude-code-diy runtime.'; exit 2; fi`,
      `node build.mjs --lab ${labNumber}`,
    ].join(' && '),
  ]);

  return {
    success: exitCode === 0,
    log: output || 'Build command finished without output.',
  };
}

/**
 * 获取容器 ttyd 的主机端口
 *
 * @param sessionId - 会话 ID
 * @returns ttyd 映射到主机的端口号
 *
 * 实现思路：
 *   1. 找到容器
 *   2. container.inspect() 获取端口映射
 *   3. 返回 7681 映射的主机端口
 */
export async function getTtydPort(sessionId: string): Promise<number> {
  const resolvedContainer = await resolveContainer(sessionId);
  if (!resolvedContainer) {
    throw new Error(`No container found for session "${sessionId}"`);
  }

  const portBindings = resolvedContainer.info.NetworkSettings.Ports[TTYD_PORT_KEY];
  if (!portBindings || portBindings.length === 0) {
    throw new Error(`Container for session "${sessionId}" does not expose ${TTYD_PORT_KEY}`);
  }

  const hostPort = Number.parseInt(portBindings[0].HostPort, 10);
  if (Number.isNaN(hostPort)) {
    throw new Error(`Container for session "${sessionId}" returned an invalid ttyd port`);
  }

  return hostPort;
}

/**
 * 停止并删除容器
 */
export async function removeContainer(sessionId: string): Promise<void> {
  const resolvedContainer = await resolveContainer(sessionId);
  if (!resolvedContainer) {
    return;
  }

  try {
    if (resolvedContainer.info.State.Running) {
      await resolvedContainer.container.stop({ t: 5 });
    }
  } catch (error) {
    if (!isDockerNotFoundError(error)) {
      throw error;
    }
  }

  try {
    await resolvedContainer.container.remove({ force: true });
  } catch (error) {
    if (!isDockerNotFoundError(error)) {
      throw error;
    }
  } finally {
    sessionContainers.delete(sessionId);
  }
}

/**
 * 获取容器状态
 */
export async function getContainerStatus(
  sessionId: string
): Promise<'running' | 'stopped' | 'not_found'> {
  const resolvedContainer = await resolveContainer(sessionId);
  if (!resolvedContainer) {
    return 'not_found';
  }

  return resolvedContainer.info.State.Running ? 'running' : 'stopped';
}
