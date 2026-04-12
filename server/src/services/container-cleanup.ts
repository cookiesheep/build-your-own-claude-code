/**
 * BYOCC 容器清理服务
 *
 * 为什么需要它：
 * - 每次进入 Lab 页面都会创建一个 lab-* Docker 容器。
 * - 本地开发时如果忘记 reset 或关闭容器，Docker Desktop 会堆很多实验机。
 * - 这个服务专门负责“找出 BYOCC 管理的旧容器，并按需清理”。
 *
 * 设计原则：
 * - 默认只看带有 byocc.managed=true label 的容器，避免误删别的项目容器。
 * - 支持 dry-run，先告诉你会删什么，不直接动手。
 * - 支持 sessionPrefix，方便测试时只清理 cleanup-smoke-* 这类临时容器。
 */

import Docker from 'dockerode';

const docker = new Docker();
const BYOCC_MANAGED_LABEL = 'byocc.managed=true';
const SESSION_LABEL = 'byocc.session-id';

export type CleanupCandidate = {
  id: string;
  name: string;
  sessionId: string | null;
  status: string;
  ageMinutes: number;
};

export type CleanupOptions = {
  dryRun: boolean;
  maxAgeMinutes: number;
  sessionPrefix?: string;
};

export type CleanupResult = {
  dryRun: boolean;
  maxAgeMinutes: number;
  candidates: CleanupCandidate[];
  removed: CleanupCandidate[];
};

function getContainerName(names: string[] | undefined): string {
  const firstName = names?.[0] ?? '<unnamed>';
  return firstName.replace(/^\//, '');
}

function getLabel(labels: Record<string, string> | undefined, label: string): string | null {
  return labels?.[label] ?? null;
}

function getAgeMinutes(createdAtSeconds: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - createdAtSeconds * 1000) / 60_000));
}

function toCandidate(container: Docker.ContainerInfo, nowMs: number): CleanupCandidate {
  return {
    id: container.Id,
    name: getContainerName(container.Names),
    sessionId: getLabel(container.Labels, SESSION_LABEL),
    status: container.Status,
    ageMinutes: getAgeMinutes(container.Created, nowMs),
  };
}

function matchesOptions(candidate: CleanupCandidate, options: CleanupOptions): boolean {
  if (candidate.ageMinutes < options.maxAgeMinutes) {
    return false;
  }

  if (options.sessionPrefix && !candidate.sessionId?.startsWith(options.sessionPrefix)) {
    return false;
  }

  return true;
}

/**
 * 找出符合清理条件的 BYOCC 容器。
 *
 * 这里只“列出候选项”，不会删除。脚本和将来的 API 都可以先调用它做预览。
 */
export async function listCleanupCandidates(
  options: Omit<CleanupOptions, 'dryRun'>
): Promise<CleanupCandidate[]> {
  const nowMs = Date.now();
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [BYOCC_MANAGED_LABEL],
    },
  });

  return containers
    .map((container) => toCandidate(container, nowMs))
    .filter((candidate) => matchesOptions(candidate, { ...options, dryRun: true }));
}

/**
 * 清理旧 BYOCC 容器。
 *
 * dryRun=true 时只返回会被清理的容器列表。
 * dryRun=false 时才真正执行 docker rm -f 的等价操作。
 */
export async function cleanupContainers(options: CleanupOptions): Promise<CleanupResult> {
  const candidates = await listCleanupCandidates({
    maxAgeMinutes: options.maxAgeMinutes,
    sessionPrefix: options.sessionPrefix,
  });

  const removed: CleanupCandidate[] = [];

  if (!options.dryRun) {
    for (const candidate of candidates) {
      const container = docker.getContainer(candidate.id);
      await container.remove({ force: true });
      removed.push(candidate);
    }
  }

  return {
    dryRun: options.dryRun,
    maxAgeMinutes: options.maxAgeMinutes,
    candidates,
    removed,
  };
}
