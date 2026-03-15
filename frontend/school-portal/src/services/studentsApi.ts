import { api } from './api';

export interface Student {
  id: string;
  user_id: string;
  email: string;
  roll_number?: string;
  roll_number_assignment_type?: string;
  transport_required?: boolean;
  hostel_required?: boolean;
  status?: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  class_id: string;
  school_id: string;
  admission_date: string;
  academic_year: string;
  aadhar_number?: string;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  mother_phone?: string;
  address?: string;
  area?: string;
  blood_group?: string;
  class_?: {
    id: string;
    name: string;
  };
}

export const studentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query<Student[], { class_id: string } | void>({
      query: (arg) => `students${arg ? `?class_id=${arg.class_id}` : ''}`,
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Student' as const, id })), { type: 'Student', id: 'LIST' }]
          : [{ type: 'Student', id: 'LIST' }],
    }),
    getStudentsByClassId: builder.query<Student[], string>({
      query: (classId) => `classes/${classId}/students`,
      providesTags: (_result, _error, classId) => [{ type: 'Student', id: `LIST_BY_CLASS_${classId}` }],
    }),
    createStudent: builder.mutation<Student, Partial<Student>>({
      query: (body) => ({
        url: 'students',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    updateStudent: builder.mutation<Student, { id: string; body: Partial<Student> }>({
      query: ({ id, body }) => ({
        url: `students/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => (result ? [{ type: 'Student', id: result.id }, { type: 'Student', id: 'LIST' }] : []),
    }),
    bulkImportStudents: builder.mutation<void, FormData>({
      query: (body) => ({
        url: 'students/bulk_import',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    exportStudents: builder.query<Blob, void>({
        query: () => ({
          url: 'students/export',
          responseHandler: (response) => response.blob(),
        }),
    }),
    getStudentPayments: builder.query<any[], string>({
      query: (studentId) => `students/${studentId}/payments`,
      providesTags: (_result, _error, studentId) => [{ type: 'Payment', id: studentId }],
    }),
    getStudentGrades: builder.query<any[], string>({
      query: (studentId) => `students/${studentId}/grades`,
      providesTags: (_result, _error, studentId) => [{ type: 'Grade', id: studentId }],
    }),
    transferStudent: builder.mutation<Student, { studentId: string; classId: string }>({
      query: ({ studentId, classId}) => ({
        url: `students/${studentId}/transfer?class_id=${classId}`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { studentId }) => [
        { type: 'Student', id: studentId },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    bulkPromoteStudents: builder.mutation<any, {
      source_class_id: string;
      target_class_id: string;
      exclude_student_ids?: string[];
      demote_student_ids?: string[];
      demote_target_class_id?: string;
    }>({
      query: (body) => ({
        url: 'students/bulk-promote',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    assignRollNumber: builder.mutation<any, {
      student_id: string;
      assignment_type: string;
      manual_roll_number?: string;
    }>({
      query: (body) => ({
        url: 'students/assign-roll-number',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { student_id }) => [
        { type: 'Student', id: student_id },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    bulkAssignRollNumbers: builder.mutation<any, {
      class_id: string;
      assignment_type: string;
    }>({
      query: (body) => ({
        url: 'students/bulk-assign-roll-numbers',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),

    // Certificate Downloads
    downloadTransferCertificate: builder.query<Blob, { student_id: string; params?: any }>({
      query: ({ student_id, params }) => ({
        url: `certificates/transfer-certificate/${student_id}/download`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadBonafideCertificate: builder.query<Blob, { student_id: string; params: any }>({
      query: ({ student_id, params }) => ({
        url: `certificates/bonafide-certificate/${student_id}/download`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadCharacterCertificate: builder.query<Blob, { student_id: string; params?: any }>({
      query: ({ student_id, params }) => ({
        url: `certificates/character-certificate/${student_id}/download`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useBulkImportStudentsMutation,
  useLazyExportStudentsQuery,
  useGetStudentsByClassIdQuery,
  useGetStudentPaymentsQuery,
  useGetStudentGradesQuery,
  useTransferStudentMutation,
  useBulkPromoteStudentsMutation,
  useAssignRollNumberMutation,
  useBulkAssignRollNumbersMutation,
  useLazyDownloadTransferCertificateQuery,
  useLazyDownloadBonafideCertificateQuery,
  useLazyDownloadCharacterCertificateQuery,
} = studentsApi;