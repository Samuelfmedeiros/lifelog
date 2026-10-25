/**
 * Saída para os outros ativos com UTM (REGRA-AMARRACAO, 24/10/2026).
 *
 * Páginas institucionais (/sobre, /en/about) linkavam o portfólio cru. O guard
 * `scripts/validate-saidas-utm.mjs` falhou o build nesses dois links — agora eles
 * saem com origem, igual aos posts.
 */

export function comUtm(
  url: string,
  medium: string,
  campaign = 'sobre',
  content = 'links',
): string {
  try {
    const alvo = new URL(url);
    alvo.searchParams.set('utm_source', 'lifelog');
    alvo.searchParams.set('utm_medium', medium);
    alvo.searchParams.set('utm_campaign', campaign);
    alvo.searchParams.set('utm_content', content);
    return alvo.toString();
  } catch {
    return url; // link inválido não pode quebrar a página
  }
}
