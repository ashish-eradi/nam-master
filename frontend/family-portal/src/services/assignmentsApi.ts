import { api } from './api';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: {
    id: string;
    name: string;
  };
  assigned_date: string;
  due_date: string;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED';
  submission?: {
    submitted_date: string;
    grade?: number;
    feedback?: string;
  };
}

export const assignmentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get assignments for a child
    getChildAssignments: builder.query<Assignment[], { child_id: string; status?: string }>({
      query: ({ child_id, status }) => ({
        url: `parents/children/${child_id}/assignments`,
        params: status ? { status } : {},
      }),
      providesTags: ['Assignments'],
    }),
  }),
});

export const {
  useGetChildAssignmentsQuery,
  useLazyGetChildAssignmentsQuery,
} = assignmentsApi;
