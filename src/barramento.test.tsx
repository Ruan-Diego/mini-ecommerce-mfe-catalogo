import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { criarEventBus, type EventosMini } from '@ruan-diego/mini-event-contracts';
import App from './App';
import { ProvedorBarramento } from './barramento';
import { ProdutoCard } from './components/ProdutoCard';
import { Compra } from './pages/Produto';
import type { Produto } from './api/catalogo';

const produto: Produto = {
  id: '3f2b8c1e-0000-4000-8000-000000000001', sku: 'ESF-001', nome: 'Esfera Chrome', slug: 'esfera-chrome',
  descricao: 'Uma esfera.', preco: 249.9, imagens: [], categoriaId: 'c1', ativo: true,
};

type Adicionar = EventosMini['carrinho:adicionar-item'];

/** Bus de verdade (o helper `emit` do event-contracts) sobre um alvo próprio, com o que foi emitido anotado. */
function barramento() {
  const eventBus = criarEventBus(new EventTarget());
  const emitidos: Adicionar[] = [];
  eventBus.on('carrinho:adicionar-item', (p) => emitidos.push(p));
  return { eventBus, emitidos };
}

function Local() {
  const l = useLocation();
  return <p data-testid="local">{l.pathname}</p>;
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe('carrinho:adicionar-item no card', () => {
  it('"Adicionar" emite o evento com o id do produto e quantidade 1, sem navegar para o detalhe', async () => {
    const { eventBus, emitidos } = barramento();
    render(
      <MemoryRouter initialEntries={['/produtos']}>
        <ProvedorBarramento eventBus={eventBus}>
          <ProdutoCard produto={produto} />
        </ProvedorBarramento>
        <Local />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Esfera Chrome ao carrinho' }));

    expect(emitidos).toEqual([{ produtoId: produto.id, quantidade: 1 }]);
    expect(screen.getByTestId('local')).toHaveTextContent('/produtos');
  });

  it('cada clique emite um evento', async () => {
    const { eventBus, emitidos } = barramento();
    render(
      <MemoryRouter>
        <ProvedorBarramento eventBus={eventBus}>
          <ProdutoCard produto={produto} />
        </ProvedorBarramento>
      </MemoryRouter>,
    );
    const botao = screen.getByRole('button', { name: /Adicionar Esfera Chrome/ });

    await userEvent.click(botao);
    await userEvent.click(botao);

    expect(emitidos).toHaveLength(2);
  });

  it('card esgotado não emite nada', async () => {
    const { eventBus, emitidos } = barramento();
    render(
      <MemoryRouter>
        <ProvedorBarramento eventBus={eventBus}>
          <ProdutoCard produto={produto} selo="esgotado" />
        </ProvedorBarramento>
      </MemoryRouter>,
    );

    const botao = screen.getByRole('button', { name: 'Esfera Chrome, esgotado' });
    expect(botao).toBeDisabled();
    await userEvent.click(botao);

    expect(emitidos).toEqual([]);
  });

  it('o botão fica fora do link do card (HTML válido e sem navegar junto)', () => {
    render(
      <MemoryRouter>
        <ProdutoCard produto={produto} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link').querySelector('button')).toBeNull();
  });
});

describe('carrinho:adicionar-item no detalhe', () => {
  it('emite com a quantidade escolhida no seletor', async () => {
    const { eventBus, emitidos } = barramento();
    render(
      <ProvedorBarramento eventBus={eventBus}>
        <Compra produto={produto} disponivel />
      </ProvedorBarramento>,
    );

    const mais = screen.getByRole('button', { name: /aumentar|mais|\+/i });
    await userEvent.click(mais);
    await userEvent.click(mais);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));

    expect(emitidos).toEqual([{ produtoId: produto.id, quantidade: 3 }]);
  });

  it('produto esgotado não emite', async () => {
    const { eventBus, emitidos } = barramento();
    render(
      <ProvedorBarramento eventBus={eventBus}>
        <Compra produto={produto} disponivel={false} />
      </ProvedorBarramento>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Produto esgotado' }));

    expect(emitidos).toEqual([]);
  });
});

describe('o ./App usa o eventBus que o shell entrega', () => {
  it('a página de detalhe emite no bus recebido em props', async () => {
    const emEstoque = { produtoId: produto.id, disponivel: 50, reservado: 0, emEstoque: true, estoqueBaixo: false };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/estoque/') ? emEstoque : produto), { status: 200 })),
    );
    const { eventBus, emitidos } = barramento();
    render(
      <MemoryRouter initialEntries={['/produtos/esfera-chrome']}>
        <App basePath="/" getToken={async () => null} eventBus={eventBus} />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar ao carrinho' }));

    expect(emitidos).toEqual([{ produtoId: produto.id, quantidade: 1 }]);
  });
});

describe('isolamento entre microfrontends', () => {
  it('nenhum arquivo do catálogo importa código do carrinho', () => {
    const fontes = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(Object.keys(fontes).length).toBeGreaterThan(5);
    const importaCarrinho = /(?:from|import)\s*\(?\s*['"][^'"]*carrinho[^'"]*['"]/i;
    const infratores = Object.entries(fontes).filter(([, codigo]) => importaCarrinho.test(codigo)).map(([arquivo]) => arquivo);
    expect(infratores).toEqual([]);
  });
});
