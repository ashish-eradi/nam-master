import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Subjects from './Subjects';
import { useGetSubjectsQuery, useCreateSubjectMutation, useUpdateSubjectMutation } from '../services/subjectsApi';
import userEvent from '@testing-library/user-event';

jest.mock('../services/subjectsApi');

const mockStore = configureStore([]);

test('creates a new subject', async () => {
  const store = mockStore({});
  const mockCreateSubject = jest.fn();
  (useGetSubjectsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  (useCreateSubjectMutation as jest.Mock).mockReturnValue([mockCreateSubject]);
  (useUpdateSubjectMutation as jest.Mock).mockReturnValue([jest.fn()]);

  render(
    <Provider store={store}>
      <Subjects />
    </Provider>
  );

  await userEvent.click(screen.getByText('Add Subject'));

  await userEvent.type(screen.getByLabelText('Subject Name'), 'Test Subject');
  await userEvent.type(screen.getByLabelText('Subject Code'), 'TS101');

  await userEvent.click(screen.getByText('OK'));

  expect(mockCreateSubject).toHaveBeenCalledWith({
    name: 'Test Subject',
    code: 'TS101',
  });
});
