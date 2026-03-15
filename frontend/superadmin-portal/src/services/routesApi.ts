
import { api } from './api';

export interface Route {
  id: string;
  route_name: string;
  route_number: string;
  school_id: string;
  pickup_points: string[];
  distance_km: number;
}

export const routesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getRoutes: builder.query<Route[], void>({
      query: () => 'transport/routes',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Route' as const, id })), { type: 'Route', id: 'LIST' }]
          : [{ type: 'Route', id: 'LIST' }],
    }),
    createRoute: builder.mutation<Route, Partial<Route>>({
      query: (body) => ({
        url: 'transport/routes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Route', id: 'LIST' }],
    }),
    updateRoute: builder.mutation<Route, { id: string; body: Partial<Route> }>({
      query: ({ id, body }) => ({
        url: `transport/routes/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => result ? [{ type: 'Route', id: result.id }] : [],
    }),
    deleteRoute: builder.mutation<void, string>({
      query: (id) => ({
        url: `transport/routes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (id) => id ? [{ type: 'Route', id }] : [],
    }),
  }),
});

export const {
  useGetRoutesQuery,
  useCreateRouteMutation,
  useUpdateRouteMutation,
  useDeleteRouteMutation,
} = routesApi;
