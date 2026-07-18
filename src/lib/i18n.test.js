import { describe, it, expect } from 'vitest';
import { detectLocale, getTranslations, localizedPath } from '../lib/i18n';

describe('i18n engine', () => {
  // ── detectLocale ──
  it('detectLocale: retorna pt para path raiz', () => {
    const url = new URL('https://lifelog.example.com/');
    expect(detectLocale(url)).toBe('pt');
  });

  it('detectLocale: retorna pt para path sem /en/', () => {
    const url = new URL('https://lifelog.example.com/post/slug/');
    expect(detectLocale(url)).toBe('pt');
  });

  it('detectLocale: retorna en para /en/', () => {
    const url = new URL('https://lifelog.example.com/en/');
    expect(detectLocale(url)).toBe('en');
  });

  it('detectLocale: retorna en para /en exclusivo', () => {
    const url = new URL('https://lifelog.example.com/en');
    expect(detectLocale(url)).toBe('en');
  });

  it('detectLocale: retorna en para /en/post/slug/', () => {
    const url = new URL('https://lifelog.example.com/en/post/slug/');
    expect(detectLocale(url)).toBe('en');
  });

  // ── getTranslations ──
  it('getTranslations: retorna tradução pt', () => {
    const t = getTranslations('pt');
    expect(t).toBeDefined();
    expect(t.home).toBeDefined();
    expect(t.home.title).toBe('Início');
  });

  it('getTranslations: retorna tradução en', () => {
    const t = getTranslations('en');
    expect(t).toBeDefined();
    expect(t.home).toBeDefined();
    expect(t.home.title).toBe('Home');
  });

  it('getTranslations: fallback pt para locale inválido', () => {
    const t = getTranslations('fr');
    expect(t).toBeDefined();
    expect(t.home.title).toBe('Início');
  });

  it('getTranslations: todos os namespaces existem em pt e en', () => {
    const pt = getTranslations('pt');
    const en = getTranslations('en');
    // Mesmas chaves em ambos
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
  });

  it('getTranslations: nav.home existe em pt', () => {
    const t = getTranslations('pt');
    expect(t.nav.home).toBe('Início');
  });

  it('getTranslations: nav.home existe em en', () => {
    const t = getTranslations('en');
    expect(t.nav.home).toBe('Home');
  });

  // ── localizedPath ──
  it('localizedPath: retorna path original para pt', () => {
    expect(localizedPath('/post/slug/', 'pt')).toBe('/post/slug/');
  });

  it('localizedPath: adiciona /en/ para locale en', () => {
    expect(localizedPath('/post/slug/', 'en')).toBe('/en/post/slug/');
  });

  it('localizedPath: lida com path raiz para en', () => {
    expect(localizedPath('/', 'en')).toBe('/en/');
  });
});
