import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Compra, Produto } from './Produto';
import { estimarFrete, validarCep } from '../components/frete';

const base = {
  id: 'id-1', sku: 'ESF-001', nome: 'Esfera Chrome', slug: 'esfera-chrome', descricao: 'Uma esfera.', preco: 249.9,
  imagens: [
    { url: '/a.png', textoAlternativo: 'Frente' },
    { url: '/b.png', textoAlternativo: 'Lado' },
  ],
  categoriaId: 'c1', ativo: true,
};

const EM_ESTOQUE = { produtoId: 'id-1', disponivel: 50, reservado: 0, emEstoque: true, estoqueBaixo: false };

/** Resposta do estoque-service no teste: um status com corpo, ou 'rede' (o serviço não responde). */
type RespostaEstoque = { status: number; corpo?: unknown } | 'rede';

/** Gateway falso: o catálogo responde `status`/`corpo`; o estoque-service (URL com /estoque/) responde `estoque`. */
function api(status: number, corpo: unknown = base, estoque: RespostaEstoque = { status: 200, corpo: EM_ESTOQUE }) {
  const chamadas: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      chamadas.push(url);
      if (url.includes('/estoque/')) {
        if (estoque === 'rede') throw new TypeError('rede fora do ar');
        return new Response(JSON.stringify(estoque.corpo ?? {}), { status: estoque.status });
      }
      return new Response(JSON.stringify(corpo), { status });
    }),
  );
  return chamadas;
}
function renderizar(slug = 'esfera-chrome') {
  return render(
    <MemoryRouter initialEntries={[`/produtos/${slug}`]}>
      <Routes>
        <Route path="/produtos/:slug" element={<Produto />} />
        <Route path="/produtos" element={<p>vitrine</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe('validação de CEP', () => {
  it.each(['', '123', '1234567a', '00000000', '123456789'])('rejeita %j', (cep) => {
    expect(validarCep(cep).valido).toBe(false);
  });
  it('aceita com ou sem hífen', () => {
    expect(validarCep('01310-100')).toEqual({ valido: true, cep: '01310100' });
    expect(validarCep('01310100').valido).toBe(true);
  });
  it('estima duas opções', () => {
    expect(estimarFrete('01310100')).toHaveLength(2);
  });
});

describe('Produto', () => {
  it('mostra nome, preço, disponibilidade e galeria que troca a imagem', async () => {
    api(200);
    renderizar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Esfera Chrome' })).toBeInTheDocument();
    expect(screen.getAllByText('R$ 249,90')[0]).toBeInTheDocument();
    expect(await screen.findByText('Em estoque')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Frente' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ver imagem 2/ }));
    expect(screen.getByRole('img', { name: 'Lado' })).toBeInTheDocument();
  });

  it('pergunta o saldo ao estoque-service pelo id do produto', async () => {
    const chamadas = api(200);
    renderizar();
    await screen.findByRole('heading', { level: 1, name: 'Esfera Chrome' });
    await screen.findByText('Em estoque');
    expect(chamadas.some((u) => u.endsWith('/estoque/id-1'))).toBe(true);
  });

  it('sem saldo cadastrado (404 do estoque) mostra Esgotado e desabilita a compra', async () => {
    api(200, base, { status: 404, corpo: { title: 'Não encontrado' } });
    renderizar();
    expect(await screen.findByText('Esgotado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Produto esgotado' })).toBeDisabled();
  });

  it('saldo zerado mostra Esgotado', async () => {
    api(200, base, { status: 200, corpo: { ...EM_ESTOQUE, disponivel: 0, emEstoque: false, estoqueBaixo: true } });
    renderizar();
    expect(await screen.findByText('Esgotado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Produto esgotado' })).toBeDisabled();
  });

  it('estoque baixo avisa "Últimas N unidades" e limita a quantidade ao saldo', async () => {
    api(200, base, { status: 200, corpo: { ...EM_ESTOQUE, disponivel: 3, estoqueBaixo: true } });
    renderizar();
    expect(await screen.findByText('Últimas 3 unidades')).toBeInTheDocument();

    const mais = screen.getByRole('button', { name: /aumentar|mais|\+/i });
    for (let i = 0; i < 6; i++) if (!(mais as HTMLButtonElement).disabled) await userEvent.click(mais);
    expect(screen.getByRole('group', { name: 'Quantidade de Esfera Chrome' })).toHaveTextContent('3');
    expect(mais).toBeDisabled();
  });

  it('com uma unidade só avisa "Última unidade"', async () => {
    api(200, base, { status: 200, corpo: { ...EM_ESTOQUE, disponivel: 1, estoqueBaixo: true } });
    renderizar();
    expect(await screen.findByText('Última unidade')).toBeInTheDocument();
  });

  it('estoque-service fora do ar não trava a compra (a reserva do pedido decide)', async () => {
    api(200, base, 'rede');
    renderizar();
    expect(await screen.findByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled();
    expect(screen.getByText('Em estoque')).toBeInTheDocument();
  });

  it('enquanto o estoque não responde, o botão espera', async () => {
    let liberar: (r: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('/estoque/')
          ? new Promise<Response>((resolve) => (liberar = resolve))
          : Promise.resolve(new Response(JSON.stringify(base), { status: 200 })),
      ),
    );
    renderizar();

    expect(await screen.findByRole('button', { name: 'Verificando estoque…' })).toBeDisabled();
    liberar(new Response(JSON.stringify(EM_ESTOQUE), { status: 200 }));
    expect(await screen.findByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled();
  });

  it('produto inexistente mostra 404 com link para a vitrine', async () => {
    api(404, { title: 'Não encontrado' });
    renderizar('nao-existe');
    expect(await screen.findByRole('heading', { level: 1, name: 'Produto não encontrado' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Voltar para a vitrine' }));
    expect(screen.getByText('vitrine')).toBeInTheDocument();
  });

  it('erro do servidor mostra alerta com "Tentar de novo"', async () => {
    api(500, {});
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não consegui carregar o produto.');
  });

  it('CEP inválido mostra erro no campo e CEP válido mostra as opções', async () => {
    api(200);
    renderizar();
    const campo = await screen.findByLabelText('CEP de entrega');
    await userEvent.type(campo, '123');
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(campo).toBeInvalid();
    expect(screen.getByText(/CEP inválido/)).toBeInTheDocument();
    await userEvent.clear(campo);
    await userEvent.type(campo, '01310-100');
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(screen.getByText('Econômico')).toBeInTheDocument();
    expect(screen.getByText('Expresso')).toBeInTheDocument();
    expect(campo).toBeValid();
  });
});

describe('Compra', () => {
  it('esgotado desabilita o botão', () => {
    render(<Compra produto={base} disponivel={false} />);
    expect(screen.getByRole('button', { name: 'Produto esgotado' })).toBeDisabled();
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('quantidade vai de 1 a 10', async () => {
    render(<Compra produto={base} disponivel />);
    const menos = screen.getByRole('button', { name: /diminuir|menos|−/i });
    const mais = screen.getByRole('button', { name: /aumentar|mais|\+/i });
    expect(menos).toBeDisabled();
    for (let i = 0; i < 12; i++) if (!(mais as HTMLButtonElement).disabled) await userEvent.click(mais);
    expect(mais).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Quantidade de Esfera Chrome' })).toHaveTextContent('10');
    expect(screen.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled();
  });
});
