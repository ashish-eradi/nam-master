import { api } from './api';

// Exam Types
export enum ExamType {
  UNIT_TEST = 'Unit Test',
  MIDTERM = 'Midterm',
  FINAL = 'Final',
  QUARTERLY = 'Quarterly',
  HALF_YEARLY = 'Half Yearly',
  ANNUAL = 'Annual',
  PRACTICAL = 'Practical',
  INTERNAL = 'Internal',
}

// Exam Series Schemas
export interface ExamSeries {
  id: string;
  name: string;
  exam_type: ExamType;
  academic_year: string;
  school_id: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
  created_by_user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface ExamSeriesCreate {
  name: string;
  exam_type: ExamType;
  academic_year: string;
  school_id: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_published?: boolean;
}

export interface ExamSeriesUpdate {
  name?: string;
  exam_type?: ExamType;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_published?: boolean;
}

// Schedule Item Schemas
export interface ExamScheduleItemCreate {
  subject_id: string;
  exam_date: string;
  start_time: string;
  duration_minutes: string;
  max_marks: string;
  passing_marks?: string;
  room_number?: string;
  instructions?: string;
}

export interface ExamScheduleItem extends ExamScheduleItemCreate {
  id: string;
  exam_timetable_id: string;
  created_at: string;
  updated_at?: string;
}

export interface ExamScheduleItemWithSubject extends ExamScheduleItem {
  subject_name: string;
  subject_code?: string;
}

// Timetable Schemas
export interface ExamTimetableCreate {
  exam_series_id: string;
  class_id: string;
  school_id: string;
  instructions?: string;
  schedule_items: ExamScheduleItemCreate[];
}

export interface ExamTimetable {
  id: string;
  exam_series_id: string;
  class_id: string;
  school_id: string;
  instructions?: string;
  created_at: string;
  updated_at?: string;
  schedule_items?: ExamScheduleItem[];
}

export interface ExamTimetableWithSchedule extends ExamTimetable {
  class_name: string;
  schedule_items: ExamScheduleItemWithSubject[];
}

// Student Marks Schemas
export interface StudentExamMarksCreate {
  student_id: string;
  exam_schedule_item_id: string;
  marks_obtained?: string;
  grade_letter?: string;
  is_absent?: boolean;
  remarks?: string;
}

export interface StudentExamMarks extends StudentExamMarksCreate {
  id: string;
  entered_by_user_id?: string;
  entered_at: string;
  updated_at?: string;
}

export interface SubjectMarksEntry {
  student_id: string;
  marks_obtained?: string;
  grade_letter?: string;
  is_absent?: boolean;
  remarks?: string;
}

export interface BulkSubjectMarks {
  exam_schedule_item_id: string;
  marks: SubjectMarksEntry[];
}

// Hall Ticket Schema
export interface HallTicket {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  father_name?: string;
  exam_series_name: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  schedule: ExamScheduleItemWithSubject[];
  instructions?: string;
  student_photo_url?: string;
}

// Marks Sheet Schema
export interface StudentMarksSheet {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  exam_series_name: string;
  exam_type: ExamType;
  marks: StudentExamMarks[];
  total_marks_obtained: number;
  total_max_marks: number;
  percentage: number;
  overall_grade?: string;
}

export const examApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Exam Series Endpoints
    getExamSeries: builder.query<ExamSeries[], { academic_year?: string }>({
      query: (params) => ({
        url: 'exams/exam-series',
        params,
      }),
      providesTags: ['Exam'],
    }),

    getExamSeriesById: builder.query<ExamSeries, string>({
      query: (id) => `exams/exam-series/${id}`,
      providesTags: ['Exam'],
    }),

    createExamSeries: builder.mutation<ExamSeries, ExamSeriesCreate>({
      query: (body) => ({
        url: 'exams/exam-series',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),

    updateExamSeries: builder.mutation<ExamSeries, { id: string; body: ExamSeriesUpdate }>({
      query: ({ id, body }) => ({
        url: `exams/exam-series/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),

    deleteExamSeries: builder.mutation<void, string>({
      query: (id) => ({
        url: `exams/exam-series/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Exam'],
    }),

    // Timetable Endpoints
    getTimetablesForSeries: builder.query<ExamTimetableWithSchedule[], string>({
      query: (exam_series_id) => `exams/exam-series/${exam_series_id}/timetables`,
      providesTags: ['Exam'],
    }),

    getTimetable: builder.query<ExamTimetableWithSchedule, string>({
      query: (timetable_id) => `exams/timetables/${timetable_id}`,
      providesTags: ['Exam'],
    }),

    createTimetable: builder.mutation<ExamTimetable, ExamTimetableCreate>({
      query: (body) => ({
        url: 'exams/timetables',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),

    deleteTimetable: builder.mutation<void, string>({
      query: (id) => ({
        url: `exams/timetables/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Exam'],
    }),

    // Schedule Item Endpoints
    createScheduleItem: builder.mutation<ExamScheduleItem, { timetable_id: string; body: ExamScheduleItemCreate }>({
      query: ({ timetable_id, body }) => ({
        url: `exams/schedule-items?timetable_id=${timetable_id}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),

    updateScheduleItem: builder.mutation<ExamScheduleItem, { id: string; body: Partial<ExamScheduleItemCreate> }>({
      query: ({ id, body }) => ({
        url: `exams/schedule-items/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Exam'],
    }),

    deleteScheduleItem: builder.mutation<void, string>({
      query: (id) => ({
        url: `exams/schedule-items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Exam'],
    }),

    // Hall Ticket Endpoints
    getHallTicket: builder.query<HallTicket, { exam_series_id: string; student_id: string }>({
      query: ({ exam_series_id, student_id }) =>
        `exams/hall-tickets/exam-series/${exam_series_id}/student/${student_id}`,
      providesTags: ['Exam'],
    }),

    getClassHallTickets: builder.query<HallTicket[], { exam_series_id: string; class_id: string }>({
      query: ({ exam_series_id, class_id }) =>
        `exams/hall-tickets/exam-series/${exam_series_id}/class/${class_id}`,
      providesTags: ['Exam'],
    }),

    // Marks Entry Endpoints
    createStudentMarks: builder.mutation<StudentExamMarks, StudentExamMarksCreate>({
      query: (body) => ({
        url: 'exams/marks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExamMarks'],
    }),

    updateStudentMarks: builder.mutation<StudentExamMarks, { id: string; body: Partial<StudentExamMarksCreate> }>({
      query: ({ id, body }) => ({
        url: `exams/marks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ExamMarks'],
    }),

    bulkCreateMarks: builder.mutation<{ message: string; created_count: number; updated_count: number; errors: any[] }, BulkSubjectMarks>({
      query: (body) => ({
        url: 'exams/marks/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExamMarks'],
    }),

    getMarksByScheduleItem: builder.query<StudentExamMarks[], string>({
      query: (schedule_item_id) => `exams/marks/schedule-item/${schedule_item_id}`,
      providesTags: ['ExamMarks'],
    }),

    getStudentMarksSheet: builder.query<StudentMarksSheet, { student_id: string; exam_series_id: string }>({
      query: ({ student_id, exam_series_id }) =>
        `exams/marks/student/${student_id}/exam-series/${exam_series_id}`,
      providesTags: ['ExamMarks'],
    }),

    // PDF Downloads
    downloadAdmitCard: builder.query<Blob, { exam_series_id: string; student_id: string }>({
      query: ({ exam_series_id, student_id }) => ({
        url: `exams/hall-tickets/exam-series/${exam_series_id}/student/${student_id}/download`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadClassAdmitCards: builder.query<Blob, { exam_series_id: string; class_id: string }>({
      query: ({ exam_series_id, class_id }) => ({
        url: `exams/hall-tickets/exam-series/${exam_series_id}/class/${class_id}/download-all`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadReportCard: builder.query<Blob, { student_id: string; exam_series_id: string }>({
      query: ({ student_id, exam_series_id }) => ({
        url: `exams/report-cards/student/${student_id}/exam-series/${exam_series_id}/download`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadClassReportCards: builder.query<Blob, { exam_series_id: string; class_id: string }>({
      query: ({ exam_series_id, class_id }) => ({
        url: `exams/report-cards/exam-series/${exam_series_id}/class/${class_id}/download-all`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetExamSeriesQuery,
  useGetExamSeriesByIdQuery,
  useCreateExamSeriesMutation,
  useUpdateExamSeriesMutation,
  useDeleteExamSeriesMutation,
  useGetTimetablesForSeriesQuery,
  useLazyGetTimetablesForSeriesQuery,
  useGetTimetableQuery,
  useCreateTimetableMutation,
  useDeleteTimetableMutation,
  useCreateScheduleItemMutation,
  useUpdateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useGetHallTicketQuery,
  useLazyGetHallTicketQuery,
  useGetClassHallTicketsQuery,
  useLazyGetClassHallTicketsQuery,
  useCreateStudentMarksMutation,
  useUpdateStudentMarksMutation,
  useBulkCreateMarksMutation,
  useGetMarksByScheduleItemQuery,
  useLazyGetMarksByScheduleItemQuery,
  useGetStudentMarksSheetQuery,
  useLazyGetStudentMarksSheetQuery,
  useLazyDownloadAdmitCardQuery,
  useLazyDownloadClassAdmitCardsQuery,
  useLazyDownloadReportCardQuery,
  useLazyDownloadClassReportCardsQuery,
} = examApi;
