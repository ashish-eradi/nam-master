
import { api } from './api';
import type { Class } from '../schemas/class_schema';

export const classApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getClasses: builder.query<Class[], void>({
      query: () => 'classes',
      providesTags: ['Class'],
    }),
  }),
});

export const { useGetClassesQuery } = classApi;
