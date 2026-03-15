import { api } from './api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority?: string;
  target_audience?: string;
  created_at?: string;
  created_by_name?: string;
  school_id?: string;
  created_by_user_id?: string;
}

export const announcementsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAnnouncements: builder.query<Announcement[], void>({
      query: () => 'announcements',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Announcement' as const, id })), { type: 'Announcement', id: 'LIST' }]
          : [{ type: 'Announcement', id: 'LIST' }],
    }),
    createAnnouncement: builder.mutation<Announcement, Partial<Announcement>>({
      query: (body) => ({
        url: 'announcements',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Announcement', id: 'LIST' }],
    }),
    updateAnnouncement: builder.mutation<Announcement, { id: string; body: Partial<Announcement> }>({
      query: ({ id, body }) => ({
        url: `announcements/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Announcement', id }, { type: 'Announcement', id: 'LIST' }],
    }),
    deleteAnnouncement: builder.mutation<void, string>({
      query: (id) => ({
        url: `announcements/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Announcement', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
} = announcementsApi;
