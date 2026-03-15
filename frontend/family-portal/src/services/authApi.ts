
import { api } from './api';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_?: {
    name: string;
    section?: string;
  } | null;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    role: string;
    school_id?: string;
    school?: {
      id: string;
      name: string;
    };
    employee_id?: string;
    children?: Child[];
  };
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, any>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;
