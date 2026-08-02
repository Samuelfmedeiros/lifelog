import { describe, it, expect } from 'vitest';
import { PROJECTS, getProject, PROJECT_ACCENTS, type ProjectDef } from '../lib/projects';

describe('projects.ts — data-driven', () => {
  it('PROJECTS contains exactly the 9 registered projects', () => {
    expect(PROJECTS.length).toBe(9);
    // ids únicos
    const ids = PROJECTS.map(p => p.id);
    expect(new Set(ids).size).toBe(9);
  });

  // Data-driven: cada projeto validado com o MESMO contrato
  it.each(PROJECTS.map((p) => [p.id, p.label, p.icon, p.group, p.accentDark] as const))(
    'project %s (%s) has required fields: icon=%s group=%s accent=%s',
    (id, label, icon, group, accentDark) => {
      expect(id).toBeTruthy();
      expect(label).toBeTruthy();
      expect(icon).toBeTruthy();
      expect(accentDark).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['projetos', 'estudos', 'descobertas']).toContain(group);
    }
  );

  // Data-driven: getProject resolve o id correto
  it.each(PROJECTS.map((p) => [p.id, p.label] as const))(
    'getProject(%s) returns %s',
    (id, label) => {
      const proj = getProject(id);
      expect(proj).toBeDefined();
      expect(proj!.label).toBe(label);
    }
  );

  // Data-driven: PROJECT_ACCENTS cobre todos os ids
  it.each(PROJECTS.map((p) => [p.id, p.accentDark] as const))(
    'PROJECT_ACCENTS[%s] = %s',
    (id, accentDark) => {
      expect(PROJECT_ACCENTS[id]).toBe(accentDark);
    }
  );
});

describe('getProject — casos limite', () => {
  it('retorna undefined para id inexistente', () => {
    expect(getProject('nonexistent')).toBeUndefined();
  });

  it('retorna undefined para string vazia', () => {
    expect(getProject('')).toBeUndefined();
  });

  it('é case-sensitive — id maiúsculo não resolve', () => {
    expect(getProject('ARACHNE')).toBeUndefined();
  });

  it('rejeita injeção de caracteres inesperados', () => {
    for (const payload of [
      'arachne; DROP TABLE projects;--',
      '<script>alert(1)</script>',
      'dogwalk" OR "1"="1',
      'portfolio/../../etc/passwd',
      'null',
      'undefined',
    ]) {
      expect(getProject(payload)).toBeUndefined();
    }
  });
});

describe('PROJECT_ACCENTS — integridade', () => {
  it('cobre exatamente os 9 ids', () => {
    const ids = PROJECTS.map(p => p.id).sort();
    const accentIds = Object.keys(PROJECT_ACCENTS).sort();
    expect(accentIds).toEqual(ids);
  });

  it('nenhum accent é inválido (hex 6 dígitos)', () => {
    for (const [id, accent] of Object.entries(PROJECT_ACCENTS)) {
      expect(accent, `accent de ${id}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('sanity', () => {
  it('true is true', () => {
    expect(true).toBe(true);
  });
});
