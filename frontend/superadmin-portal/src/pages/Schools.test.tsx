import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Schools from './Schools';
import { useGetSchoolsQuery, useCreateSchoolMutation, useUpdateSchoolMutation, useDeleteSchoolMutation } from '../services/schoolsApi';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';

jest.mock('../services/schoolsApi');

const mockStore = configureStore([]);

test('creates a new school', async () => {
  const store = mockStore({});
  const mockCreateSchool = jest.fn();
  (useGetSchoolsQuery as any).mockReturnValue({ data: [], isLoading: false });
  (useCreateSchoolMutation as any).mockReturnValue([mockCreateSchool]);
  (useUpdateSchoolMutation as any).mockReturnValue([jest.fn()]);
  (useDeleteSchoolMutation as any).mockReturnValue([jest.fn()]);

  render(
    <Provider store={store}>
      <Schools />
    </Provider>
  );

  await userEvent.click(screen.getByText('Create School'));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toBeInTheDocument();

  await userEvent.type(screen.getByRole('textbox', { name: 'School Name' }), 'Test School');
  await userEvent.type(screen.getByRole('textbox', { name: 'School Code' }), 'TS');

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(mockCreateSchool).toHaveBeenCalledWith({
    name: 'Test School',
    code: 'TS',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_phone: '',
    contact_email: '',
  });
});
