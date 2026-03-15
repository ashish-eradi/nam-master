
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import PrivateRoute from '../PrivateRoute';

const mockStore = configureStore([]);

describe('PrivateRoute', () => {
  it('should render the child component if the user is authenticated', () => {
    const store = mockStore({
      auth: {
        token: 'test-token',
      },
    });

    const { getByText } = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/private']}>
          <Routes>
            <Route path="/private" element={<PrivateRoute />}>
              <Route index element={<div>Private Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(getByText('Private Content')).toBeInTheDocument();
  });

  it('should redirect to the login page if the user is not authenticated', () => {
    const store = mockStore({
      auth: {
        token: null,
      },
    });

    const { container } = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/private']}>
          <Routes>
            <Route path="/private" element={<PrivateRoute />} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(container.innerHTML).toContain('Login Page');
  });
});
