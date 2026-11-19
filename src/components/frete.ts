/** Normaliza para só dígitos e valida: o CEP tem 8 dígitos (aceita "01310-100" ou "01310100"). */
export function validarCep(texto: string): { valido: true; cep: string } | { valido: false; erro: string } {
  const cep = texto.replace(/\D/g, '');
  if (cep.length === 0) return { valido: false, erro: 'Informe o CEP.' };
  if (cep.length !== 8 || /^(\d)\1{7}$/.test(cep)) return { valido: false, erro: 'CEP inválido. Use 8 dígitos, como 01310-100.' };
  return { valido: true, cep };
}

export interface OpcaoFrete {
  nome: string;
  prazoDias: number;
  valor: number;
}

/**
 * Estimativa local e determinística pelo 1º dígito do CEP (região postal). É só uma prévia na
 * página do produto: o frete de verdade é calculado no checkout pelo pedido-service.
 */
export function estimarFrete(cep: string): OpcaoFrete[] {
  const regiao = Number(cep[0]);
  const distancia = Math.abs(regiao - 0); // 0 = Grande SP, que é a origem fictícia da loja
  return [
    { nome: 'Econômico', prazoDias: 4 + distancia, valor: 14.9 + distancia * 3 },
    { nome: 'Expresso', prazoDias: 1 + Math.ceil(distancia / 2), valor: 29.9 + distancia * 5 },
  ];
}
