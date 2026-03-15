
import { api } from './api';

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_phone: string;
  contact_email: string;
  principal_name: string;
  currency: string;
  established_date: string;
  settings: object;
  is_active: boolean;
  is_offline: boolean;
  sms_api_key?: string;
  logo_url?: string | null;
  license_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const schoolsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSchools: builder.query<School[], void>({
      query: () => 'schools',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'School' as const, id })), { type: 'School', id: 'LIST' }]
          : [{ type: 'School', id: 'LIST' }],
    }),
    createSchool: builder.mutation<School, Partial<School>>({
      query: (body) => ({
        url: 'schools',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'School', id: 'LIST' }],
    }),
    updateSchool: builder.mutation<School, { id: string; body: Partial<School> }>({
      query: ({ id, body }) => ({
        url: `schools/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }] : [],
    }),
    deleteSchool: builder.mutation<void, string>({
      query: (id) => ({
        url: `schools/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (id) => id ? [{ type: 'School', id }] : [],
    }),
    activateSchool: builder.mutation<School, string>({
      query: (id) => ({
        url: `schools/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }, { type: 'School', id: 'LIST' }] : [],
    }),
    deactivateSchool: builder.mutation<School, string>({
      query: (id) => ({
        url: `schools/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }, { type: 'School', id: 'LIST' }] : [],
    }),
    updateSchoolSmsApiKey: builder.mutation<School, { id: string; sms_api_key: string }>({
      query: ({ id, sms_api_key }) => ({
        url: `schools/${id}/sms-api-key`,
        method: 'PUT',
        body: { sms_api_key },
      }),
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }, { type: 'School', id: 'LIST' }] : [],
    }),
    setSchoolOffline: builder.mutation<School, string>({
      query: (id) => ({ url: `schools/${id}/set-offline`, method: 'POST' }),
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }, { type: 'School', id: 'LIST' }] : [],
    }),
    setSchoolOnline: builder.mutation<School, string>({
      query: (id) => ({ url: `schools/${id}/set-online`, method: 'POST' }),
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }, { type: 'School', id: 'LIST' }] : [],
    }),
    uploadSchoolLogo: builder.mutation<School, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: `schools/${id}/logo`, method: 'POST', body: formData };
      },
      invalidatesTags: (result) => result ? [{ type: 'School', id: result.id }, { type: 'School', id: 'LIST' }] : [],
    }),
  }),
});

export const {
  useGetSchoolsQuery,
  useCreateSchoolMutation,
  useUpdateSchoolMutation,
  useDeleteSchoolMutation,
  useActivateSchoolMutation,
  useDeactivateSchoolMutation,
  useUpdateSchoolSmsApiKeyMutation,
  useSetSchoolOfflineMutation,
  useSetSchoolOnlineMutation,
  useUploadSchoolLogoMutation,
} = schoolsApi;