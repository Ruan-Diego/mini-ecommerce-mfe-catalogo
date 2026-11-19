import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { Listagem } from './Listagem';
import { lerFiltros, paraParams } from './filtros';

const produto = (n: number) => ({
  id: `id-${n}`, sku: `SKU-${n}`, nome: `Esfera ${n}`, slug: `esfera-${n}`, descricao: '', preco: 100 + n,
  imagens: [], categoriaId: 'c1', ativo: true,
});
const pagina = (itens: unknown[], totalPaginas = 1) => ({ itens, pagina: 0, tamanho: 24, total: itens.length, totalPaginas });
const categorias = [{ id: 'c1', nome: 'Esferas', slug: 'esferas', paiId: null }];
const json = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });

let urlsProdutos: string[] = [];
function api(resposta: () => Response = () => json(pagina([produto(1), produto(2)]))) {
  urlsProdutos = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/categorias')) return json(categorias);
    urlsProdutos.push(url);
    return resposta();
  }));
}

let local = '';
let voltar: () => void = () => {};
function Local() {
  const l = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    voltar = () => void nav(-1);
    local = l.pathname + l.search;
  });
  return null;
}
function renderizar(inicial: string) {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Listagem />
      <Local />
    </MemoryRouter>,
  );
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe('filtros na URL', () => {
  it('valores inválidos viram o padrão', () => {
    const f = lerFiltros(new URLSearchParams('ordem=banana&pagina=-3&precoMin=abc&precoMax=-1'));
    expect(f).toMatchObject({ ordem: 'nome', pagina: 1, precoMin: '', precoMax: '', disponivel: false });
  });
  it('só grava o que difere do padrão', () => {
    expect(paraParams(lerFiltros(new URLSearchParams())).toString()).toBe('');
    const p = paraParams({ ...lerFiltros(new URLSearchParams()), categoria: 'esferas', ordem: 'maior-preco', pagina: 2 });
    expect(p.toString()).toBe('categoria=esferas&ordem=maior-preco&pagina=2');
  });
});

describe('Listagem', () => {
  it('um link com filtros chama a API com os mesmos filtros e página de 24', async () => {
    api();
    renderizar('/produtos?busca=esfera&categoria=esferas&precoMin=10&precoMax=500&ordem=menor-preco&pagina=2&disponivel=true');
    expect(await screen.findAllByRole('article')).toHaveLength(2);
    const url = new URL(urlsProdutos[0], 'http://x');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      busca: 'esfera', categoria: 'esferas', precoMin: '10', precoMax: '500', disponivel: 'true',
      ordem: 'menor-preco', pagina: '1', tamanho: '24',
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Resultados para “esfera”');
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('menor-preco');
  });

  it('mudar filtro grava na URL, volta para a página 1 e o voltar do navegador desfaz', async () => {
    api();
    renderizar('/produtos?pagina=3');
    await screen.findAllByRole('article');
    await userEvent.click(await screen.findByRole('button', { name: 'Esferas' }));
    expect(local).toBe('/produtos?categoria=esferas');
    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'maior-preco');
    expect(local).toBe('/produtos?categoria=esferas&ordem=maior-preco');
    act(() => voltar());
    expect(local).toBe('/produtos?categoria=esferas');
    act(() => voltar());
    expect(local).toBe('/produtos?pagina=3');
  });

  it('preço só aplica ao enviar o formulário', async () => {
    api();
    renderizar('/produtos');
    await screen.findAllByRole('article');
    await userEvent.type(screen.getByLabelText('Mínimo'), '50');
    expect(local).toBe('/produtos');
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar preço' }));
    expect(local).toBe('/produtos?precoMin=50');
  });

  it('pagina de 24 em 24 com Próxima e Anterior', async () => {
    api(() => json(pagina([produto(1)], 3)));
    renderizar('/produtos');
    await screen.findByText('Página 1 de 3');
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(local).toBe('/produtos?pagina=2');
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('sem resultados mostra o aviso e "Limpar filtros" zera a URL', async () => {
    api(() => json(pagina([])));
    renderizar('/produtos?busca=xyz');
    expect(await screen.findByText('Nenhum produto encontrado com esses filtros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(local).toBe('/produtos');
  });

  it('erro da API mostra alerta com "Tentar de novo"', async () => {
    api(() => new Response('x', { status: 500 }));
    renderizar('/produtos');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não consegui carregar os produtos.');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('mostra carregamento enquanto a API não responde', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    renderizar('/produtos');
    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
  });
});
