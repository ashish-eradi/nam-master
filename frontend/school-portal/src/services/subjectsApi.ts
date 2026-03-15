
import { api } from './api';

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export const subjectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<Subject[], void>({
      query: () => 'subjects',
      providesTags: ['Subject'],
    }),
    createSubject: builder.mutation<Subject, Partial<Subject>>({
      query: (newSubject) => ({
        url: 'subjects',
        method: 'POST',
        body: newSubject,
      }),
      invalidatesTags: [{ type: 'Subject', id: 'LIST' }],
    }),
    updateSubject: builder.mutation<Subject, { id: string; body: Partial<Subject> }>({
      query: ({ id, body }) => ({
        url: `subjects/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => result ? [{ type: 'Subject', id: result.id }, 'Subject'] : ['Subject'],
    }),
    deleteSubject: builder.mutation<void, string>({
      query: (id) => ({
        url: `subjects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subject'],
    }),
  }),
});

export const { useGetSubjectsQuery, useCreateSubjectMutation, useUpdateSubjectMutation, useDeleteSubjectMutation } = subjectsApi;

