
import { api } from './api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const announcementsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAnnouncements: builder.query<Announcement[], void>({
      query: () => 'announcements/my',
      providesTags: ['Announcement'],
    }),
  }),
});

export const { useGetAnnouncementsQuery } = announcementsApi;
