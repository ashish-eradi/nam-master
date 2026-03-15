import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Users from './Users';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation } from '../services/usersApi';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';

jest.mock('../services/usersApi');

const mockStore = configureStore([]);

test('creates a new user', async () => {
  const store = mockStore({});
  const mockCreateUser = jest.fn();
  (useGetUsersQuery as any).mockReturnValue({ data: [], isLoading: false });
  (useCreateUserMutation as any).mockReturnValue([mockCreateUser]);
  (useUpdateUserMutation as any).mockReturnValue([jest.fn()]);
  (useDeleteUserMutation as any).mockReturnValue([jest.fn()]);

  render(
    <Provider store={store}>
      <Users />
    </Provider>
  );

  await userEvent.click(screen.getByText('Create User'));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toBeInTheDocument();

  await userEvent.type(screen.getByRole('textbox', { name: 'Username' }), 'testuser');
  await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'test@example.com');
  await userEvent.type(screen.getByRole('textbox', { name: 'Role' }), 'ADMIN');
  await userEvent.type(screen.getByRole('textbox', { name: 'School ID' }), '123');

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(mockCreateUser).toHaveBeenCalledWith({
    username: 'testuser',
    email: 'test@example.com',
    role: 'ADMIN',
    school_id: '123',
  });
});
