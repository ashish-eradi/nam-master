import { api } from './api';

export interface LicenseStatus {
  is_licensed: boolean;
  license_expires_at: string | null;
  days_remaining: number | null;
  is_expired: boolean;
}

export interface ActivateLicensePayload {
  license_key: string;
}

export const licenseApi = api.injectEndpoints({
  endpoints: (builder) => ({
    activateLicense: builder.mutation<LicenseStatus, ActivateLicensePayload>({
      query: (body) => ({
        url: 'licenses/activate',
        method: 'POST',
        body,
      }),
    }),
    getLicenseStatus: builder.query<LicenseStatus, void>({
      query: () => 'licenses/status',
    }),
  }),
});

export const { useActivateLicenseMutation, useGetLicenseStatusQuery } = licenseApi;
