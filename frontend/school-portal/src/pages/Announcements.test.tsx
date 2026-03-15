import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Announcements from './Announcements';
import { useGetAnnouncementsQuery, useCreateAnnouncementMutation } from '../services/announcementsApi';

jest.mock('../services/announcementsApi');

const mockStore = configureStore([]);

test('creates a new announcement', async () => {
  const store = mockStore({});
  const mockCreateAnnouncement = jest.fn();
  (useGetAnnouncementsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  (useCreateAnnouncementMutation as jest.Mock).mockReturnValue([mockCreateAnnouncement]);

  render(
    <Provider store={store}>
      <Announcements />
    </Provider>
  );

  await userEvent.click(screen.getByText('Create Announcement'));

  await userEvent.type(screen.getByLabelText('Title'), 'Test Title');
  await userEvent.type(screen.getByLabelText('Content'), 'Test Content');

  await userEvent.click(screen.getByText('OK'));

  expect(mockCreateAnnouncement).toHaveBeenCalledWith({
    title: 'Test Title',
    content: 'Test Content',
  });
});
