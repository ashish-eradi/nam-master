import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ClassesPage from './ClassesPage';
import { useGetClassesQuery } from '../services/classesApi';
import { useGetStudentsByClassIdQuery } from '../services/studentsApi';
import userEvent from '@testing-library/user-event';

jest.mock('../services/classesApi');
jest.mock('../services/studentsApi');

const mockStore = configureStore([]);

test('displays students when a class is selected', async () => {
  const store = mockStore({});
  const mockClasses = [
    { id: '1', name: 'Class 1', section: 'A' },
    { id: '2', name: 'Class 2', section: 'B' },
  ];
  const mockStudents = [
    { id: '1', roll_number: '101', first_name: 'John', last_name: 'Doe' },
    { id: '2', roll_number: '102', first_name: 'Jane', last_name: 'Doe' },
  ];
  (useGetClassesQuery as jest.Mock).mockReturnValue({ data: mockClasses, isLoading: false });
  (useGetStudentsByClassIdQuery as jest.Mock).mockReturnValue({ data: mockStudents, isLoading: false });

  render(
    <Provider store={store}>
      <ClassesPage />
    </Provider>
  );

  await userEvent.click(screen.getByText('Class 1'));

  expect(screen.getByText('John')).toBeInTheDocument();
  expect(screen.getByText('Jane')).toBeInTheDocument();
});
