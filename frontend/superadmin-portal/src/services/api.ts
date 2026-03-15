import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const getBaseUrl = () => {
  if (window.location.hostname.includes('cloudshell.dev')) {
    return window.location.origin.replace(/:\d+/, ':8000') + '/api/v1';
  }
  return '/api/v1';
};

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: 'include', // Send HttpOnly cookies automatically with every request
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['School', 'User', 'Report', 'License'],
  endpoints: () => ({}),
});
