
import { render, screen, within, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Timetable from '../Timetable';
import { useGetMyTimetableQuery } from '../../services/timetableApi';

jest.mock('../../services/timetableApi');

const mockStore = configureStore([]);

test('renders timetable with data', async () => {
  const store = mockStore({});
  const mockData = [
    {
      id: 1,
      day_of_week: 'Monday',
      period: { period_number: 1, start_time: '09:00', end_time: '10:00' },
      subject: { name: 'Math' },
      teacher: { first_name: 'Mr. Smith' },
    },
  ];
  (useGetMyTimetableQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  await act(async () => {
    render(
      <Provider store={store}>
        <Timetable />
      </Provider>
    );
  });

  const row = screen.getByRole('row', { name: /monday/i });

  expect(within(row).getByText('Monday')).toBeInTheDocument();
  expect(within(row).getByText('1')).toBeInTheDocument();
  expect(within(row).getByText('09:00')).toBeInTheDocument();
  expect(within(row).getByText('10:00')).toBeInTheDocument();
  expect(within(row).getByText('Math')).toBeInTheDocument();
  expect(within(row).getByText('Mr. Smith')).toBeInTheDocument();
});
