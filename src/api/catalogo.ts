/**
 * Cliente HTTP do catalogo-service. Este MFE só fala com o próprio serviço, sempre pelo gateway:
 * VITE_API_URL aponta para a rota do catálogo (ex.: http://localhost:8080/api/catalogo).
 */

export interface Imagem {
  url: string;
  textoAlternativo: string;
}

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  imagens: Imagem[];
  categoriaId: string;
  ativo: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  paiId: string | null;
}

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  total: number;
  totalPaginas: number;
}

export type Ordem = 'nome' | 'menor-preco' | 'maior-preco';

export interface FiltroProdutos {
  busca?: string;
  categoria?: string;
  ordem?: Ordem;
  pagina?: number;
  tamanho?: number;
}

export class ErroDeApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const baseUrl = () => (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function obter<T>(caminho: string, params: Record<string, string | number | undefined> = {}, sinal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== '') query.set(chave, String(valor));
  }
  const url = `${baseUrl()}${caminho}${query.size > 0 ? `?${query}` : ''}`;
  const resposta = await fetch(url, { headers: { Accept: 'application/json' }, signal: sinal });
  if (!resposta.ok) throw new ErroDeApi(resposta.status, `catálogo respondeu HTTP ${resposta.status}`);
  return (await resposta.json()) as T;
}

export const buscarProdutos = (filtro: FiltroProdutos = {}, sinal?: AbortSignal) =>
  obter<Pagina<Produto>>('/produtos', { ...filtro }, sinal);

export const obterProduto = (slug: string, sinal?: AbortSignal) =>
  obter<Produto>(`/produtos/${encodeURIComponent(slug)}`, {}, sinal);

export const listarCategorias = (sinal?: AbortSignal) => obter<Categoria[]>('/categorias', {}, sinal);
