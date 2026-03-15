

import { api } from './api';

export interface Exam {
  id: string;
  name: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
}

export const examsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getExams: builder.query<Exam[], void>({
      query: () => 'exams',
      providesTags: ['Exam'],
    }),
    createExam: builder.mutation<Exam, Partial<Exam>>({
      query: (body) => ({
        url: 'exams',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Exam', id: 'LIST' }],
    }),
  }),
});

export const { useGetExamsQuery, useCreateExamMutation } = examsApi;

