
import { api } from './api';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publication_year: number;
  category: string;
  total_copies: number;
  available_copies: number;
  school_id: string;
}

export const libraryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getBooks: builder.query<Book[], void>({
      query: () => 'library',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Book' as const, id })), { type: 'Book', id: 'LIST' }]
          : [{ type: 'Book', id: 'LIST' }],
    }),
    createBook: builder.mutation<Book, Partial<Book>>({
      query: (body) => ({
        url: 'library',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Book', id: 'LIST' }],
    }),
    updateBook: builder.mutation<Book, { id: string; body: Partial<Book> }>({
      query: ({ id, body }) => ({
        url: `library/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => result ? [{ type: 'Book', id: result.id }] : [],
    }),
    deleteBook: builder.mutation<void, string>({
      query: (id) => ({
        url: `library/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (id) => id ? [{ type: 'Book', id }] : [],
    }),
  }),
});

export const {
  useGetBooksQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation,
} = libraryApi;
