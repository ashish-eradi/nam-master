
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import * as authApi from '../../services/authApi';
import authSlice from '../../store/authSlice';
import LoginPage from '../Login';

const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

test('renders login page', () => {
  const store = configureStore({ reducer: { auth: authSlice, [api.reducerPath]: api.reducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>
  );
  const loginElement = screen.getByText(/Family Portal Login/i);
  expect(loginElement).toBeInTheDocument();
});

test('logs in a user and redirects to the dashboard', async () => {
  const store = configureStore({
    reducer: {
      auth: authSlice,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });

  const loginMutation = jest.spyOn(authApi, 'useLoginMutation');
  loginMutation.mockReturnValue([
    jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({ access_token: 'test-token' }) }),
    { isLoading: false, reset: jest.fn() },
  ]);

  render(
    <Provider store={store}>
        <LoginPage />
    </Provider>
  );

  await userEvent.type(screen.getByPlaceholderText(/Email/i), 'testuser');
  await userEvent.type(screen.getByPlaceholderText(/Password/i), 'password');

  await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

  await waitFor(() => {
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
