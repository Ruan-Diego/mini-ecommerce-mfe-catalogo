import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { criarEventBus } from './contracts';

describe('mfe-catalogo', () => {
  it('renderiza a primeira tela a partir do basePath', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App basePath="/" getToken={async () => null} eventBus={criarEventBus(new EventTarget())} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
  });
});
