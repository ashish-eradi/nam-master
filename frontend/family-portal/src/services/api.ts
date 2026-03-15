
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const getBaseUrl = () => {
  if (window.location.hostname.includes('cloudshell.dev')) {
    return window.location.origin + '/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    prepareHeaders: (headers, { getState }) => {
      // No need to cast getState() as RootState explicitly here, RTK Query infers the type
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Student', 'Grade', 'Announcement', 'Timetable', 'BookTransaction', 'Child', 'Profile', 'Book', 'Transaction', 'ChildFees', 'ChildPayments'],
  endpoints: () => ({}),
});
