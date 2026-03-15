
import { api } from './api';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  available_copies: number;
}

export interface BookTransaction {
  id: string;
  book_id: string;
  student_id: string;
  checkout_date: string;
  return_date: string;
  fine_amount: number;
}

export const libraryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getBooks: builder.query<Book[], void>({
      query: () => 'library/books',
      providesTags: ['Book'],
    }),
    getMyTransactions: builder.query<BookTransaction[], void>({
      query: () => 'students/me/books',
      providesTags: ['Transaction'],
    }),
  }),
});

export const { useGetBooksQuery, useGetMyTransactionsQuery } = libraryApi;
