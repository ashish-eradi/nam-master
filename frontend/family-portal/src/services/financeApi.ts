import { api } from './api';

export const financeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get fees for a specific child
    getChildFees: builder.query<any, { child_id: string; academic_year?: string }>({
      query: ({ child_id, academic_year }) => ({
        url: `parents/children/${child_id}/fees`,
        params: academic_year ? { academic_year } : {},
      }),
      providesTags: ['ChildFees'],
    }),

    // Get payment history for a specific child
    getChildPayments: builder.query<any, { child_id: string; academic_year?: string; limit?: number; offset?: number }>({
      query: ({ child_id, academic_year, limit = 50, offset = 0 }) => ({
        url: `parents/children/${child_id}/payments`,
        params: { academic_year, limit, offset },
      }),
      providesTags: ['ChildPayments'],
    }),

    // Download receipt as PDF
    downloadReceipt: builder.query<Blob, string>({
      query: (payment_id) => ({
        url: `parents/payments/${payment_id}/receipt`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetChildFeesQuery,
  useLazyGetChildFeesQuery,
  useGetChildPaymentsQuery,
  useLazyGetChildPaymentsQuery,
  useLazyDownloadReceiptQuery,
} = financeApi;
