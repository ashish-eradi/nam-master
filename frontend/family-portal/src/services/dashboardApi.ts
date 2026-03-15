import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface DashboardStats {
  my_children: number;
  upcoming_exams: number;
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1/' }),
  endpoints: (builder) => ({
    getFamilyDashboardStats: builder.query<DashboardStats, void>({
      query: () => 'dashboard/parent',
    }),
  }),
});

export const { useGetFamilyDashboardStatsQuery } = dashboardApi;
