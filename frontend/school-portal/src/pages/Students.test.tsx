import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Students from './Students';
import { useGetStudentsQuery, useCreateStudentMutation, useUpdateStudentMutation, useBulkImportStudentsMutation, useLazyExportStudentsQuery } from '../services/studentsApi';
import userEvent from '@testing-library/user-event';


jest.mock('../services/studentsApi');

const mockStore = configureStore([]);

const mockCreateStudent = jest.fn();

(useCreateStudentMutation as jest.Mock).mockReturnValue([mockCreateStudent, { isLoading: false, reset: jest.fn() }]);

test('creates a new student', async () => {
  const store = mockStore({});
  (useGetStudentsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  (useUpdateStudentMutation as jest.Mock).mockReturnValue([jest.fn()]);
  (useBulkImportStudentsMutation as jest.Mock).mockReturnValue([jest.fn()]);
  (useLazyExportStudentsQuery as jest.Mock).mockReturnValue([jest.fn()]);

  render(
    <Provider store={store}>
      <Students />
    </Provider>
  );

  await userEvent.click(screen.getByText('Add Student'));

  await userEvent.type(screen.getByLabelText('Admission Number'), '123');
  await userEvent.type(screen.getByLabelText('First Name'), 'John');
  await userEvent.type(screen.getByLabelText('Last Name'), 'Doe');
  
  await userEvent.click(screen.getByLabelText('Date of Birth'));
  await userEvent.click(screen.getAllByText('Today')[0]);

  await userEvent.click(screen.getByLabelText('Admission Date'));
  await userEvent.click(screen.getAllByText('Today')[1]);

  await userEvent.click(screen.getByText('OK'));

  expect(mockCreateStudent).toHaveBeenCalledWith({
    admission_number: '123',
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: expect.any(Object), // moment object
    admission_date: expect.any(Object), // moment object
  });
}, 10000);
