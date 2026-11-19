import type { FiltroProdutos, Ordem } from '../api/catalogo';

export const TAMANHO_PAGINA = 24;
export const ordens: { valor: Ordem; rotulo: string }[] = [
  { valor: 'nome', rotulo: 'Nome (A–Z)' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'maior-preco', rotulo: 'Maior preço' },
];

/** O que a URL guarda. `pagina` é 1-based aqui (amigável) e 0-based só na chamada à API. */
export interface FiltrosUrl {
  busca: string;
  categoria: string;
  precoMin: string;
  precoMax: string;
  disponivel: boolean;
  ordem: Ordem;
  pagina: number;
}

const numeroPositivo = (v: string | null) =>
  v !== null && v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? v.trim() : '';

/** A URL é entrada do usuário: valores inválidos viram o padrão em vez de quebrar a tela. */
export function lerFiltros(params: URLSearchParams): FiltrosUrl {
  const ordem = params.get('ordem');
  const pagina = Number.parseInt(params.get('pagina') ?? '1', 10);
  return {
    busca: params.get('busca')?.trim() ?? '',
    categoria: params.get('categoria') ?? '',
    precoMin: numeroPositivo(params.get('precoMin')),
    precoMax: numeroPositivo(params.get('precoMax')),
    disponivel: params.get('disponivel') === 'true',
    ordem: ordens.some((o) => o.valor === ordem) ? (ordem as Ordem) : 'nome',
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

/** Só grava o que difere do padrão, para o link compartilhado ficar curto. */
export function paraParams(f: FiltrosUrl): URLSearchParams {
  const p = new URLSearchParams();
  if (f.busca) p.set('busca', f.busca);
  if (f.categoria) p.set('categoria', f.categoria);
  if (f.precoMin) p.set('precoMin', f.precoMin);
  if (f.precoMax) p.set('precoMax', f.precoMax);
  if (f.disponivel) p.set('disponivel', 'true');
  if (f.ordem !== 'nome') p.set('ordem', f.ordem);
  if (f.pagina > 1) p.set('pagina', String(f.pagina));
  return p;
}

export function paraApi(f: FiltrosUrl): FiltroProdutos {
  return {
    busca: f.busca || undefined,
    categoria: f.categoria || undefined,
    precoMin: f.precoMin ? Number(f.precoMin) : undefined,
    precoMax: f.precoMax ? Number(f.precoMax) : undefined,
    disponivel: f.disponivel || undefined,
    ordem: f.ordem,
    pagina: f.pagina - 1,
    tamanho: TAMANHO_PAGINA,
  };
}
