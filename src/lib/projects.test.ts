import { describe, it, expect } from 'vitest';
import { PROJECTS, getProject, PROJECT_ACCENTS } from '../lib/projects';

describe('projects.ts', () => {
  it('PROJECTS contains all 9 projects', () => {
    expect(PROJECTS.length).toBe(9);
  });

  it('each project has required fields', () => {
    for (const p of PROJECTS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.accentDark).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['projetos', 'estudos', 'descobertas']).toContain(p.group);
    }
  });

  it('getProject returns correct project', () => {
    const arachne = getProject('arachne');
    expect(arachne).toBeDefined();
    expect(arachne!.label).toBe('Arachne');
    expect(arachne!.icon).toBe('🕷️');
  });

  it('getProject returns undefined for unknown id', () => {
    expect(getProject('nonexistent')).toBeUndefined();
  });

  it('PROJECT_ACCENTS has all 9 entries', () => {
    expect(Object.keys(PROJECT_ACCENTS).length).toBe(9);
    expect(PROJECT_ACCENTS.arachne).toBe('#7c3aed');
  });
});

describe('iquick sanity', () => {
  it('true is true', () => {
    expect(true).toBe(true);
  });
});
