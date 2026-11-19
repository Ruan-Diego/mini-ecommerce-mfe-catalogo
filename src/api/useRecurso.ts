import { useCallback, useEffect, useState } from 'react';
import { ErroDeApi } from './catalogo';

export type EstadoRecurso<T> =
  | { situacao: 'carregando' }
  | { situacao: 'naoEncontrado'; recarregar: () => void }
  | { situacao: 'erro'; recarregar: () => void }
  | { situacao: 'pronto'; dados: T };

/**
 * Executa uma chamada assíncrona ao montar e expõe os três estados que toda tela precisa tratar.
 * O "vazio" é decidido pela tela, porque só ela sabe o que é vazio para aquele dado.
 */
export function useRecurso<T>(buscar: (sinal: AbortSignal) => Promise<T>, chaves: readonly unknown[] = []): EstadoRecurso<T> {
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<{ chave: string; valor: EstadoRecurso<T> } | null>(null);
  const recarregar = useCallback(() => setTentativa((t) => t + 1), []);
  const chave = JSON.stringify([...chaves, tentativa]);

  useEffect(() => {
    const controle = new AbortController();
    buscar(controle.signal).then(
      (dados) => setEstado({ chave, valor: { situacao: 'pronto', dados } }),
      (erro: unknown) => {
        if (controle.signal.aborted) return;
        if (erro instanceof ErroDeApi && erro.status === 404) {
          setEstado({ chave, valor: { situacao: 'naoEncontrado', recarregar } });
          return;
        }
        console.error('[mfe-catalogo] falha ao buscar dados', erro);
        setEstado({ chave, valor: { situacao: 'erro', recarregar } });
      },
    );
    return () => controle.abort();
    // `buscar` é recriada a cada render; quem decide quando refazer a chamada é `chave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // Enquanto a chave mudou e a resposta nova não chegou, mostra carregando (sem dado velho).
  return estado && estado.chave === chave ? estado.valor : { situacao: 'carregando' };
}
