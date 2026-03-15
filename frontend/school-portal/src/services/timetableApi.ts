import { api } from './api';

export const timetableApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Periods
    getPeriods: builder.query<any[], void>({
      query: () => 'timetable/periods',
      providesTags: ['Period'],
    }),
    createPeriod: builder.mutation<any, any>({
      query: (body) => ({
        url: 'timetable/periods',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Period'],
    }),
    updatePeriod: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `timetable/periods/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Period'],
    }),
    deletePeriod: builder.mutation<void, string>({
      query: (id) => ({
        url: `timetable/periods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Period'],
    }),

    // Timetable Entries
    getClassTimetable: builder.query<any[], string>({
      query: (classId) => `timetable/class/${classId}`,
      providesTags: ['TimetableEntry'],
    }),
    createTimetableEntry: builder.mutation<any, any>({
      query: (body) => ({
        url: 'timetable',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TimetableEntry'],
    }),
    updateTimetableEntry: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `timetable/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['TimetableEntry'],
    }),
    deleteTimetableEntry: builder.mutation<void, string>({
      query: (id) => ({
        url: `timetable/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TimetableEntry'],
    }),
  }),
});

export const { 
  useGetPeriodsQuery, useCreatePeriodMutation, useUpdatePeriodMutation, useDeletePeriodMutation,
  useGetClassTimetableQuery, useCreateTimetableEntryMutation, useUpdateTimetableEntryMutation, useDeleteTimetableEntryMutation
} = timetableApi;