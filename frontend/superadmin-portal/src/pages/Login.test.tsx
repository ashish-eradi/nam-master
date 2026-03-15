import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './Login';
import * as authApi from '../services/authApi';
import authSlice from '../store/authSlice';

const store = configureStore({
  reducer: {
    [authApi.authApi.reducerPath]: authApi.authApi.reducer,
    auth: authSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.authApi.middleware),
});

describe('LoginPage', () => {
  it('renders the login form', () => {
    jest.spyOn(authApi, 'useLoginMutation').mockReturnValue([jest.fn(), { isLoading: false }] as any);
    render(
      <Provider store={store}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('disables the button when loading', () => {
    jest.spyOn(authApi, 'useLoginMutation').mockReturnValue([jest.fn(), { isLoading: true }] as any);
    render(
      <Provider store={store}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
