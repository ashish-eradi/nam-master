

import { api } from './api';

export interface Assessment {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  student_id: string;
  assessment_id: string;
  score_achieved: number;
}

export const gradesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAssessments: builder.query<Assessment[], { class_id: string; subject_id: string } | void>({
      query: (arg) => `assessments${arg ? `?class_id=${arg.class_id}&subject_id=${arg.subject_id}` : ''}`,
      providesTags: ['Assessment'],
    }),
    getGrades: builder.query<Grade[], { assessment_id: string } | void>({
      query: (arg) => `grades/assessment/${arg ? arg.assessment_id : ''}`,
      providesTags: ['Grade'],
    }),
    enterGrades: builder.mutation<void, Partial<Grade>[]>({
      query: (body) => ({
        url: 'grades/entry',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Grade', id: 'LIST' }],
    }),
  }),
});

export const { useGetAssessmentsQuery, useGetGradesQuery, useEnterGradesMutation } = gradesApi;

