import { Route, Routes } from 'react-router-dom';
import type { PropsRemoto } from '@ruan-diego/mini-event-contracts';
import { Home } from './pages/Home';
import { Listagem } from './pages/Listagem';
import { Produto } from './pages/Produto';

/**
 * Módulo exposto como ./App. O shell monta este componente numa rota com "/*",
 * então as rotas abaixo são relativas a props.basePath.
 */
export default function App(_props: PropsRemoto) {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="produtos" element={<Listagem />} />
      <Route path="produtos/:slug" element={<Produto />} />
      <Route path="*" element={<p className="wrap muted">Página não encontrada neste microfrontend.</p>} />
    </Routes>
  );
}
