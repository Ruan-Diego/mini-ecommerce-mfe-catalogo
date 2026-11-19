import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@ruan-diego/mini-design-system';
import { buscarProdutos, listarCategorias, type Produto } from '../api/catalogo';
import { useRecurso } from '../api/useRecurso';
import { ProdutoCard, type Selo } from '../components/ProdutoCard';
import './home.css';

function Skeleton({ quantidade }: { quantidade: number }) {
  return (
    <ul className="home-lista" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: quantidade }, (_, i) => (
        <li key={i} className="home-skeleton" />
      ))}
    </ul>
  );
}

function Erro({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="home-aviso" role="alert">
      <p>Não consegui carregar esta parte do catálogo.</p>
      <Button variante="secundario" pequeno onClick={aoTentar}>
        Tentar de novo
      </Button>
    </div>
  );
}

interface CarrosselProps {
  titulo: string;
  produtos: Produto[];
  selo?: Selo;
}

/** Carrossel por rolagem horizontal com scroll-snap: funciona com teclado (Tab) e sem JavaScript extra. */
function Carrossel({ titulo, produtos, selo }: CarrosselProps) {
  const id = useId();
  return (
    <section className="wrap home-secao" aria-labelledby={id}>
      <div className="home-secao-topo">
        <h2 className="h3" id={id}>
          {titulo}
        </h2>
        <Link to="/produtos" className="home-ver-todos">
          Ver todos
        </Link>
      </div>
      <ul className="home-lista home-carrossel">
        {produtos.map((p) => (
          <li key={p.id}>
            <ProdutoCard produto={p} selo={selo} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SecaoProdutos({ titulo, ordem, selo }: { titulo: string; ordem: 'nome' | 'menor-preco'; selo?: Selo }) {
  const estado = useRecurso((s) => buscarProdutos({ ordem, tamanho: 8 }, s), [ordem]);
  if (estado.situacao === 'carregando') return <div className="wrap home-secao"><Skeleton quantidade={4} /></div>;
  if (estado.situacao === 'erro' || estado.situacao === 'naoEncontrado') return <div className="wrap home-secao"><Erro aoTentar={estado.recarregar} /></div>;
  if (estado.dados.itens.length === 0) {
    return (
      <div className="wrap home-secao">
        <p className="muted">{titulo}: ainda não há produtos cadastrados.</p>
      </div>
    );
  }
  return <Carrossel titulo={titulo} produtos={estado.dados.itens} selo={selo} />;
}

function Categorias() {
  const estado = useRecurso((s) => listarCategorias(s));
  if (estado.situacao === 'carregando') return <div className="wrap home-secao"><Skeleton quantidade={4} /></div>;
  if (estado.situacao === 'erro' || estado.situacao === 'naoEncontrado') return <div className="wrap home-secao"><Erro aoTentar={estado.recarregar} /></div>;
  const principais = estado.dados.filter((c) => c.paiId === null);
  if (principais.length === 0) return null;
  return (
    <section className="wrap home-secao" aria-labelledby="home-categorias">
      <h2 className="h3" id="home-categorias">
        Categorias
      </h2>
      <ul className="home-categorias">
        {principais.map((c) => (
          <li key={c.id}>
            <Link to={`/produtos?categoria=${encodeURIComponent(c.slug)}`} className="home-categoria card">
              {c.nome}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Home() {
  return (
    <>
      <section className="wrap home-banner">
        <span className="eyebrow">Coleção nova</span>
        <h1 className="h1 home-titulo">Objetos que ocupam espaço.</h1>
        <p className="muted home-subtitulo">Esferas, anéis, cápsulas e blocos em chrome, lima e argila.</p>
        <Link to="/produtos" className="btn btn-pri">
          Ver produtos
        </Link>
      </section>
      <Categorias />
      {/* Provisório: o catálogo ainda não expõe data de cadastro nem vendas. "Novidades" usa a ordem
          alfabética e "Mais vendidos" o menor preço até existirem pedidos (Fase 3) e ordem por recência. */}
      <SecaoProdutos titulo="Novidades" ordem="nome" selo="novo" />
      <SecaoProdutos titulo="Mais vendidos" ordem="menor-preco" />
    </>
  );
}
