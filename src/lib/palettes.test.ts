import { describe, it, expect } from 'vitest';
import { PALETTES, DEFAULT_PALETTE, getPaletteById } from '../lib/palettes';

describe('palettes', () => {
  it('PALETTES contém 6 paletas', () => {
    expect(PALETTES).toHaveLength(6);
  });

  it('cada palette tem campos obrigatórios', () => {
    for (const p of PALETTES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.accentDark).toMatch(/^#[0-9a-f]{6}$/);
      expect(p.accentLight).toMatch(/^#[0-9a-f]{6}$/);
      expect(p.borderDark).toContain('rgba');
      expect(p.borderLight).toContain('rgba');
      expect(p.glowDark).toMatch(/^(0|box)/);
      expect(p.glowLight).toMatch(/^(0|box)/);
      expect(p.tagBg).toContain('rgba');
    }
  });

  it('ids são únicos', () => {
    const ids = PALETTES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('DEFAULT_PALETTE é purple', () => {
    expect(DEFAULT_PALETTE).toBe('purple');
  });

  it('getPaletteById retorna palette correta', () => {
    const p = getPaletteById('emerald');
    expect(p.name).toBe('Verde');
    expect(p.accentDark).toBe('#34d399');
  });

  it('getPaletteById retorna default para id inválido', () => {
    const p = getPaletteById('fake');
    expect(p.id).toBe(DEFAULT_PALETTE);
    expect(p.name).toBe('Roxo');
  });

  it('todas as paletas têm accentDark diferente de accentLight', () => {
    for (const p of PALETTES) {
      expect(p.accentDark).not.toBe(p.accentLight);
    }
  });

  it('cores dark são mais claras que light (hex: dark > light numeric)', () => {
    for (const p of PALETTES) {
      const dark = parseInt(p.accentDark.slice(1), 16);
      const light = parseInt(p.accentLight.slice(1), 16);
      expect(dark).toBeGreaterThan(light);
    }
  });
});
