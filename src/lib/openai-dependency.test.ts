import { describe, it, expect } from 'vitest';

describe('openai dependency regression (REVISOR_INDISPONIVEL)', () => {
  it('project source has no openai dependency or import', () => {
    const packageJson = JSON.parse(
      require('fs').readFileSync(
        new URL('../../package.json', import.meta.url).pathname,
        'utf-8',
      ),
    );
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };
    expect(deps).not.toHaveProperty('openai');
  });
});
