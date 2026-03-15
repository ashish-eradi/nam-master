import { api } from './api';

export const hostelApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Hostels
    getHostels: builder.query<any[], void>({
      query: () => 'hostel',
      providesTags: ['Hostel'],
    }),
    createHostel: builder.mutation<any, any>({
      query: (body) => ({
        url: 'hostel',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Hostel'],
    }),
    updateHostel: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `hostel/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Hostel'],
    }),
    deleteHostel: builder.mutation<void, string>({
      query: (id) => ({
        url: `hostel/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Hostel'],
    }),

    // Rooms
    getHostelRooms: builder.query<any[], string>({
      query: (hostelId) => `hostel/${hostelId}/rooms`,
      providesTags: ['HostelRoom'],
    }),
    createHostelRoom: builder.mutation<any, any>({
      query: (body) => ({
        url: 'hostel/rooms',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelRoom'],
    }),
    updateHostelRoom: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `hostel/rooms/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['HostelRoom'],
    }),
    deleteHostelRoom: builder.mutation<void, string>({
      query: (id) => ({
        url: `hostel/rooms/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['HostelRoom'],
    }),

    // All active allocations for the school
    getAllAllocations: builder.query<any[], void>({
      query: () => 'hostel/allocations',
      providesTags: ['HostelAllocation'],
    }),

    // Allocations
    allocateStudent: builder.mutation<any, any>({
      query: (body) => ({
        url: 'hostel/allocate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAllocation', 'HostelRoom'],
    }),
    vacateStudent: builder.mutation<any, string>({
      query: (allocationId) => ({
        url: `hostel/vacate/${allocationId}`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelAllocation', 'HostelRoom'],
    }),
    getStudentAllocation: builder.query<any, string>({
        query: (studentId) => `hostel/student/${studentId}/allocation`,
        providesTags: ['HostelAllocation'],
    }),

    // Assign hostel fee to student
    assignHostelFeeToStudent: builder.mutation<any, { studentId: string; body: any }>({
      query: ({ studentId, body }) => ({
        url: `hostel/students/${studentId}/assign-fee`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAllocation'],
    }),

    // Hostel Fees
    getHostelFees: builder.query<any[], void>({
      query: () => 'hostel/fees',
      providesTags: ['HostelFee'],
    }),
    createHostelFee: builder.mutation<any, any>({
      query: (body) => ({ url: 'hostel/fees', method: 'POST', body }),
      invalidatesTags: ['HostelFee'],
    }),
    updateHostelFee: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `hostel/fees/${id}`, method: 'PUT', body }),
      invalidatesTags: ['HostelFee'],
    }),
    deleteHostelFee: builder.mutation<void, string>({
      query: (id) => ({ url: `hostel/fees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['HostelFee'],
    }),
  }),
});

export const {
  useGetHostelsQuery, useCreateHostelMutation, useUpdateHostelMutation, useDeleteHostelMutation,
  useGetHostelRoomsQuery, useCreateHostelRoomMutation, useUpdateHostelRoomMutation, useDeleteHostelRoomMutation,
  useGetAllAllocationsQuery, useAllocateStudentMutation, useVacateStudentMutation, useGetStudentAllocationQuery,
  useAssignHostelFeeToStudentMutation,
  useGetHostelFeesQuery, useCreateHostelFeeMutation, useUpdateHostelFeeMutation, useDeleteHostelFeeMutation
} = hostelApi;
