import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Dashboard from '../Dashboard';
import { useGetFamilyDashboardStatsQuery } from '../../services/dashboardApi';

jest.mock('../../services/dashboardApi');

const mockStore = configureStore([]);

test('renders dashboard with data', async () => {
  const store = mockStore({});
  const mockData = {
    my_children: 2,
    upcoming_exams: 3,
  };
  (useGetFamilyDashboardStatsQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  await act(async () => {
    render(
      <Provider store={store}>
        <Dashboard />
      </Provider>
    );
  });

  expect(screen.getByText('My Children')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('Upcoming Exams')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
});
