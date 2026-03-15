import { api } from './api';

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  remarks?: string;
}

export interface AttendanceStats {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  attendance_percentage: number;
}

export const attendanceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get attendance for a child
    getChildAttendance: builder.query<AttendanceRecord[], { child_id: string; month?: string; year?: string }>({
      query: ({ child_id, month, year }) => ({
        url: `parents/children/${child_id}/attendance`,
        params: { month, year },
      }),
      providesTags: ['Attendance'],
    }),

    // Get attendance statistics
    getChildAttendanceStats: builder.query<AttendanceStats, { child_id: string; academic_year?: string }>({
      query: ({ child_id, academic_year }) => ({
        url: `parents/children/${child_id}/attendance/stats`,
        params: academic_year ? { academic_year } : {},
      }),
      providesTags: ['AttendanceStats'],
    }),
  }),
});

export const {
  useGetChildAttendanceQuery,
  useLazyGetChildAttendanceQuery,
  useGetChildAttendanceStatsQuery,
} = attendanceApi;
