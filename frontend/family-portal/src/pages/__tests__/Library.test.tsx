import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import Library from '../Library';
import { useGetBooksQuery, useGetMyTransactionsQuery } from '../../services/libraryApi';

jest.mock('../../services/libraryApi');

const mockStore = configureStore([]);

test('renders books with data', () => {
  const store = mockStore({});
  const mockBooks = [
    { id: '1', title: 'Book 1', author: 'Author 1', isbn: '12345', available_copies: 5 },
    { id: '2', title: 'Book 2', author: 'Author 2', isbn: '67890', available_copies: 2 },
  ];
  (useGetBooksQuery as jest.Mock).mockReturnValue({
    data: mockBooks,
    isLoading: false,
  });
  (useGetMyTransactionsQuery as jest.Mock).mockReturnValue({
    data: [],
    isLoading: false,
  });

  render(
    <Provider store={store}>
      <Library />
    </Provider>
  );

  expect(screen.getByText('Book 1')).toBeInTheDocument();
  expect(screen.getByText('Author 1')).toBeInTheDocument();
  expect(screen.getByText('12345')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('Book 2')).toBeInTheDocument();
  expect(screen.getByText('Author 2')).toBeInTheDocument();
  expect(screen.getByText('67890')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
});
