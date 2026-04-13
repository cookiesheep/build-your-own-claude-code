import { cleanupContainers } from './container-cleanup.js';
import { getActiveTerminalSessionIds } from './ws-proxy.js';

type CleanupSchedulerConfig = {
  enabled: boolean;
  ttlMinutes: number;
  intervalMinutes: number;
  runOnStart: boolean;
};

const DEFAULT_TTL_MINUTES = 120;
const DEFAULT_INTERVAL_MINUTES = 10;

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

function readPositiveIntegerEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return defaultValue;
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value <= 0) {
    console.warn(`${name} must be a positive integer. Falling back to ${defaultValue}.`);
    return defaultValue;
  }

  return value;
}

function readCleanupSchedulerConfig(): CleanupSchedulerConfig {
  return {
    enabled: readBooleanEnv('BYOCC_CONTAINER_CLEANUP_ENABLED', true),
    ttlMinutes: readPositiveIntegerEnv('BYOCC_CONTAINER_TTL_MINUTES', DEFAULT_TTL_MINUTES),
    intervalMinutes: readPositiveIntegerEnv(
      'BYOCC_CONTAINER_CLEANUP_INTERVAL_MINUTES',
      DEFAULT_INTERVAL_MINUTES
    ),
    runOnStart: readBooleanEnv('BYOCC_CONTAINER_CLEANUP_RUN_ON_START', false),
  };
}

export function startContainerCleanupScheduler(): void {
  const config = readCleanupSchedulerConfig();

  if (!config.enabled) {
    console.log('🧹 Container TTL cleanup: disabled by BYOCC_CONTAINER_CLEANUP_ENABLED');
    return;
  }

  console.log(
    `🧹 Container TTL cleanup: enabled ttl=${config.ttlMinutes}m interval=${config.intervalMinutes}m`
  );

  let running = false;
  const runCleanup = async () => {
    if (running) {
      console.warn('Container TTL cleanup: previous cleanup is still running; skipping this tick.');
      return;
    }

    running = true;
    try {
      const result = await cleanupContainers({
        dryRun: false,
        maxAgeMinutes: config.ttlMinutes,
        protectedSessionIds: getActiveTerminalSessionIds(),
      });

      if (result.removed.length > 0 || result.skippedOrphans.length > 0) {
        console.log(
          `Container TTL cleanup: removed=${result.removed.length} skipped=${result.skippedOrphans.length}`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Container TTL cleanup failed:', message);
    } finally {
      running = false;
    }
  };

  if (config.runOnStart) {
    void runCleanup();
  }

  const interval = setInterval(() => {
    void runCleanup();
  }, config.intervalMinutes * 60_000);

  interval.unref();
}
