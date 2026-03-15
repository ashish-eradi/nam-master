import { api } from './api';

// Types for attendance statistics
export interface ClassAttendanceSummary {
  class_id: string;
  class_name: string;
  section: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  attendance_percentage: number;
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  total_days: number;
  attendance_percentage: number;
}

export interface DailyAttendanceOverview {
  date: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  attendance_percentage: number;
  by_class: ClassAttendanceSummary[];
}

export interface MonthlyAttendanceOverview {
  year: number;
  month: number;
  total_working_days: number;
  by_class: ClassAttendanceSummary[];
  by_student: StudentAttendanceSummary[];
}

export const attendanceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStudentsByClass: builder.query<any[], string>({
      query: (classId) => `classes/${classId}/students`,
      providesTags: ['Student'],
    }),
    getClassAttendance: builder.query<any[], { classId: string; date: string }>({
      query: ({ classId, date }) => `attendance/class/${classId}/date/${date}`,
      providesTags: ['Attendance'],
    }),
    bulkMarkAttendance: builder.mutation<void, any>({
      query: (body) => ({
        url: 'attendance/bulk-mark',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance'],
    }),
    getDailyAttendanceOverview: builder.query<DailyAttendanceOverview, { date?: string; classId?: string }>({
      query: ({ date, classId }) => {
        const params = new URLSearchParams();
        if (date) params.append('target_date', date);
        if (classId) params.append('class_id', classId);
        return `attendance/overview/daily?${params.toString()}`;
      },
      providesTags: ['Attendance'],
    }),
    getMonthlyAttendanceOverview: builder.query<MonthlyAttendanceOverview, { year?: number; month?: number; classId?: string }>({
      query: ({ year, month, classId }) => {
        const params = new URLSearchParams();
        if (year) params.append('year', year.toString());
        if (month) params.append('month', month.toString());
        if (classId) params.append('class_id', classId);
        return `attendance/overview/monthly?${params.toString()}`;
      },
      providesTags: ['Attendance'],
    }),
  }),
});

export const {
  useGetStudentsByClassQuery,
  useGetClassAttendanceQuery,
  useBulkMarkAttendanceMutation,
  useGetDailyAttendanceOverviewQuery,
  useGetMonthlyAttendanceOverviewQuery,
} = attendanceApi;