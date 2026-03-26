
import { api } from './api';

export interface AnnualReportData {
  student_id: string;
  student_name: string;
  admission_number: string;
  roll_number?: string;
  class_name: string;
  section?: string;
  date_of_birth?: string;
  father_name?: string;
  academic_year: string;
  exams: {
    exam_name: string;
    exam_type: string;
    total_obtained: number;
    total_max: number;
    percentage: number;
    overall_grade: string;
  }[];
  monthly_attendance: {
    month_name: string;
    working_days: number;
    present_days: number;
    percentage: number;
  }[];
  annual_working_days: number;
  annual_present_days: number;
  annual_attendance_percentage: number;
}

export const reportsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAttendanceReport: builder.query<string, void>({
      query: () => 'reports/attendance',
      providesTags: ['Report'],
    }),
    getGradesReport: builder.query<string, void>({
      query: () => 'reports/grades',
      providesTags: ['Report'],
    }),
    getFinancialReport: builder.query<string, void>({
      query: () => 'reports/financial',
      providesTags: ['Report'],
    }),
    getStudentReport: builder.query<string, void>({
      query: () => 'reports/students',
      providesTags: ['Report'],
    }),
    getStudentAnnualReport: builder.query<AnnualReportData, { student_id: string; academic_year: string }>({
      query: ({ student_id, academic_year }) =>
        `reports/annual-report/student/${student_id}?academic_year=${academic_year}`,
      providesTags: ['Report'],
    }),
    downloadStudentAnnualReport: builder.query<Blob, { student_id: string; academic_year: string }>({
      query: ({ student_id, academic_year }) => ({
        url: `reports/annual-report/student/${student_id}/download?academic_year=${academic_year}`,
        responseHandler: (response) => response.ok ? response.blob() : response.json(),
      }),
    }),
    downloadClassAnnualReports: builder.query<Blob, { class_id: string; academic_year: string }>({
      query: ({ class_id, academic_year }) => ({
        url: `reports/annual-report/class/${class_id}/download-all?academic_year=${academic_year}`,
        responseHandler: (response) => response.ok ? response.blob() : response.json(),
      }),
    }),
  }),
});

export const {
    useGetAttendanceReportQuery,
    useGetGradesReportQuery,
    useGetFinancialReportQuery,
    useGetStudentReportQuery,
    useLazyGetStudentAnnualReportQuery,
    useLazyDownloadStudentAnnualReportQuery,
    useLazyDownloadClassAnnualReportsQuery,
} = reportsApi;
