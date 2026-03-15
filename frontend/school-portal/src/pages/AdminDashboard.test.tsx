import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { useGetAdminDashboardQuery } from '../services/dashboardApi';
import AdminDashboard from './AdminDashboard';

jest.mock('../services/dashboardApi');

const mockStore = configureStore([]);

test('renders admin dashboard with data', () => {
  const store = mockStore({});
  const mockData = {
    total_students: 500,
    total_teachers: 50,
    total_classes: 20,
    outstanding_fees: 100000,
    attendance_rate: 95,
  };
  (useGetAdminDashboardQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  render(
    <Provider store={store}>
      <AdminDashboard />
    </Provider>
  );

  expect(screen.getByText('Total Students')).toBeInTheDocument();
  expect(screen.getByText('500')).toBeInTheDocument();
  expect(screen.getByText('Total Teachers')).toBeInTheDocument();
  expect(screen.getByText('50')).toBeInTheDocument();
  expect(screen.getByText('Total Classes')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
  expect(screen.getByText('Outstanding Fees')).toBeInTheDocument();
  const outstandingFees = screen.getByText('Outstanding Fees');
  const statisticElement = outstandingFees.closest('.ant-statistic');
  expect(statisticElement).toHaveTextContent('₹100,000');
  expect(screen.getByText("Today's Attendance")).toBeInTheDocument();
  expect(screen.getByTitle('95%')).toBeInTheDocument();
});
