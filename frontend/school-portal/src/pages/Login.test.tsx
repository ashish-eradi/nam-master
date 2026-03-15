import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import LoginPage from './Login';

const mockStore = configureStore([]);

test('renders login page', () => {
  const store = mockStore({});
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>
  );
  const loginElement = screen.getByText(/School Portal Login/i);
  expect(loginElement).toBeInTheDocument();
});
