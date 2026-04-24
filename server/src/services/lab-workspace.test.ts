import { describe, expect, it } from 'vitest';
import { getPrimaryLabFilePath, normalizeWorkspaceFiles } from './lab-workspace.js';

describe('lab workspace compatibility', () => {
  it('maps legacy string workspaces to the lab primary file', () => {
    expect(normalizeWorkspaceFiles(3, 'legacy-code')).toEqual({
      [getPrimaryLabFilePath(3)]: 'legacy-code',
    });
  });

  it('drops paths outside the configured lab file set', () => {
    expect(
      normalizeWorkspaceFiles(2, {
        'src/tools/read-file-lab2.ts': 'ok',
        'src/hack.ts': 'nope',
      })
    ).toEqual({
      'src/tools/read-file-lab2.ts': 'ok',
    });
  });
});
