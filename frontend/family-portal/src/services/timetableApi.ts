
import { api } from './api';

export interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: {
    period_number: number;
    start_time: string;
    end_time: string;
  };
  subject: {
    name: string;
  };
  teacher: {
    first_name: string;
  };
}

export const timetableApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyTimetable: builder.query<TimetableEntry[], void>({
      query: () => 'students/me/timetable',
      providesTags: ['Timetable'],
    }),
  }),
});

export const { useGetMyTimetableQuery } = timetableApi;
