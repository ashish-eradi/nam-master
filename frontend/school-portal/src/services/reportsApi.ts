
import { api } from './api';

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
  }),
});

export const { 
    useGetAttendanceReportQuery,
    useGetGradesReportQuery,
    useGetFinancialReportQuery,
    useGetStudentReportQuery,
} = reportsApi;
