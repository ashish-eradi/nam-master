import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Announcements from '../Announcements';
import { useGetAnnouncementsQuery } from '../../services/announcementsApi';

jest.mock('../../services/announcementsApi');

const mockStore = configureStore([]);

test('renders announcements with data', async () => {
  const store = mockStore({});
  const mockData = [
    { id: 1, title: 'Test Announcement 1', content: 'Test Content 1' },
    { id: 2, title: 'Test Announcement 2', content: 'Test Content 2' },
  ];
  (useGetAnnouncementsQuery as jest.Mock).mockReturnValue({
    data: mockData,
    isLoading: false,
  });

  await act(async () => {
    render(
      <Provider store={store}>
        <Announcements />
      </Provider>
    );
  });

  expect(screen.getByText('Test Announcement 1')).toBeInTheDocument();
  expect(screen.getByText('Test Content 1')).toBeInTheDocument();
  expect(screen.getByText('Test Announcement 2')).toBeInTheDocument();
  expect(screen.getByText('Test Content 2')).toBeInTheDocument();
});
