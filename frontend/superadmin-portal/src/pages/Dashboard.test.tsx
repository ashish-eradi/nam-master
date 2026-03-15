import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Dashboard from './Dashboard';
import { useGetSuperAdminDashboardQuery } from '../services/dashboardApi';
import { jest } from '@jest/globals';

jest.mock('../services/dashboardApi');

const mockStore = configureStore([]);

test('renders dashboard with data', () => {
  const store = mockStore({});
  const mockData = {
    total_schools: 10,
    total_users: 100,
    total_students: 1000,
    system_wide_revenue: 1000000,
  };
  (useGetSuperAdminDashboardQuery as any).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  render(
    <Provider store={store}>
      <Dashboard />
    </Provider>
  );

  expect(screen.getByText('Total Schools')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('Total Users')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
  expect(screen.getByText('Total Students')).toBeInTheDocument();
  expect(screen.getByText('1000')).toBeInTheDocument();
  expect(screen.getByText('System-wide Revenue')).toBeInTheDocument();
  expect(screen.getByText('$1,000,000')).toBeInTheDocument();
});
