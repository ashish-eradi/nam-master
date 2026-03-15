
import { api } from './api';

export interface Hostel {
  id: string;
  name: string;
  school_id: string;
  hostel_type: string;
  total_rooms: number;
  warden_name: string;
  warden_phone: string;
}

export const hostelApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHostels: builder.query<Hostel[], void>({
      query: () => 'hostels',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Hostel' as const, id })), { type: 'Hostel', id: 'LIST' }]
          : [{ type: 'Hostel', id: 'LIST' }],
    }),
    createHostel: builder.mutation<Hostel, Partial<Hostel>>({
      query: (body) => ({
        url: 'hostels',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Hostel', id: 'LIST' }],
    }),
    updateHostel: builder.mutation<Hostel, { id: string; body: Partial<Hostel> }>({
      query: ({ id, body }) => ({
        url: `hostels/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => result ? [{ type: 'Hostel', id: result.id }] : [],
    }),
    deleteHostel: builder.mutation<void, string>({
      query: (id) => ({
        url: `hostels/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (id) => id ? [{ type: 'Hostel', id }] : [],
    }),
  }),
});

export const {
  useGetHostelsQuery,
  useCreateHostelMutation,
  useUpdateHostelMutation,
  useDeleteHostelMutation,
} = hostelApi;
