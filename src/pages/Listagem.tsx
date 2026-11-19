import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Chip, Input } from '@ruan-diego/mini-design-system';
import { buscarProdutos, listarCategorias } from '../api/catalogo';
import { useRecurso } from '../api/useRecurso';
import { ProdutoCard } from '../components/ProdutoCard';
import { lerFiltros, ordens, paraApi, paraParams, type FiltrosUrl } from './filtros';
import './listagem.css';

function Painel({ filtros, aplicar }: { filtros: FiltrosUrl; aplicar: (novos: Partial<FiltrosUrl>) => void }) {
  const categorias = useRecurso((s) => listarCategorias(s));
  // Os campos de preço só aplicam no submit: cada tecla não pode virar uma entrada no histórico.
  const [min, setMin] = useState(filtros.precoMin);
  const [max, setMax] = useState(filtros.precoMax);

  function enviarPreco(e: FormEvent) {
    e.preventDefault();
    aplicar({ precoMin: min, precoMax: max });
  }

  return (
    <div className="lista-painel-conteudo">
      <fieldset className="lista-grupo">
        <legend className="eyebrow">Categoria</legend>
        <div className="lista-chips">
          <Chip ativo={filtros.categoria === ''} onClick={() => aplicar({ categoria: '' })}>
            Todas
          </Chip>
          {categorias.situacao === 'pronto' &&
            categorias.dados.map((c) => (
              <Chip key={c.id} ativo={filtros.categoria === c.slug} onClick={() => aplicar({ categoria: c.slug })}>
                {c.nome}
              </Chip>
            ))}
        </div>
        {categorias.situacao === 'erro' && <p className="muted">Não consegui carregar as categorias.</p>}
      </fieldset>
      <form className="lista-grupo" onSubmit={enviarPreco} aria-label="Faixa de preço">
        <span className="eyebrow">Preço (R$)</span>
        <div className="lista-preco">
          <Input label="Mínimo" type="number" min="0" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
          <Input label="Máximo" type="number" min="0" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        <Button type="submit" variante="secundario" pequeno>
          Aplicar preço
        </Button>
      </form>
      <label className="lista-check">
        <input type="checkbox" checked={filtros.disponivel} onChange={(e) => aplicar({ disponivel: e.target.checked })} />
        Só disponíveis
      </label>
    </div>
  );
}

export function Listagem() {
  const [params, setParams] = useSearchParams();
  const [painelAberto, setPainelAberto] = useState(false);
  const filtros = lerFiltros(params);
  const chave = params.toString();
  const resultado = useRecurso((s) => buscarProdutos(paraApi(lerFiltros(new URLSearchParams(chave))), s), [chave]);

  // setSearchParams empilha no histórico: é isso que faz o "voltar" do navegador desfazer um filtro.
  // Mudar qualquer filtro (menos a própria página) volta para a página 1.
  function aplicar(novos: Partial<FiltrosUrl>) {
    const pagina = novos.pagina ?? 1;
    setParams(paraParams({ ...filtros, ...novos, pagina }));
  }

  const dados = resultado.situacao === 'pronto' ? resultado.dados : null;

  return (
    <section className="wrap lista" aria-labelledby="lista-titulo">
      <header className="lista-topo">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="h2" id="lista-titulo">
            {filtros.busca ? `Resultados para “${filtros.busca}”` : 'Todos os produtos'}
          </h1>
          <p className="muted" aria-live="polite">
            {dados ? `${dados.total} ${dados.total === 1 ? 'produto' : 'produtos'}` : ' '}
          </p>
        </div>
        <div className="lista-controles">
          <Button
            variante="secundario"
            pequeno
            className="lista-abrir-filtros"
            aria-expanded={painelAberto}
            aria-controls="lista-painel"
            onClick={() => setPainelAberto((a) => !a)}
          >
            Filtros
          </Button>
          <div className="field">
            <label htmlFor="ordem">Ordenar por</label>
            <select id="ordem" className="input" value={filtros.ordem} onChange={(e) => aplicar({ ordem: e.target.value as FiltrosUrl['ordem'] })}>
              {ordens.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="lista-corpo">
        {/* Desktop: coluna lateral. Mobile: painel inferior que abre pelo botão "Filtros". */}
        <aside id="lista-painel" className={`lista-painel${painelAberto ? ' aberto' : ''}`} aria-label="Filtros">
          <Painel key={`${filtros.precoMin}|${filtros.precoMax}`} filtros={filtros} aplicar={aplicar} />
          <Button className="lista-fechar-filtros" onClick={() => setPainelAberto(false)}>
            Ver resultados
          </Button>
        </aside>

        <div>
          {resultado.situacao === 'carregando' && (
            <ul className="lista-grade" aria-busy="true" aria-label="Carregando">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="lista-skeleton" />
              ))}
            </ul>
          )}
          {resultado.situacao === 'erro' && (
            <div className="lista-aviso" role="alert">
              <p>Não consegui carregar os produtos.</p>
              <Button variante="secundario" pequeno onClick={resultado.recarregar}>
                Tentar de novo
              </Button>
            </div>
          )}
          {dados && dados.itens.length === 0 && (
            <div className="lista-aviso">
              <p>Nenhum produto encontrado com esses filtros.</p>
              <Button variante="secundario" pequeno onClick={() => setParams(new URLSearchParams())}>
                Limpar filtros
              </Button>
            </div>
          )}
          {dados && dados.itens.length > 0 && (
            <>
              <ul className="lista-grade">
                {dados.itens.map((p) => (
                  <li key={p.id}>
                    <ProdutoCard produto={p} />
                  </li>
                ))}
              </ul>
              {dados.totalPaginas > 1 && (
                <nav className="lista-paginas" aria-label="Paginação">
                  <Button variante="secundario" pequeno disabled={filtros.pagina <= 1} onClick={() => aplicar({ pagina: filtros.pagina - 1 })}>
                    Anterior
                  </Button>
                  <span>
                    Página {filtros.pagina} de {dados.totalPaginas}
                  </span>
                  <Button variante="secundario" pequeno disabled={filtros.pagina >= dados.totalPaginas} onClick={() => aplicar({ pagina: filtros.pagina + 1 })}>
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
