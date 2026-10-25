/**
 * rehype-saida-utm — REGRA-AMARRACAO no CORPO do post (24/10/2026).
 *
 * Problema medido: o LifeLog manda 423 páginas para a loja, mas o único link de saída
 * ficava no bloco do rodapé ("Próximo passo"). Quem lê o meio do texto nunca vê a saída,
 * e o destino recebe visita sem atribuição quando o link sai sem UTM.
 *
 * Este plugin faz duas coisas, no build, para TODO post (PT e EN):
 *   1. normaliza o UTM de qualquer link de saída para
 *      utm_source=lifelog & utm_medium=post & utm_campaign=<slug> & utm_content=<local>;
 *   2. se o corpo do texto não tem NENHUM link para os ativos do Samuel, insere um
 *      parágrafo curto com essa saída no meio do artigo (utm_content=corpo).
 *
 * Sem JS no cliente, sem dependência nova. Slug vem do nome do arquivo, que é a mesma
 * convenção usada pelo PostLayout (`post.id`).
 */
import path from 'node:path';

const HOSTS = new Set([
  'skills.seu.pet',
  'portifolio.seu.pet',
  'arachne.seu.pet',
  'seu.pet',
  'focinho.seu.pet',
  'portifolio-30.vercel.app',
]);

const UTM_SOURCE = 'lifelog';
const UTM_MEDIUM = 'post';

const COPY = {
  pt: {
    antes: 'As ferramentas que uso neste projeto ficam na ',
    link: 'loja de skills',
    depois: ' — a primeira é grátis.',
  },
  en: {
    antes: 'The tools I use on this project live in the ',
    link: 'skills store',
    depois: ' — the first one is free.',
  },
};

function comUtm(href, { slug, content }) {
  let alvo;
  try {
    alvo = new URL(href);
  } catch {
    return null; // relativo ou mailto: não é saída
  }
  if (!HOSTS.has(alvo.hostname)) return null;
  alvo.searchParams.set('utm_source', UTM_SOURCE);
  alvo.searchParams.set('utm_medium', UTM_MEDIUM);
  alvo.searchParams.set('utm_campaign', slug);
  alvo.searchParams.set('utm_content', content);
  return alvo.toString();
}

function filhos(node) {
  return Array.isArray(node?.children) ? node.children : [];
}

function visitar(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const filho of filhos(node)) visitar(filho, fn);
}

/** Marca os links de saída do corpo com utm_content=corpo e diz se existe algum. */
function normalizarLinks(raiz, ctx) {
  let achou = false;
  visitar(raiz, (node) => {
    if (node.type !== 'element' || node.tagName !== 'a') return;
    const props = node.properties || (node.properties = {});
    if (typeof props.href !== 'string') return;
    const novo = comUtm(props.href, { slug: ctx.slug, content: 'corpo' });
    if (!novo) return;
    props.href = novo;
    props.rel = props.rel || 'noopener';
    achou = true;
  });
  return achou;
}

function paragrafoDeSaida(ctx) {
  const copy = ctx.en ? COPY.en : COPY.pt;
  const href = comUtm('https://skills.seu.pet', {
    slug: ctx.slug,
    content: 'corpo',
  });
  return {
    type: 'element',
    tagName: 'p',
    properties: { className: ['amarracao-corpo'], 'data-utm': 'corpo' },
    children: [
      { type: 'text', value: copy.antes },
      {
        type: 'element',
        tagName: 'a',
        properties: { href, rel: 'noopener' },
        children: [{ type: 'text', value: copy.link }],
      },
      { type: 'text', value: copy.depois },
    ],
  };
}

/**
 * Insere a saída depois do 2º parágrafo do artigo. Se o texto não tiver 2 parágrafos,
 * cai para o fim do conteúdo — nunca deixa post sem link de saída.
 */
function inserirNoCorpo(raiz, ctx) {
  const blocos = raiz.children || [];
  const paragrafos = [];
  blocos.forEach((node, idx) => {
    if (node.type === 'element' && node.tagName === 'p') paragrafos.push(idx);
  });
  const novo = paragrafoDeSaida(ctx);
  const posicao = paragrafos.length >= 2 ? paragrafos[1] + 1 : blocos.length;
  blocos.splice(posicao, 0, novo);
  return raiz;
}

export function slugDoArquivo(arquivo) {
  const rel = String(arquivo?.path || '');
  const base = path.basename(rel, path.extname(rel))
    // O campaign é o slug público do post, sem o prefixo de data: é o mesmo valor
    // que o PostLayout usa no rodapé, então os dois links caem na mesma linha do funil.
    .replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const en = /[\\/]posts[\\/]en[\\/]/.test(rel);
  return { slug: base, en };
}

export default function rehypeSaidaUtm() {
  return (tree, arquivo) => {
    const caminho = String(arquivo?.path || '').replace(/\\/g, '/');
    // Preview oculto e draft não levam UTM: não são páginas públicas.
    if (caminho.includes('/ocultos/') || caminho.includes('/drafts/')) return;
    const { slug, en } = slugDoArquivo(arquivo);
    if (!slug) return;
    // Normaliza o que o autor já escreveu e, só se não houver NENHUMA saída no corpo,
    // insere o parágrafo de saída. Um plugin só: dois inserindo dariam link duplicado.
    const achou = normalizarLinks(tree, { slug });
    if (!achou) inserirNoCorpo(tree, { slug, en });
  };
}
