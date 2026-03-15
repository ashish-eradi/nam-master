
import { api } from './api';

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ access_token: string; user: { id: string; email: string; username: string; full_name: string | null; role: string; school_id: string | null; school: { id: string; name: string; logo_url: string | null } | null; employee_id: string | null } }, { email: string; password: string }>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;
