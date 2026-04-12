/**
 * 手动清理 BYOCC Docker 容器的 CLI 脚本
 *
 * 推荐用法：
 *   npx tsx src/scripts/cleanup-containers.ts --dry-run
 *   npx tsx src/scripts/cleanup-containers.ts --max-age-minutes 120
 *
 * 为了避免误删，脚本默认 dry-run。
 * 真正删除时需要显式传 `--execute`。
 */

import { cleanupContainers } from '../services/container-cleanup.js';

type ParsedArgs = {
  dryRun: boolean;
  maxAgeMinutes: number;
  sessionPrefix?: string;
};

function readValue(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function parseArgs(args: string[]): ParsedArgs {
  const execute = args.includes('--execute');
  const maxAgeValue = readValue(args, '--max-age-minutes');
  const sessionPrefix = readValue(args, '--session-prefix');
  const maxAgeMinutes = maxAgeValue ? Number.parseInt(maxAgeValue, 10) : 120;

  if (!Number.isInteger(maxAgeMinutes) || maxAgeMinutes < 0) {
    throw new Error('--max-age-minutes must be a non-negative integer');
  }

  return {
    // 默认 dry-run；只有显式 --execute 才真正删除。
    dryRun: !execute,
    maxAgeMinutes,
    sessionPrefix,
  };
}

const options = parseArgs(process.argv.slice(2));
const result = await cleanupContainers(options);

const modeLabel = result.dryRun ? 'DRY RUN' : 'EXECUTE';
console.log(`[${modeLabel}] maxAgeMinutes=${result.maxAgeMinutes}`);

if (options.sessionPrefix) {
  console.log(`sessionPrefix=${options.sessionPrefix}`);
}

if (result.candidates.length === 0) {
  console.log('No BYOCC containers matched the cleanup criteria.');
  process.exit(0);
}

console.table(
  result.candidates.map((candidate) => ({
    name: candidate.name,
    sessionId: candidate.sessionId ?? '<none>',
    status: candidate.status,
    ageMinutes: candidate.ageMinutes,
    action: result.dryRun ? 'would remove' : 'removed',
  }))
);

if (result.dryRun) {
  console.log('No containers were removed. Re-run with --execute to delete them.');
} else {
  console.log(`Removed ${result.removed.length} container(s).`);
}
