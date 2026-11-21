// @vitest-environment node
/**
 * Contrato (Pact) do mfe-catalogo com o estoque-service: a vitrine lê a disponibilidade do produto (leitura pública).
 * O teste roda o cliente real (src/api/estoque.ts) contra o mock do Pact e grava pacts/mfe-catalogo-estoque-service.json.
 * `pnpm pact:copiar` leva o arquivo ao backend, onde o estoque-service prova que o cumpre (ADR-0005).
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { ErroDeApi } from './catalogo';
import { consultarDisponibilidade } from './estoque';

const { regex, uuid, integer, boolean } = MatchersV3;

// O Pact mescla com o arquivo que já existe: apagar antes garante que interação removida daqui some do contrato.
const pastaDosPacts = path.resolve(process.cwd(), 'pacts');
rmSync(path.join(pastaDosPacts, 'mfe-catalogo-estoque-service.json'), { force: true });

const provider = new PactV3({ consumer: 'mfe-catalogo', provider: 'estoque-service', dir: pastaDosPacts, logLevel: 'warn' });

const JSON_UTF8 = regex(/application\/json.*/.source, 'application/json');
const PRODUTO = '11111111-1111-4111-8111-111111111111';
const SEM_ESTOQUE = '55555555-5555-4555-8555-555555555555';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('contrato mfe-catalogo → estoque-service', () => {
  it('lê a disponibilidade de um produto com saldo', async () => {
    provider
      .given('o produto 11111111-1111-4111-8111-111111111111 tem 3 unidades disponíveis no estoque')
      .uponReceiving('a disponibilidade de um produto com saldo')
      .withRequest({ method: 'GET', path: `/estoque/${PRODUTO}`, headers: { Accept: 'application/json' } })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': JSON_UTF8 },
        body: { produtoId: uuid(PRODUTO), disponivel: integer(3), reservado: integer(0), emEstoque: boolean(true), estoqueBaixo: boolean(true) },
      });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_ESTOQUE_API_URL', mock.url);
      const disponibilidade = await consultarDisponibilidade(PRODUTO);
      expect(disponibilidade).toMatchObject({ produtoId: PRODUTO, disponivel: 3, emEstoque: true, estoqueBaixo: true });
    });
  });

  it('produto sem saldo cadastrado é 404 (a vitrine mostra esgotado)', async () => {
    provider
      .given('o produto 55555555-5555-4555-8555-555555555555 não tem estoque cadastrado')
      .uponReceiving('a disponibilidade de um produto sem estoque cadastrado')
      .withRequest({ method: 'GET', path: `/estoque/${SEM_ESTOQUE}`, headers: { Accept: 'application/json' } })
      .willRespondWith({ status: 404 });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_ESTOQUE_API_URL', mock.url);
      await expect(consultarDisponibilidade(SEM_ESTOQUE)).rejects.toMatchObject({ status: 404 } satisfies Partial<ErroDeApi>);
    });
  });
});
