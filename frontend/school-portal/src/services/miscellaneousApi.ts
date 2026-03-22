import { api } from './api';

export const miscellaneousApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Categories
    getMiscCategories: builder.query<any[], void>({
      query: () => 'miscellaneous/categories',
      providesTags: ['MiscellaneousFeeCategory'],
    }),
    createMiscCategory: builder.mutation<any, { name: string; description?: string }>({
      query: (body) => ({ url: 'miscellaneous/categories', method: 'POST', body }),
      invalidatesTags: ['MiscellaneousFeeCategory'],
    }),
    updateMiscCategory: builder.mutation<any, { id: string; body: { name?: string; description?: string } }>({
      query: ({ id, body }) => ({ url: `miscellaneous/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: ['MiscellaneousFeeCategory'],
    }),
    deleteMiscCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `miscellaneous/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MiscellaneousFeeCategory'],
    }),

    // Fees
    getMiscFees: builder.query<any[], void>({
      query: () => 'miscellaneous/fees',
      providesTags: ['MiscellaneousFee'],
    }),
    createMiscFee: builder.mutation<any, any>({
      query: (body) => ({ url: 'miscellaneous/fees', method: 'POST', body }),
      invalidatesTags: ['MiscellaneousFee'],
    }),
    updateMiscFee: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `miscellaneous/fees/${id}`, method: 'PUT', body }),
      invalidatesTags: ['MiscellaneousFee'],
    }),
    deleteMiscFee: builder.mutation<void, string>({
      query: (id) => ({ url: `miscellaneous/fees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MiscellaneousFee'],
    }),

    // Assign to student
    assignMiscFeeToStudent: builder.mutation<any, { studentId: string; body: any }>({
      query: ({ studentId, body }) => ({
        url: `miscellaneous/students/${studentId}/assign-fee`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MiscellaneousFee', 'Student'],
    }),

    // Get student misc fees
    getStudentMiscFees: builder.query<any[], string>({
      query: (studentId) => `miscellaneous/students/${studentId}/fees`,
      providesTags: ['MiscellaneousFee'],
    }),
  }),
});

export const {
  useGetMiscCategoriesQuery,
  useCreateMiscCategoryMutation,
  useUpdateMiscCategoryMutation,
  useDeleteMiscCategoryMutation,
  useGetMiscFeesQuery,
  useCreateMiscFeeMutation,
  useUpdateMiscFeeMutation,
  useDeleteMiscFeeMutation,
  useAssignMiscFeeToStudentMutation,
  useGetStudentMiscFeesQuery,
} = miscellaneousApi;
