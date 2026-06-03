import { LAB_FILES } from './lab-files-generated.js';

export function getPrimaryLabFilePath(labNumber: number): string {
  return LAB_FILES[labNumber]?.[0]?.path ?? 'src/query-lab3.ts';
}

export function getAllowedLabFilePaths(labNumber: number): Set<string> {
  return new Set((LAB_FILES[labNumber] ?? []).map((file) => file.path));
}

export function isSafeWorkspacePath(path: string): boolean {
  return !path.includes('..') && !path.startsWith('/') && /^[a-zA-Z0-9_/.-]+$/.test(path);
}

export function normalizeWorkspaceFiles(
  labNumber: number,
  value: unknown
): Record<string, string> {
  const allowedPaths = getAllowedLabFilePaths(labNumber);
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value).filter(
      ([path, code]) =>
        typeof path === 'string' &&
        typeof code === 'string' &&
        isSafeWorkspacePath(path) &&
        allowedPaths.has(path)
    );
    return Object.fromEntries(entries);
  }

  if (typeof value === 'string') {
    return {
      [getPrimaryLabFilePath(labNumber)]: value,
    };
  }

  return {};
}
