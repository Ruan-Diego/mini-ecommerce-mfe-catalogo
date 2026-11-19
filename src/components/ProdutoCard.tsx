import { Link } from 'react-router-dom';
import { Button, Pill, ProductObject, type FormaObjeto, type MaterialObjeto } from '@ruan-diego/mini-design-system';
import { useAdicionarAoCarrinho } from '../barramento';
import type { Produto } from '../api/catalogo';

export type Selo = 'novo' | 'ultimas-unidades' | 'esgotado';

const selos: Record<Selo, { texto: string; tom: 'destaque' | 'aviso' | 'erro' }> = {
  novo: { texto: 'Novo', tom: 'destaque' },
  'ultimas-unidades': { texto: 'Últimas unidades', tom: 'aviso' },
  esgotado: { texto: 'Esgotado', tom: 'erro' },
};

const formas: FormaObjeto[] = ['esfera', 'anel', 'capsula', 'bloco'];
const materiais: MaterialObjeto[] = ['chrome', 'lime', 'clay', 'ink', 'amber', 'iris'];

/** Hash estável do slug: o mesmo produto sempre ganha a mesma "foto" de CSS quando não há imagem. */
function hash(texto: string) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export const formatarPreco = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  produto: Produto;
  /**
   * O catálogo ainda não sabe estoque nem data de cadastro (estoque-service chega na Fase 4),
   * então quem usa o card decide o selo. Esgotado/Últimas unidades passam a vir do estoque.
   */
  selo?: Selo;
}

export function ProdutoCard({ produto, selo }: Props) {
  const h = hash(produto.slug);
  const imagem = produto.imagens[0];
  const esgotado = selo === 'esgotado';
  const adicionar = useAdicionarAoCarrinho();
  return (
    <article className={`produto-card${esgotado ? ' esgotado' : ''}`}>
      <Link to={`/produtos/${produto.slug}`} className="produto-card-link" aria-label={`${produto.nome}, ${formatarPreco(produto.preco)}${selo ? `, ${selos[selo].texto}` : ''}`}>
        <div className="pimg">
          {imagem ? (
            <img src={imagem.url} alt={imagem.textoAlternativo} loading="lazy" className="produto-card-img" />
          ) : (
            <ProductObject forma={formas[h % formas.length]} material={materiais[(h >> 3) % materiais.length]} />
          )}
          {selo && (
            <Pill tom={selos[selo].tom} className="produto-card-selo">
              {selos[selo].texto}
            </Pill>
          )}
        </div>
        <h3 className="h4 produto-card-nome">{produto.nome}</h3>
        <p className="price produto-card-preco">{formatarPreco(produto.preco)}</p>
      </Link>
      {/* Fora do <Link>: botão dentro de link é HTML inválido e o clique navegaria junto. */}
      <Button
        variante="secundario"
        pequeno
        bloco
        className="produto-card-adicionar"
        disabled={esgotado}
        aria-label={esgotado ? `${produto.nome}, esgotado` : `Adicionar ${produto.nome} ao carrinho`}
        onClick={() => adicionar(produto.id, 1)}
      >
        {esgotado ? 'Esgotado' : 'Adicionar'}
      </Button>
    </article>
  );
}
