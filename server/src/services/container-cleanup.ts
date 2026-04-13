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
import { getSession, updateSessionEnvironment } from '../db/database.js';

const docker = new Docker();
const BYOCC_MANAGED_LABEL = 'byocc.managed=true';
const SESSION_LABEL = 'byocc.session-id';

export type CleanupCandidate = {
  id: string;
  name: string;
  sessionId: string | null;
  status: string;
  containerAgeMinutes: number;
  inactiveMinutes: number;
  lastActive: string;
  environmentStatus: string;
};

export type CleanupSkippedContainer = {
  id: string;
  name: string;
  sessionId: string | null;
  status: string;
  containerAgeMinutes: number;
  reason: string;
};

export type CleanupOptions = {
  dryRun: boolean;
  maxAgeMinutes: number;
  sessionPrefix?: string;
  protectedSessionIds?: Iterable<string>;
};

export type CleanupResult = {
  dryRun: boolean;
  maxAgeMinutes: number;
  candidates: CleanupCandidate[];
  removed: CleanupCandidate[];
  skippedOrphans: CleanupSkippedContainer[];
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

function getInactiveMinutes(lastActive: string, nowMs: number): number | null {
  const normalized = lastActive.includes('T') ? lastActive : `${lastActive.replace(' ', 'T')}Z`;
  const lastActiveMs = Date.parse(normalized);
  if (Number.isNaN(lastActiveMs)) {
    return null;
  }

  return Math.max(0, Math.floor((nowMs - lastActiveMs) / 60_000));
}

type ContainerAnalysis =
  | { candidate: CleanupCandidate; skipped?: never }
  | { candidate?: never; skipped: CleanupSkippedContainer }
  | { candidate?: never; skipped?: never };

function matchesSessionPrefix(sessionId: string | null, options: { sessionPrefix?: string }): boolean {
  if (!options.sessionPrefix) {
    return true;
  }

  return sessionId?.startsWith(options.sessionPrefix) ?? false;
}

function toSkippedContainer(
  container: Docker.ContainerInfo,
  nowMs: number,
  sessionId: string | null,
  reason: string
): CleanupSkippedContainer {
  return {
    id: container.Id,
    name: getContainerName(container.Names),
    sessionId,
    status: container.Status,
    containerAgeMinutes: getAgeMinutes(container.Created, nowMs),
    reason,
  };
}

function analyzeContainer(
  container: Docker.ContainerInfo,
  nowMs: number,
  options: { sessionPrefix?: string; protectedSessionIds?: ReadonlySet<string> }
): ContainerAnalysis {
  const sessionId = getLabel(container.Labels, SESSION_LABEL);
  if (!matchesSessionPrefix(sessionId, options)) {
    return {};
  }

  if (!sessionId) {
    return {
      skipped: toSkippedContainer(container, nowMs, null, 'missing byocc.session-id label'),
    };
  }

  const session = getSession(sessionId);
  if (!session) {
    return {
      skipped: toSkippedContainer(container, nowMs, sessionId, 'no matching DB session'),
    };
  }

  if (session.containerId !== container.Id) {
    return {
      skipped: toSkippedContainer(container, nowMs, sessionId, 'DB session container_id mismatch'),
    };
  }

  if (options.protectedSessionIds?.has(sessionId)) {
    return {
      skipped: toSkippedContainer(container, nowMs, sessionId, 'protected active terminal session'),
    };
  }

  if (session.environmentStatus === 'starting') {
    return {
      skipped: toSkippedContainer(container, nowMs, sessionId, 'environment is starting'),
    };
  }

  const inactiveMinutes = getInactiveMinutes(session.lastActive, nowMs);
  if (inactiveMinutes === null) {
    return {
      skipped: toSkippedContainer(container, nowMs, sessionId, 'invalid session last_active'),
    };
  }

  return {
    candidate: {
      id: container.Id,
      name: getContainerName(container.Names),
      sessionId,
      status: container.Status,
      containerAgeMinutes: getAgeMinutes(container.Created, nowMs),
      inactiveMinutes,
      lastActive: session.lastActive,
      environmentStatus: session.environmentStatus,
    },
  };
}

function matchesOptions(candidate: CleanupCandidate, options: CleanupOptions): boolean {
  if (candidate.inactiveMinutes < options.maxAgeMinutes) {
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
  const result = await analyzeCleanupContainers(options);
  return result.candidates;
}

async function analyzeCleanupContainers(
  options: Omit<CleanupOptions, 'dryRun'>
): Promise<{
  candidates: CleanupCandidate[];
  skippedOrphans: CleanupSkippedContainer[];
}> {
  const nowMs = Date.now();
  const protectedSessionIds = new Set(options.protectedSessionIds ?? []);
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [BYOCC_MANAGED_LABEL],
    },
  });

  const candidates: CleanupCandidate[] = [];
  const skippedOrphans: CleanupSkippedContainer[] = [];

  for (const container of containers) {
    const analysis = analyzeContainer(container, nowMs, {
      sessionPrefix: options.sessionPrefix,
      protectedSessionIds,
    });
    if (analysis.candidate && matchesOptions(analysis.candidate, { ...options, dryRun: true })) {
      candidates.push(analysis.candidate);
    }

    if (analysis.skipped) {
      skippedOrphans.push(analysis.skipped);
    }
  }

  return { candidates, skippedOrphans };
}

/**
 * 清理旧 BYOCC 容器。
 *
 * dryRun=true 时只返回会被清理的容器列表。
 * dryRun=false 时才真正执行 docker rm -f 的等价操作。
 */
export async function cleanupContainers(options: CleanupOptions): Promise<CleanupResult> {
  const { candidates, skippedOrphans } = await analyzeCleanupContainers({
    maxAgeMinutes: options.maxAgeMinutes,
    sessionPrefix: options.sessionPrefix,
    protectedSessionIds: options.protectedSessionIds,
  });

  const removed: CleanupCandidate[] = [];

  if (!options.dryRun) {
    for (const candidate of candidates) {
      const container = docker.getContainer(candidate.id);
      await container.remove({ force: true });
      if (candidate.sessionId) {
        updateSessionEnvironment(candidate.sessionId, null, 'expired');
      }
      removed.push(candidate);
    }
  }

  return {
    dryRun: options.dryRun,
    maxAgeMinutes: options.maxAgeMinutes,
    candidates,
    removed,
    skippedOrphans,
  };
}
