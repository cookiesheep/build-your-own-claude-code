import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const serverDir = dirname(scriptDir);
const repoRoot = dirname(serverDir);
const sourceJson = join(repoRoot, 'platform', 'src', 'lib', 'lab-files.json');
const outputTs = join(serverDir, 'src', 'services', 'lab-files-generated.ts');

const labFiles = JSON.parse(readFileSync(sourceJson, 'utf8'));
const generated = `/**
 * Auto-generated from platform/src/lib/lab-files.json
 * Do not edit by hand.
 */

export type LabFileDef = {
  path: string;
  editable: boolean;
  skeleton: string;
};

export const LAB_FILES: Record<number, LabFileDef[]> = ${JSON.stringify(labFiles, null, 2)} as const;
`;

mkdirSync(dirname(outputTs), { recursive: true });
writeFileSync(outputTs, generated);
console.log(`[generate-lab-config] Wrote ${outputTs}`);
