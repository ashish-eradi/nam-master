import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Profile from '../Profile';
import { useGetMyProfileQuery, useUpdateMyProfileMutation } from '../../services/familyApi';
import userEvent from '@testing-library/user-event';

jest.mock('../../services/familyApi');

const mockStore = configureStore([]);

test('updates the profile', async () => {
  const store = mockStore({});
  const mockUpdateProfile = jest.fn();
  const mockData = {
    username: 'testuser',
    email: 'test@example.com',
  };
  (useGetMyProfileQuery as jest.Mock).mockReturnValue({ data: mockData, isLoading: false });
  (useUpdateMyProfileMutation as jest.Mock).mockReturnValue([mockUpdateProfile]);

  await act(async () => {
    render(
      <Provider store={store}>
        <Profile />
      </Provider>
    );
  });

  await userEvent.clear(screen.getByLabelText('Email'));
  await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
  await userEvent.click(screen.getByText('Update Profile'));

  expect(mockUpdateProfile).toHaveBeenCalledWith({
    username: 'testuser',
    email: 'new@example.com',
  });
});
