import { api } from './api';
import type {
  Fund, FundCreate, FundUpdate,
  Fee, FeeCreate, FeeUpdate,
  Payment, PaymentCreate,
  Concession, ConcessionCreate,
  Salary, SalaryCreate,
  ClassFee, ClassFeeCreate, ClassFeeUpdate,
  StudentLookup, TeacherLookup,
  StudentFeeStructure, StudentFeeAssignment,
  StudentLedger, StudentOutstanding,
  PaymentCreateWithAllocations,
  BulkClassFeeCreate, BulkPaymentCreate, BulkConcessionCreate
} from '../schemas/finance_schema';

export const financeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFunds: builder.query<Fund[], void>({
      query: () => 'finance/funds',
      providesTags: ['Fund'],
    }),
    createFund: builder.mutation<Fund, Partial<FundCreate>>({
      query: (body) => ({
        url: 'finance/funds',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Fund'],
    }),
    updateFund: builder.mutation<Fund, { id: string; body: FundUpdate }>({
      query: ({ id, body }) => ({
        url: `finance/funds/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Fund'],
    }),
    deleteFund: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `finance/funds/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Fund'],
    }),
    // Fee Endpoints
    getFees: builder.query<Fee[], void>({
      query: () => 'finance/fees',
      providesTags: ['Fee'],
    }),
    createFee: builder.mutation<Fee, Partial<FeeCreate>>({
      query: (body) => ({
        url: 'finance/fees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Fee'],
    }),
    updateFee: builder.mutation<Fee, { id: string; body: FeeUpdate }>({
      query: ({ id, body }) => ({
        url: `finance/fees/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Fee'],
    }),
    deleteFee: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `finance/fees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Fee'],
    }),
    // Payment Endpoints
    getPayments: builder.query<Payment[], void>({
      query: () => 'finance/payments',
      providesTags: ['Payment'],
    }),
    createPayment: builder.mutation<Payment, Partial<PaymentCreate>>({
      query: (body) => ({
        url: 'finance/payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment', 'StudentFee', 'FinanceReport'],
    }),
    deletePayment: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `finance/payments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payment', 'StudentFee', 'FinanceReport'],
    }),
    // Concession Endpoints
    getConcessions: builder.query<Concession[], void>({
      query: () => 'finance/concessions',
      providesTags: ['Concession'],
    }),
    createConcession: builder.mutation<Concession, Partial<ConcessionCreate>>({
      query: (body) => ({
        url: 'finance/concessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Concession', 'StudentFee', 'FinanceReport'],
    }),
    deleteConcession: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `finance/concessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Concession', 'StudentFee', 'FinanceReport'],
    }),
    // Salary Endpoints
    getSalaries: builder.query<Salary[], void>({
      query: () => 'finance/salaries',
      providesTags: ['Salary'],
    }),
    createSalary: builder.mutation<Salary, Partial<SalaryCreate>>({
      query: (body) => ({
        url: 'finance/salaries',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Salary'],
    }),
    deleteSalary: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `finance/salaries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Salary'],
    }),

    // ClassFee Endpoints
    getClassFees: builder.query<ClassFee[], { academic_year?: string }>({
      query: (params) => ({
        url: 'finance-extended/class-fees',
        params,
      }),
      providesTags: ['ClassFee'],
    }),
    createClassFee: builder.mutation<ClassFee, ClassFeeCreate>({
      query: (body) => ({
        url: 'finance-extended/class-fees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ClassFee'],
    }),
    updateClassFee: builder.mutation<ClassFee, { id: string; body: ClassFeeUpdate }>({
      query: ({ id, body }) => ({
        url: `finance-extended/class-fees/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ClassFee'],
    }),
    deleteClassFee: builder.mutation<void, string>({
      query: (id) => ({
        url: `finance-extended/class-fees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ClassFee'],
    }),
    bulkCreateClassFees: builder.mutation<{ message: string; created_count: number }, BulkClassFeeCreate>({
      query: (body) => ({
        url: 'finance-extended/class-fees/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ClassFee'],
    }),

    // Student Lookup
    searchStudents: builder.query<StudentLookup[], string>({
      query: (q) => ({
        url: 'finance-extended/lookup/students',
        params: { q },
      }),
    }),
    searchTeachers: builder.query<TeacherLookup[], string>({
      query: (q) => ({
        url: 'finance-extended/lookup/teachers',
        params: { q },
      }),
    }),

    // Student Fee Management
    assignFeesToStudent: builder.mutation<{ message: string; structures_created: number }, { student_id: string; body: StudentFeeAssignment }>({
      query: ({ student_id, body }) => ({
        url: `finance-extended/students/${student_id}/assign-fees`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StudentFee'],
    }),
    bulkAssignFeesToClass: builder.mutation<any, { class_id: string; body: { academic_year: string; create_installments?: boolean; installment_type?: string } }>({
      query: ({ class_id, body }) => ({
        url: `finance-extended/classes/${class_id}/assign-fees-bulk`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StudentFee'],
    }),
    getStudentLedger: builder.query<StudentLedger, { student_id: string; academic_year?: string }>({
      query: ({ student_id, academic_year }) => ({
        url: `finance-extended/students/${student_id}/ledger`,
        params: { academic_year },
      }),
      providesTags: ['StudentFee'],
    }),
    getStudentOutstanding: builder.query<StudentOutstanding, string>({
      query: (student_id) => `finance-extended/students/${student_id}/outstanding`,
      providesTags: ['StudentFee'],
    }),
    getStudentInstallments: builder.query<any[], string>({
      query: (student_id) => `finance-extended/students/${student_id}/installments`,
      providesTags: ['StudentFee'],
    }),

    // Payment with Allocation
    createPaymentWithAllocation: builder.mutation<Payment, PaymentCreateWithAllocations>({
      query: (body) => ({
        url: 'finance-extended/payments/with-allocation',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment', 'StudentFee', 'FinanceReport'],
    }),
    updatePayment: builder.mutation<Payment, { payment_id: string; body: any }>({
      query: ({ payment_id, body }) => ({
        url: `finance-extended/payments/${payment_id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Payment', 'StudentFee', 'FinanceReport'],
    }),
    downloadReceipt: builder.query<Blob, string>({
      query: (payment_id) => ({
        url: `finance-extended/payments/${payment_id}/receipt`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Fee Due Slips
    downloadFeeDueSlip: builder.query<Blob, { student_id: string; academic_year?: string }>({
      query: ({ student_id, academic_year }) => ({
        url: `finance-extended/students/${student_id}/fee-due-slip`,
        params: { academic_year },
        responseHandler: (response) => response.blob(),
      }),
    }),

    getBulkFeeDueList: builder.query<any[], { class_id?: string; min_outstanding?: number; academic_year?: string }>({
      query: (params) => ({
        url: 'finance-extended/students/fee-due-slips/bulk',
        params,
      }),
    }),

    // Print Settings
    getPrintSettings: builder.query<any, void>({
      query: () => 'finance-extended/print-settings',
      providesTags: ['PrintSettings' as any],
    }),
    updatePrintSettings: builder.mutation<any, any>({
      query: (body) => ({
        url: 'finance-extended/print-settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PrintSettings' as any],
    }),
    uploadPrintTemplate: builder.mutation<any, { doc_type: string; file: File }>({
      query: ({ doc_type, file }) => {
        const formData = new FormData();
        formData.append('doc_type', doc_type);
        formData.append('file', file);
        return { url: 'finance-extended/print-settings/upload-template', method: 'POST', body: formData };
      },
      invalidatesTags: ['PrintSettings' as any],
    }),
    removePrintTemplate: builder.mutation<any, string>({
      query: (doc_type) => ({
        url: `finance-extended/print-settings/upload-template/${doc_type}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PrintSettings' as any],
    }),

    // Bulk Operations
    bulkCreatePayments: builder.mutation<{ message: string; created_count: number }, BulkPaymentCreate>({
      query: (body) => ({
        url: 'finance-extended/payments/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment', 'StudentFee', 'FinanceReport'],
    }),
    bulkCreateConcessions: builder.mutation<{ message: string; created_count: number }, BulkConcessionCreate>({
      query: (body) => ({
        url: 'finance-extended/concessions/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Concession', 'StudentFee', 'FinanceReport'],
    }),

    // Reports
    getCollectionSummary: builder.query<any, { academic_year: string; start_date?: string; end_date?: string }>({
      query: (params) => ({
        url: 'reports/finance/collection-summary',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),
    getDefaultersReport: builder.query<any, { academic_year: string; min_outstanding?: number; include_overdue_only?: boolean; include_transport_fees?: boolean }>({
      query: (params) => ({
        url: 'reports/finance/defaulters',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),
    getFundWiseCollection: builder.query<any, { fund_id: string; start_date: string; end_date: string }>({
      query: (params) => ({
        url: 'reports/finance/fund-wise-collection',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),
    getClassWiseCollection: builder.query<any, { academic_year: string; start_date?: string; end_date?: string }>({
      query: (params) => ({
        url: 'reports/finance/class-wise-collection',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),
    getDailyCollection: builder.query<any, { collection_date: string }>({
      query: (params) => ({
        url: 'reports/finance/daily-collection',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),
    getDailyExpenditure: builder.query<any, { expenditure_date: string }>({
      query: (params) => ({
        url: 'reports/finance/daily-expenditure',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),
    getInstallmentStatus: builder.query<any, { academic_year: string }>({
      query: (params) => ({
        url: 'reports/finance/installment-status',
        params,
      }),
      providesTags: ['FinanceReport'],
    }),

    // All Students Outstanding
    getAllStudentOutstanding: builder.query<any[], { class_id?: string; academic_year?: string }>({
      query: (params) => ({
        url: 'finance-extended/students/all-outstanding',
        params,
      }),
      providesTags: ['StudentFee'],
    }),
  }),
});

export const {
  // Fund hooks
  useGetFundsQuery,
  useCreateFundMutation,
  useUpdateFundMutation,
  useDeleteFundMutation,
  // Fee hooks
  useGetFeesQuery,
  useCreateFeeMutation,
  useUpdateFeeMutation,
  useDeleteFeeMutation,
  // Payment hooks
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  // Concession hooks
  useGetConcessionsQuery,
  useCreateConcessionMutation,
  useDeleteConcessionMutation,
  // Salary hooks
  useGetSalariesQuery,
  useCreateSalaryMutation,
  useDeleteSalaryMutation,
  // ClassFee hooks
  useGetClassFeesQuery,
  useCreateClassFeeMutation,
  useUpdateClassFeeMutation,
  useDeleteClassFeeMutation,
  useBulkCreateClassFeesMutation,
  // Lookup hooks
  useSearchStudentsQuery,
  useLazySearchStudentsQuery,
  useSearchTeachersQuery,
  useLazySearchTeachersQuery,
  // Student Fee hooks
  useAssignFeesToStudentMutation,
  useBulkAssignFeesToClassMutation,
  useGetStudentLedgerQuery,
  useLazyGetStudentLedgerQuery,
  useGetStudentOutstandingQuery,
  useGetStudentInstallmentsQuery,
  // Payment with allocation
  useCreatePaymentWithAllocationMutation,
  useUpdatePaymentMutation,
  useLazyDownloadReceiptQuery,
  // Fee due slips
  useLazyDownloadFeeDueSlipQuery,
  useGetBulkFeeDueListQuery,
  // Bulk operations
  useBulkCreatePaymentsMutation,
  useBulkCreateConcessionsMutation,
  // Reports
  useGetCollectionSummaryQuery,
  useGetDefaultersReportQuery,
  useGetFundWiseCollectionQuery,
  useGetClassWiseCollectionQuery,
  useGetDailyCollectionQuery,
  useGetDailyExpenditureQuery,
  useGetInstallmentStatusQuery,
  // All students outstanding
  useGetAllStudentOutstandingQuery,
  // Print settings
  useGetPrintSettingsQuery,
  useUpdatePrintSettingsMutation,
  useUploadPrintTemplateMutation,
  useRemovePrintTemplateMutation,
} = financeApi;