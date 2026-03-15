import { api } from './api';

export interface CalendarEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  event_type: 'holiday' | 'exam' | 'event' | 'meeting' | 'workshop' | 'sports' | 'other';
  start_date: string;
  end_date: string;
  is_school_closed: string;
  academic_year: string;
  color: string;
}

export interface CalendarEventCreate {
  title: string;
  description?: string;
  event_type: 'holiday' | 'exam' | 'event' | 'meeting' | 'workshop' | 'sports' | 'other';
  start_date: string;
  end_date: string;
  is_school_closed: string;
  academic_year: string;
  color?: string;
  school_id: string;
}

export interface CalendarEventUpdate {
  title?: string;
  description?: string;
  event_type?: 'holiday' | 'exam' | 'event' | 'meeting' | 'workshop' | 'sports' | 'other';
  start_date?: string;
  end_date?: string;
  is_school_closed?: string;
  academic_year?: string;
  color?: string;
}

export const calendarApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarEvents: builder.query<CalendarEvent[], { academic_year?: string; start_date?: string; end_date?: string }>({
      query: (params) => ({
        url: 'calendar/events',
        params,
      }),
      providesTags: ['CalendarEvent'],
    }),
    getCalendarEvent: builder.query<CalendarEvent, string>({
      query: (id) => `calendar/events/${id}`,
      providesTags: (result, error, id) => [{ type: 'CalendarEvent', id }],
    }),
    createCalendarEvent: builder.mutation<CalendarEvent, CalendarEventCreate>({
      query: (body) => ({
        url: 'calendar/events',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CalendarEvent'],
    }),
    updateCalendarEvent: builder.mutation<CalendarEvent, { id: string; body: CalendarEventUpdate }>({
      query: ({ id, body }) => ({
        url: `calendar/events/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'CalendarEvent', id }, 'CalendarEvent'],
    }),
    deleteCalendarEvent: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `calendar/events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CalendarEvent'],
    }),
    getHolidays: builder.query<any[], { academic_year?: string; start_date?: string; end_date?: string }>({
      query: (params) => ({
        url: 'calendar/holidays',
        params,
      }),
      providesTags: ['CalendarEvent'],
    }),
  }),
});

export const {
  useGetCalendarEventsQuery,
  useGetCalendarEventQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGetHolidaysQuery,
} = calendarApi;
