import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Pill, ProductObject, QuantityStepper } from '@ruan-diego/mini-design-system';
import { obterProduto, type Produto as ProdutoApi } from '../api/catalogo';
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

/**
 * Compra do produto. `disponivel` vem do estoque-service quando ele existir (Fase 4); até lá a
 * página passa `true`. O clique em "Adicionar ao carrinho" emitirá `carrinho:adicionar-item`
 * na issue "Emitir carrinho:adicionar-item" (Fase 2).
 */
export function Compra({ produto, disponivel }: { produto: ProdutoApi; disponivel: boolean }) {
  const [quantidade, setQuantidade] = useState(1);
  return (
    <div className="prod-compra">
      <p className="price prod-preco">{formatarPreco(produto.preco)}</p>
      <Pill tom={disponivel ? 'sucesso' : 'erro'}>{disponivel ? 'Em estoque' : 'Esgotado'}</Pill>
      <QuantityStepper valor={quantidade} aoMudar={setQuantidade} min={1} max={MAX_QUANTIDADE} rotulo={`Quantidade de ${produto.nome}`} />
      <Button variante="primario" bloco disabled={!disponivel}>
        {disponivel ? 'Adicionar ao carrinho' : 'Produto esgotado'}
      </Button>
    </div>
  );
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
          <Compra produto={produto} disponivel />
          <SimuladorFrete />
        </div>
      </div>
    </article>
  );
}

