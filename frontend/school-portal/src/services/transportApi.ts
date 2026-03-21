import { api } from './api';

export const transportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Routes
    getRoutes: builder.query<any[], void>({
      query: () => 'transport/routes',
      providesTags: ['Route'],
    }),
    createRoute: builder.mutation<any, any>({
      query: (body) => ({
        url: 'transport/routes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Route'],
    }),
    updateRoute: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `transport/routes/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Route'],
    }),
    deleteRoute: builder.mutation<void, string>({
      query: (id) => ({
        url: `transport/routes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Route'],
    }),

    // Vehicles
    getVehicles: builder.query<any[], void>({
      query: () => 'transport/vehicles',
      providesTags: ['Vehicle'],
    }),
    createVehicle: builder.mutation<any, any>({
      query: (body) => ({
        url: 'transport/vehicles',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Vehicle'],
    }),
    updateVehicle: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `transport/vehicles/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Vehicle'],
    }),
    deleteVehicle: builder.mutation<void, string>({
      query: (id) => ({
        url: `transport/vehicles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Vehicle'],
    }),

    // Student Assignment
    assignStudentToRoute: builder.mutation<any, any>({
      query: (body) => ({
        url: 'transport/assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StudentRoute'],
    }),
    getStudentRoute: builder.query<any, { studentId: string; academic_year?: string }>({
      query: ({ studentId, academic_year }) => ({
        url: `transport/student/${studentId}/route`,
        params: academic_year ? { academic_year } : {},
      }),
      providesTags: ['StudentRoute'],
    }),
    unassignStudentFromRoute: builder.mutation<void, string>({
      query: (assignmentId) => ({
        url: `transport/assign/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['StudentRoute'],
    }),

    // Route Fees
    getRouteFees: builder.query<any[], void>({
      query: () => 'transport/route-fees',
      providesTags: ['RouteFee'],
    }),
    createRouteFee: builder.mutation<any, any>({
      query: (body) => ({
        url: 'transport/route-fees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RouteFee'],
    }),
    updateRouteFee: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `transport/route-fees/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['RouteFee'],
    }),
    deleteRouteFee: builder.mutation<void, string>({
      query: (id) => ({
        url: `transport/route-fees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RouteFee'],
    }),
    assignRouteFeeToStudent: builder.mutation<any, { student_id: string; body: any }>({
      query: ({ student_id, body }) => ({
        url: `transport/students/${student_id}/assign-route-fee`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RouteFee', 'StudentRoute'],
    }),
  }),
});

export const {
  useGetRoutesQuery, useCreateRouteMutation, useUpdateRouteMutation, useDeleteRouteMutation,
  useGetVehiclesQuery, useCreateVehicleMutation, useUpdateVehicleMutation, useDeleteVehicleMutation,
  useAssignStudentToRouteMutation, useGetStudentRouteQuery, useUnassignStudentFromRouteMutation,
  useGetRouteFeesQuery, useCreateRouteFeeMutation, useUpdateRouteFeeMutation, useDeleteRouteFeeMutation, useAssignRouteFeeToStudentMutation
} = transportApi;