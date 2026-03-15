import { api } from './baseApi';

export interface CertificateParams {
  student_id: string;
  tc_number?: string;
  date_of_leaving?: string;
  reason_for_leaving?: string;
  conduct?: string;
  remarks?: string;
  purpose?: string;
  certificate_number?: string;
  academic_year?: string;
  character_remarks?: string;
}

export const certificatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Transfer Certificate
    downloadTransferCertificate: builder.query<Blob, CertificateParams>({
      query: ({ student_id, ...params }) => ({
        url: `certificates/transfer-certificate/${student_id}/download`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Bonafide Certificate
    downloadBonafideCertificate: builder.query<Blob, CertificateParams & { purpose: string }>({
      query: ({ student_id, ...params }) => ({
        url: `certificates/bonafide-certificate/${student_id}/download`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Character Certificate
    downloadCharacterCertificate: builder.query<Blob, CertificateParams>({
      query: ({ student_id, ...params }) => ({
        url: `certificates/character-certificate/${student_id}/download`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useLazyDownloadTransferCertificateQuery,
  useLazyDownloadBonafideCertificateQuery,
  useLazyDownloadCharacterCertificateQuery,
} = certificatesApi;
