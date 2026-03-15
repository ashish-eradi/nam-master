import { api } from './api';

export interface DashboardData {
  total_schools: number;
  total_users: number;
  total_students: number;
  system_wide_revenue: number;
  // Add more fields as needed from the API response
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSuperAdminDashboard: builder.query<DashboardData, void>({
      query: () => 'dashboard/superadmin',
    }),
  }),
});

export const { useGetSuperAdminDashboardQuery } = dashboardApi;