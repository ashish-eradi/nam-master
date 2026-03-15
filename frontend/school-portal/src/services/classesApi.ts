import { api } from './api';

export interface Class {
  id: string;
  name: string;
  section: string;
  grade_level: number;
  academic_year: string;
  max_students?: number;
  school_id?: string;
  class_teacher_id?: string;
}

export interface ClassCreate {
  name: string;
  section: string;
  grade_level: number;
  academic_year: string;
  max_students?: number;
}

export const classesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getClasses: builder.query<Class[], void>({
      query: () => 'classes',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Class' as const, id })), { type: 'Class', id: 'LIST' }]
          : [{ type: 'Class', id: 'LIST' }],
    }),
    createClass: builder.mutation<Class, ClassCreate>({
      query: (body) => ({
        url: 'classes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Class', id: 'LIST' }],
    }),
  }),
});

export const { useGetClassesQuery, useCreateClassMutation } = classesApi;