/**
 * Disponibilidade de um produto, lida do estoque-service (leitura pública, pelo gateway). O catálogo não tem estoque
 * próprio: a vitrine só pergunta quanto há para vender. A base é `VITE_ESTOQUE_API_URL` (ex.: http://localhost:8080/api/estoque);
 * sem ela, deriva de `VITE_API_URL` trocando o final `/catalogo` por `/estoque`.
 */
import { ErroDeApi } from './catalogo';

export interface Disponibilidade {
  produtoId: string;
  /** Saldo vendável agora (o reservado para pedidos em andamento já saiu daqui). */
  disponivel: number;
  reservado: number;
  emEstoque: boolean;
  /** Regra do backend (abaixo do limite do estoque-service): a vitrine não recalcula o limite. */
  estoqueBaixo: boolean;
}

const baseUrl = () => {
  const explicita = import.meta.env.VITE_ESTOQUE_API_URL;
  const base = explicita ?? (import.meta.env.VITE_API_URL ?? '').replace(/\/catalogo\/?$/, '/estoque');
  return base.replace(/\/$/, '');
};

/** 404 (ErroDeApi) = o produto não tem saldo cadastrado: para a vitrine, esgotado. */
export async function consultarDisponibilidade(produtoId: string, sinal?: AbortSignal): Promise<Disponibilidade> {
  const resposta = await fetch(`${baseUrl()}/estoque/${encodeURIComponent(produtoId)}`, {
    headers: { Accept: 'application/json' },
    signal: sinal,
  });
  if (!resposta.ok) throw new ErroDeApi(resposta.status, `estoque respondeu HTTP ${resposta.status}`);
  return (await resposta.json()) as Disponibilidade;
}
