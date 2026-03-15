import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Hostels from './Hostel';
import { useGetHostelsQuery, useCreateHostelMutation, useUpdateHostelMutation, useDeleteHostelMutation } from '../services/hostelApi';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';

jest.mock('../services/hostelApi');

const mockStore = configureStore([]);

test('creates a new hostel', async () => {
  const store = mockStore({});
  const mockCreateHostel = jest.fn();
  (useGetHostelsQuery as any).mockReturnValue({ data: [], isLoading: false });
  (useCreateHostelMutation as any).mockReturnValue([mockCreateHostel]);
  (useUpdateHostelMutation as any).mockReturnValue([jest.fn()]);
  (useDeleteHostelMutation as any).mockReturnValue([jest.fn()]);

  render(
    <Provider store={store}>
      <Hostels />
    </Provider>
  );

  await userEvent.click(screen.getByText('Create Hostel'));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toBeInTheDocument();

  await userEvent.type(screen.getByRole('textbox', { name: 'Hostel Name' }), 'Test Hostel');
  await userEvent.type(screen.getByRole('textbox', { name: 'School ID' }), '123');
  await userEvent.type(screen.getByRole('textbox', { name: 'Type' }), 'Boys');
  await userEvent.type(screen.getByRole('spinbutton', { name: 'Total Rooms' }), '10');
  await userEvent.type(screen.getByRole('textbox', { name: 'Warden Name' }), 'Test Warden');

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(mockCreateHostel).toHaveBeenCalledWith({
    name: 'Test Hostel',
    school_id: '123',
    hostel_type: 'Boys',
    total_rooms: '10',
    warden_name: 'Test Warden',
  });
});
