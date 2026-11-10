import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('openai dependency regression (REVISOR_INDISPONIVEL)', () => {
  it('project source has no openai dependency or import', () => {
    const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
    const packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };
    expect(deps).not.toHaveProperty('openai');
  });
});
