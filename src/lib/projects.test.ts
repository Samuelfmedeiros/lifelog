import { describe, it, expect } from 'vitest';
import { PROJECTS, getProject, PROJECT_ACCENTS } from '../lib/projects';

describe('projects registry', () => {
  it('PROJECTS contém todos os 9 projetos', () => {
    expect(PROJECTS).toHaveLength(9);
  });

  it('PROJECTS tem campos obrigatórios', () => {
    for (const p of PROJECTS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.accentDark).toMatch(/^#[0-9a-f]{6}$/);
      expect(['projetos', 'estudos', 'descobertas']).toContain(p.group);
    }
  });

  it('getProject retorna projeto por id', () => {
    const p = getProject('arachne');
    expect(p).toBeDefined();
    expect(p!.label).toBe('Arachne');
    expect(p!.icon).toBe('🕷️');
  });

  it('getProject retorna undefined para id inexistente', () => {
    expect(getProject('nao-existe')).toBeUndefined();
  });

  it('ids são únicos', () => {
    const ids = PROJECTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('PROJECT_ACCENTS contém todos os projetos', () => {
    for (const p of PROJECTS) {
      expect(PROJECT_ACCENTS[p.id]).toBe(p.accentDark);
    }
  });

  it('getProject é case-sensitive', () => {
    expect(getProject('Arachne')).toBeUndefined();
    expect(getProject('arachne')).toBeDefined();
  });
});
