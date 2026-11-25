import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guard de estrutura das Vercel Functions.
 *
 * Todo arquivo .mjs dentro de api/ é tratado pela Vercel como function e
 * executa no runtime: se ele exportar apenas dados (export default [...]),
 * a invocação estoura FUNCTION_INVOCATION_FAILED (HTTP 500). Foi o que
 * aconteceu com api/ocultos-data.mjs até 25/11/2026 — módulos de dados
 * passaram a viver em data/.
 */
const RAIZ = process.cwd();
const API = join(RAIZ, 'api');

const HANDLER = /export\s+default\s+(async\s+)?function|export\s+default\s+async\s*\(|export\s+default\s+\(?\s*(req|request)/;

describe('estrutura de api/ (Vercel Functions)', () => {
  const arquivos = readdirSync(API).filter((f) => f.endsWith('.mjs'));

  it('tem pelo menos uma function', () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  it.each(arquivos)('%s exporta handler, não dados', (nome) => {
    const src = readFileSync(join(API, nome), 'utf-8');
    expect(HANDLER.test(src), `${nome} parece exportar dados e viraria 500`).toBe(true);
  });

  it('ocultos-data vive em data/ e nao em api/', () => {
    expect(existsSync(join(RAIZ, 'data', 'ocultos-data.mjs'))).toBe(true);
    expect(existsSync(join(API, 'ocultos-data.mjs'))).toBe(false);
  });
});
