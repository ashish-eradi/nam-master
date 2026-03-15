import { api } from './api';

export const libraryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Books
    getBooks: builder.query<any[], void>({
      query: () => 'library/books',
      providesTags: ['Book'],
    }),
    createBook: builder.mutation<any, any>({
      query: (body) => ({
        url: 'library/books',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Book'],
    }),
    updateBook: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `library/books/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Book'],
    }),
    deleteBook: builder.mutation<void, string>({
      query: (id) => ({
        url: `library/books/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Book'],
    }),

    // Transactions
    checkoutBook: builder.mutation<any, any>({
      query: (body) => ({
        url: 'library/checkout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BookTransaction', 'Book'],
    }),
    returnBook: builder.mutation<any, string>({
      query: (transactionId) => ({
        url: `library/return/${transactionId}`,
        method: 'POST',
      }),
      invalidatesTags: ['BookTransaction', 'Book'],
    }),
    getStudentBooks: builder.query<any[], string>({
      query: (studentId) => `library/student/${studentId}/books`,
      providesTags: ['BookTransaction'],
    }),
  }),
});

export const { 
  useGetBooksQuery, useCreateBookMutation, useUpdateBookMutation, useDeleteBookMutation,
  useCheckoutBookMutation, useReturnBookMutation, useGetStudentBooksQuery
} = libraryApi;