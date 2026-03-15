import { api } from './api';

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<any, void>({
      query: () => 'dashboard/admin',
      providesTags: ['Dashboard'],
    }),
    getTeacherDashboard: builder.query<any, void>({
      query: () => 'dashboard/teacher',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { 
  useGetAdminDashboardQuery,
  useGetTeacherDashboardQuery
} = dashboardApi;