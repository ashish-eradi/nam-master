import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { useGetTeacherDashboardQuery } from '../services/dashboardApi';
import TeacherDashboard from './TeacherDashboard';

jest.mock('../services/dashboardApi');

const mockStore = configureStore([]);

test('renders teacher dashboard with data', () => {
  const store = mockStore({});
  const mockData = {
    assigned_classes_count: 5,
    pending_grade_entries: 2,
  };
  (useGetTeacherDashboardQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  render(
    <Provider store={store}>
      <TeacherDashboard />
    </Provider>
  );

  expect(screen.getByText('Assigned Classes')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('Pending Grade Entries')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
});
