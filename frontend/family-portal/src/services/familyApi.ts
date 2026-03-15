
import { api } from './api';

export interface Child {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_: {
    name: string;
  };
}

export interface Grade {
  id: string;
  subject: {
    name: string;
  };
  assessment: {
    name: string;
  };
  score_achieved: number;
  grade_letter: string;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
}

export const familyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyChildren: builder.query<Child[], void>({
      query: () => 'parents/me/children',
      providesTags: ['Child'],
    }),
    getMyGrades: builder.query<Grade[], void>({
      query: () => 'students/me/grades',
      providesTags: ['Grade'],
    }),
    getMyProfile: builder.query<Profile, void>({
      query: () => 'users/me',
      providesTags: ['Profile'],
    }),
    updateMyProfile: builder.mutation<Profile, Partial<Profile>>({
      query: (body) => ({
        url: 'users/me',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const {
  useGetMyChildrenQuery,
  useGetMyGradesQuery,
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} = familyApi;
