// @vitest-environment node
/**
 * Contrato (Pact) do mfe-catalogo com o catalogo-service: uma interação para cada chamada HTTP do MFE.
 * O teste roda o cliente real (src/api/catalogo.ts) contra o mock do Pact e grava pacts/mfe-catalogo-catalogo-service.json.
 * `pnpm pact:copiar` leva o arquivo ao backend, onde o catalogo-service prova que cumpre o contrato (ADR-0005).
 *
 * Os matchers descrevem o formato (tipo, padrão), não o valor exato: o provider pode devolver outros produtos,
 * desde que no mesmo formato. Só os campos que o MFE usa entram no contrato.
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { buscarProdutos, ErroDeApi, listarCategorias, obterProduto } from './catalogo';

const { like, eachLike, regex, decimal, uuid, string, integer, boolean } = MatchersV3;

// O Pact mescla com o arquivo que já existe: apagar antes garante que interação removida daqui some do contrato.
const pastaDosPacts = path.resolve(process.cwd(), 'pacts');
rmSync(path.join(pastaDosPacts, 'mfe-catalogo-catalogo-service.json'), { force: true });

const provider = new PactV3({
  consumer: 'mfe-catalogo',
  provider: 'catalogo-service',
  dir: pastaDosPacts,
  logLevel: 'warn',
});

const JSON_UTF8 = regex(/application\/json.*/.source, 'application/json');

const produto = {
  id: uuid('6f1c2a7e-3b4d-4c5e-8f90-1a2b3c4d5e6f'),
  sku: string('ESF-CHROME-01'),
  nome: string('Esfera Chrome'),
  slug: string('esfera-chrome'),
  descricao: string('Esfera de aço polido.'),
  preco: decimal(289.0),
  imagens: eachLike({ url: string('https://cdn.mini.dev/esfera.webp'), textoAlternativo: string('Esfera cromada') }),
  categoriaId: uuid('0b1c2d3e-4f50-4617-8899-aabbccddeeff'),
  ativo: boolean(true),
};

/** O mock do Pact sobe numa porta aleatória; o cliente lê a URL de VITE_API_URL. */
function apontarPara(url: string) {
  vi.stubEnv('VITE_API_URL', url);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('contrato mfe-catalogo → catalogo-service', () => {
  it('busca produtos com filtro, ordem e página', async () => {
    provider
      .given('existem produtos ativos na categoria esferas')
      .uponReceiving('uma busca de produtos da categoria esferas por menor preço')
      .withRequest({
        method: 'GET',
        path: '/produtos',
        query: { categoria: 'esferas', ordem: 'menor-preco', pagina: '0', tamanho: '24' },
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': JSON_UTF8 },
        body: {
          itens: eachLike(produto),
          pagina: integer(0),
          tamanho: integer(24),
          total: integer(1),
          totalPaginas: integer(1),
        },
      });

    await provider.executeTest(async (mock) => {
      apontarPara(mock.url);
      const pagina = await buscarProdutos({ categoria: 'esferas', ordem: 'menor-preco', pagina: 0, tamanho: 24 });
      expect(pagina.itens[0].slug).toBe('esfera-chrome');
      expect(pagina.itens[0].preco).toBe(289);
      expect(pagina.totalPaginas).toBe(1);
    });
  });

  it('obtém o produto pelo slug', async () => {
    provider
      .given('existe o produto ativo esfera-chrome')
      .uponReceiving('o detalhe do produto esfera-chrome')
      .withRequest({ method: 'GET', path: '/produtos/esfera-chrome', headers: { Accept: 'application/json' } })
      .willRespondWith({ status: 200, headers: { 'Content-Type': JSON_UTF8 }, body: like(produto) });

    await provider.executeTest(async (mock) => {
      apontarPara(mock.url);
      const encontrado = await obterProduto('esfera-chrome');
      expect(encontrado.nome).toBe('Esfera Chrome');
      expect(encontrado.imagens[0].textoAlternativo).toBe('Esfera cromada');
    });
  });

  it('produto que não existe é 404 (a tela mostra "não encontrado")', async () => {
    provider
      .given('não existe produto com o slug nao-existe')
      .uponReceiving('o detalhe de um produto que não existe')
      .withRequest({ method: 'GET', path: '/produtos/nao-existe', headers: { Accept: 'application/json' } })
      .willRespondWith({ status: 404 });

    await provider.executeTest(async (mock) => {
      apontarPara(mock.url);
      await expect(obterProduto('nao-existe')).rejects.toMatchObject({ status: 404 } satisfies Partial<ErroDeApi>);
    });
  });

  it('lista as categorias', async () => {
    provider
      .given('existe a categoria esferas')
      .uponReceiving('a lista de categorias')
      .withRequest({ method: 'GET', path: '/categorias', headers: { Accept: 'application/json' } })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': JSON_UTF8 },
        body: eachLike({
          id: uuid('0b1c2d3e-4f50-4617-8899-aabbccddeeff'),
          nome: string('Esferas'),
          slug: string('esferas'),
          // paiId pode ser nulo (categoria raiz): o contrato não fixa o valor.
        }),
      });

    await provider.executeTest(async (mock) => {
      apontarPara(mock.url);
      const categorias = await listarCategorias();
      expect(categorias[0].slug).toBe('esferas');
    });
  });
});
