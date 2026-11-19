import { useState, type FormEvent } from 'react';
import { Button, Input } from '@ruan-diego/mini-design-system';
import { estimarFrete, validarCep, type OpcaoFrete } from './frete';
import { formatarPreco } from './ProdutoCard';

export function SimuladorFrete() {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string>();
  const [opcoes, setOpcoes] = useState<OpcaoFrete[]>([]);

  function calcular(e: FormEvent) {
    e.preventDefault();
    const r = validarCep(texto);
    if (!r.valido) {
      setErro(r.erro);
      setOpcoes([]);
      return;
    }
    setErro(undefined);
    setOpcoes(estimarFrete(r.cep));
  }

  return (
    <form className="frete" onSubmit={calcular} aria-label="Simulador de frete" noValidate>
      <div className="frete-linha">
        <Input label="CEP de entrega" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={texto} onChange={(e) => setTexto(e.target.value)} erro={erro} />
        <Button type="submit" variante="secundario">
          Calcular
        </Button>
      </div>
      {opcoes.length > 0 && (
        <ul className="frete-opcoes" aria-live="polite">
          {opcoes.map((o) => (
            <li key={o.nome}>
              <strong>{o.nome}</strong> · {o.prazoDias} {o.prazoDias === 1 ? 'dia útil' : 'dias úteis'} · <span className="price">{formatarPreco(o.valor)}</span>
            </li>
          ))}
          <li className="muted">Estimativa. O valor final é calculado no checkout.</li>
        </ul>
      )}
    </form>
  );
}
