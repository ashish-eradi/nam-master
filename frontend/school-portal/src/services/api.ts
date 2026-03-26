import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

const getBaseUrl = () => {
  if (window.location.hostname.includes('cloudshell.dev')) {
    return window.location.origin + '/api/v1';
  }
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1';
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: 'include', // Send HttpOnly cookies automatically with every request
});

const baseQueryWithLicenseCheck: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 403) {
    const data = result.error.data as { detail?: string };
    if (data?.detail === 'LICENSE_EXPIRED') {
      // Dispatch license expired action
      const { setLicenseExpired } = await import('../store/authSlice');
      api.dispatch(setLicenseExpired(true));
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithLicenseCheck,
  tagTypes: ['School', 'User', 'Student', 'Class', 'Subject', 'Attendance', 'Assessment', 'Grade', 'Fund', 'Fee', 'Payment', 'Salary', 'Exam', 'ExamMarks', 'Announcement', 'Message', 'Parent', 'Parents', 'Book', 'BookTransaction', 'Route', 'Vehicle', 'Hostel', 'HostelRoom', 'HostelAllocation', 'HostelFee', 'Period', 'TimetableEntry', 'Concession', 'Report', 'Timetable', 'Dashboard', 'Teacher', 'ClassFee', 'StudentFee', 'RouteFee', 'StudentRoute', 'FinanceReport', 'CalendarEvent', 'MiscellaneousFeeCategory', 'MiscellaneousFee', 'Expenditure'],
  endpoints: () => ({}),
});
