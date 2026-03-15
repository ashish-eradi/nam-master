
import { api } from './api';

export interface Teacher {
  id: string;
  user_id: string;
  school_id: string;
  employee_id: string;
  email?: string;
  full_name?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  hire_date?: string;
  experience_years?: number;
}

export interface TeacherCreate {
  employee_id: string;
  email: string;
  full_name: string;
  password?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  hire_date?: string;
  experience_years?: number;
}

export interface BulkImportResult {
  message: string;
  staff_created: number;
  errors?: string[] | null;
}

export const teachersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTeachers: builder.query<Teacher[], void>({
      query: () => 'teachers',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Teacher' as const, id })), { type: 'Teacher', id: 'LIST' }]
          : [{ type: 'Teacher', id: 'LIST' }],
    }),
    getTeacher: builder.query<Teacher, string>({
      query: (id) => `teachers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Teacher', id }],
    }),
    createTeacher: builder.mutation<Teacher, TeacherCreate>({
      query: (body) => ({
        url: 'teachers',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }],
    }),
    updateTeacher: builder.mutation<Teacher, { id: string; body: Partial<TeacherCreate> }>({
      query: ({ id, body }) => ({
        url: `teachers/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => (result ? [{ type: 'Teacher', id: result.id }, { type: 'Teacher', id: 'LIST' }] : []),
    }),
    deleteTeacher: builder.mutation<Teacher, string>({
      query: (id) => ({
        url: `teachers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }],
    }),
    bulkImportTeachingStaff: builder.mutation<BulkImportResult, FormData>({
      query: (formData) => ({
        url: 'teachers/bulk_import/teaching',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }],
    }),
    bulkImportNonTeachingStaff: builder.mutation<BulkImportResult, FormData>({
      query: (formData) => ({
        url: 'teachers/bulk_import/non_teaching',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetTeachersQuery,
  useGetTeacherQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useBulkImportTeachingStaffMutation,
  useBulkImportNonTeachingStaffMutation,
} = teachersApi;
