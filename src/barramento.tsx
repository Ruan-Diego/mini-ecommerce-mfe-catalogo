import { createContext, useContext, type ReactNode } from 'react';
import { criarEventBus, type EventBus } from '@ruan-diego/mini-event-contracts';

/**
 * O event bus que o shell entrega em `props.eventBus`, disponível para qualquer tela sem repassar por props.
 * Sem provedor (um teste de componente solto, por exemplo) cai no bus sobre `window`, que é o mesmo do shell.
 * O catálogo só emite eventos tipados: nunca importa código de outro microfrontend.
 */
const Contexto = createContext<EventBus>(criarEventBus());

export function ProvedorBarramento({ eventBus, children }: { eventBus: EventBus; children: ReactNode }) {
  return <Contexto.Provider value={eventBus}>{children}</Contexto.Provider>;
}

/**
 * Devolve a função que põe um produto no carrinho. O catálogo não sabe se existe carrinho, nem como ele
 * reage (o mini-carrinho abre sozinho ao ouvir o evento): só diz "quero este produto, nesta quantidade".
 * O id é o do produto no catálogo (UUID), a mesma chave que o carrinho guarda; nome e preço o carrinho
 * busca no catálogo, então nada disso vai no evento.
 */
export function useAdicionarAoCarrinho() {
  const eventBus = useContext(Contexto);
  return (produtoId: string, quantidade = 1) => eventBus.emit('carrinho:adicionar-item', { produtoId, quantidade });
}
