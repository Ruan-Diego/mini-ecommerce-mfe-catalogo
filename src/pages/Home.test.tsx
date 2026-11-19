import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';

const produto = (n: number) => ({
  id: `id-${n}`, sku: `SKU-${n}`, nome: `Esfera ${n}`, slug: `esfera-${n}`, descricao: '', preco: 100 + n,
  imagens: [], categoriaId: 'c1', ativo: true,
});
const pagina = (itens: unknown[]) => ({ itens, pagina: 0, tamanho: 8, total: itens.length, totalPaginas: 1 });
const categorias = [
  { id: 'c1', nome: 'Esferas', slug: 'esferas', paiId: null },
  { id: 'c2', nome: 'Mini', slug: 'mini', paiId: 'c1' },
];

function responder(rotas: Record<string, () => Response | Promise<Response>>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const caminho = Object.keys(rotas).find((r) => url.includes(r));
    if (!caminho) throw new Error(`sem rota para ${url}`);
    return rotas[caminho]();
  }));
}
const json = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });

function renderizar() {
  return render(<MemoryRouter><Home /></MemoryRouter>);
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe('Home', () => {
  it('mostra banner, categorias principais e os dois carrosséis', async () => {
    responder({ '/categorias': () => json(categorias), '/produtos': () => json(pagina([produto(1), produto(2)])) });
    renderizar();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const cats = await screen.findByRole('region', { name: 'Categorias' });
    expect(within(cats).getByRole('link', { name: 'Esferas' })).toHaveAttribute('href', '/produtos?categoria=esferas');
    expect(within(cats).queryByText('Mini')).not.toBeInTheDocument();
    const novidades = await screen.findByRole('region', { name: 'Novidades' });
    expect(within(novidades).getAllByRole('article')).toHaveLength(2);
    expect(within(novidades).getAllByText('Novo')).toHaveLength(2);
    const vendidos = await screen.findByRole('region', { name: 'Mais vendidos' });
    expect(within(vendidos).queryByText('Novo')).not.toBeInTheDocument();
    expect(within(novidades).getAllByRole('link', { name: /Esfera 1/ })[0]).toHaveAttribute('href', '/produtos/esfera-1');
  });

  it('mostra carregamento enquanto a API não responde', () => {
    responder({ '/categorias': () => new Promise<Response>(() => {}), '/produtos': () => new Promise<Response>(() => {}) });
    renderizar();
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
  });

  it('mostra estado vazio sem produtos', async () => {
    responder({ '/categorias': () => json([]), '/produtos': () => json(pagina([])) });
    renderizar();
    expect(await screen.findByText('Novidades: ainda não há produtos cadastrados.')).toBeInTheDocument();
  });

  it('mostra erro e "Tentar de novo" refaz a chamada', async () => {
    let ok = false;
    responder({
      '/categorias': () => json(categorias),
      '/produtos': () => (ok ? json(pagina([produto(1)])) : new Response('x', { status: 500 })),
    });
    renderizar();
    const alertas = await screen.findAllByRole('alert');
    expect(alertas).toHaveLength(2);
    ok = true;
    await userEvent.click(within(alertas[0]).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('region', { name: 'Novidades' })).toBeInTheDocument();
  });

  it('chama o gateway com o tamanho e a ordem pedidos', async () => {
    responder({ '/categorias': () => json([]), '/produtos': () => json(pagina([])) });
    renderizar();
    await screen.findByText('Novidades: ainda não há produtos cadastrados.');
    const urls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/produtos?ordem=nome&tamanho=8'))).toBe(true);
    expect(urls.some((u) => u.includes('/produtos?ordem=menor-preco&tamanho=8'))).toBe(true);
  });
});
