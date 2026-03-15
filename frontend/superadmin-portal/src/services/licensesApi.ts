import { api } from './api';

export interface LicenseResponse {
  id: string;
  school_id: string;
  school_name: string;
  issued_at: string;
  expires_at: string;
  is_revoked: boolean;
  notes: string | null;
}

export interface LicenseKeyGenerated {
  license_key: string;
  expires_at: string;
  school_name: string;
}

export interface LicenseStatus {
  is_licensed: boolean;
  license_expires_at: string | null;
  days_remaining: number | null;
  is_expired: boolean;
}

export interface GenerateLicensePayload {
  school_id: string;
  validity_days: number;
  notes?: string;
}

export const licensesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateLicense: builder.mutation<LicenseKeyGenerated, GenerateLicensePayload>({
      query: (body) => ({
        url: 'licenses/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'License', id: 'LIST' }],
    }),
    getLicenses: builder.query<LicenseResponse[], void>({
      query: () => 'licenses/',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'License' as const, id })), { type: 'License', id: 'LIST' }]
          : [{ type: 'License', id: 'LIST' }],
    }),
    getSchoolLicenseStatus: builder.query<LicenseStatus, string>({
      query: (schoolId) => `licenses/school/${schoolId}`,
      providesTags: (_result, _err, schoolId) => [{ type: 'License', id: schoolId }],
    }),
    revokeLicense: builder.mutation<void, string>({
      query: (licenseId) => ({
        url: `licenses/${licenseId}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'License', id: 'LIST' }],
    }),
  }),
});

export const {
  useGenerateLicenseMutation,
  useGetLicensesQuery,
  useGetSchoolLicenseStatusQuery,
  useRevokeLicenseMutation,
} = licensesApi;
