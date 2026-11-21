import { useState } from 'react';
import { useAdicionarAoCarrinho } from '../barramento';
import { Link, useParams } from 'react-router-dom';
import { Button, Pill, ProductObject, QuantityStepper } from '@ruan-diego/mini-design-system';
import { obterProduto, type Produto as ProdutoApi } from '../api/catalogo';
import { consultarDisponibilidade } from '../api/estoque';
import { useRecurso } from '../api/useRecurso';
import { SimuladorFrete } from '../components/SimuladorFrete';
import { formatarPreco } from '../components/ProdutoCard';
import './produto.css';

const MAX_QUANTIDADE = 10;

function Galeria({ produto }: { produto: ProdutoApi }) {
  const [indice, setIndice] = useState(0);
  const atual = produto.imagens[indice];
  return (
    <div className="prod-galeria">
      <div className="pimg prod-foto">
        {atual ? <img src={atual.url} alt={atual.textoAlternativo} className="produto-card-img" /> : <ProductObject forma="esfera" material="chrome" rotulo={produto.nome} />}
      </div>
      {produto.imagens.length > 1 && (
        <ul className="prod-miniaturas" aria-label="Imagens do produto">
          {produto.imagens.map((img, i) => (
            <li key={img.url}>
              <button type="button" className="prod-miniatura" aria-pressed={i === indice} aria-label={`Ver imagem ${i + 1}: ${img.textoAlternativo}`} onClick={() => setIndice(i)}>
                <img src={img.url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface PropsCompra {
  produto: ProdutoApi;
  disponivel: boolean;
  /** Saldo vendável, quando o estoque respondeu: limita a quantidade e alimenta o aviso de últimas unidades. */
  unidades?: number;
  /** O estoque-service ainda não respondeu: o botão espera. */
  verificando?: boolean;
  /** O estoque-service diz que o saldo está baixo (o limite é dele; aqui só muda o texto). */
  estoqueBaixo?: boolean;
}

/**
 * Compra do produto. `disponivel` e `unidades` vêm do estoque-service (ver CompraComEstoque). O clique em
 * "Adicionar ao carrinho" emite `carrinho:adicionar-item` com a quantidade escolhida; o mini-carrinho (outro MFE)
 * abre ao ouvir o evento.
 */
export function Compra({ produto, disponivel, unidades, verificando = false, estoqueBaixo = false }: PropsCompra) {
  const [quantidade, setQuantidade] = useState(1);
  const adicionar = useAdicionarAoCarrinho();
  const maximo = Math.max(1, Math.min(MAX_QUANTIDADE, unidades ?? MAX_QUANTIDADE));
  const podeComprar = disponivel && !verificando;

  let selo = <Pill tom="sucesso">Em estoque</Pill>;
  if (verificando) selo = <Pill>Verificando estoque…</Pill>;
  else if (!disponivel) selo = <Pill tom="erro">Esgotado</Pill>;
  else if (estoqueBaixo && unidades !== undefined) {
    selo = <Pill tom="aviso">{unidades === 1 ? 'Última unidade' : `Últimas ${unidades} unidades`}</Pill>;
  }

  return (
    <div className="prod-compra">
      <p className="price prod-preco">{formatarPreco(produto.preco)}</p>
      {selo}
      <QuantityStepper valor={Math.min(quantidade, maximo)} aoMudar={setQuantidade} min={1} max={maximo} rotulo={`Quantidade de ${produto.nome}`} />
      <Button variante="primario" bloco disabled={!podeComprar} onClick={() => adicionar(produto.id, Math.min(quantidade, maximo))}>
        {verificando ? 'Verificando estoque…' : disponivel ? 'Adicionar ao carrinho' : 'Produto esgotado'}
      </Button>
    </div>
  );
}

/**
 * Pergunta o saldo ao estoque-service. Sem saldo cadastrado (404) o produto está esgotado. Se o estoque-service
 * estiver fora do ar a compra não trava: a vitrine mostra como disponível, e quem decide de verdade é a reserva do
 * pedido (que cancela o pedido se faltar).
 */
function CompraComEstoque({ produto }: { produto: ProdutoApi }) {
  const estoque = useRecurso((s) => consultarDisponibilidade(produto.id, s), [produto.id]);
  if (estoque.situacao === 'carregando') return <Compra produto={produto} disponivel verificando />;
  if (estoque.situacao === 'naoEncontrado') return <Compra produto={produto} disponivel={false} />;
  if (estoque.situacao === 'erro') return <Compra produto={produto} disponivel />;
  const { emEstoque, disponivel, estoqueBaixo } = estoque.dados;
  return <Compra produto={produto} disponivel={emEstoque} unidades={disponivel} estoqueBaixo={estoqueBaixo} />;
}

export function Produto() {
  const { slug = '' } = useParams();
  const estado = useRecurso((s) => obterProduto(slug, s), [slug]);

  if (estado.situacao === 'carregando') {
    return <div className="wrap prod" aria-busy="true" aria-label="Carregando produto"><div className="prod-skeleton" /></div>;
  }
  if (estado.situacao === 'erro') {
    return (
      <div className="wrap prod">
        <div className="prod-aviso" role="alert">
          <p>Não consegui carregar o produto.</p>
          <Button variante="secundario" pequeno onClick={estado.recarregar}>
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }
  if (estado.situacao === 'naoEncontrado') {
    return (
      <section className="wrap prod prod-404">
        <span className="eyebrow">Erro 404</span>
        <h1 className="h2">Produto não encontrado</h1>
        <p className="muted">Ele pode ter saído da vitrine ou o link está incorreto.</p>
        <Link to="/produtos" className="btn btn-pri">
          Voltar para a vitrine
        </Link>
      </section>
    );
  }

  const produto = estado.dados;
  return (
    <article className="wrap prod">
      <nav aria-label="Você está em" className="prod-trilha">
        <Link to="/produtos">Produtos</Link> / <span aria-current="page">{produto.nome}</span>
      </nav>
      <div className="prod-grade">
        <Galeria produto={produto} />
        <div className="prod-info">
          <span className="eyebrow">SKU {produto.sku}</span>
          <h1 className="h2">{produto.nome}</h1>
          <p className="muted prod-descricao">{produto.descricao}</p>
          <CompraComEstoque produto={produto} />
          <SimuladorFrete />
        </div>
      </div>
    </article>
  );
}

