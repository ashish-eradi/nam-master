import { api } from './api';

export interface ParentStudent {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  relationship_type: string;
}

export interface Parent {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  students: ParentStudent[];
  is_active: boolean;
  created_at?: string;
}

export interface ParentCreateRequest {
  email: string;
  password: string;
  full_name: string;
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  student_ids?: string[];
}

export interface ParentUpdateRequest {
  full_name?: string;
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface LinkStudentsRequest {
  parent_id: string;
  student_ids: string[];
  relationship_type?: string;
}

export interface ResetPasswordRequest {
  new_password: string;
}

export const parentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getParents: builder.query<Parent[], void>({
      query: () => 'parents/admin/list',
      providesTags: ['Parents'],
    }),
    createParent: builder.mutation<any, ParentCreateRequest>({
      query: (parent) => ({
        url: 'parents/admin/create',
        method: 'POST',
        body: parent,
      }),
      invalidatesTags: ['Parents'],
    }),
    updateParent: builder.mutation<any, { id: string; data: ParentUpdateRequest }>({
      query: ({ id, data }) => ({
        url: `parents/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Parents'],
    }),
    linkStudents: builder.mutation<any, LinkStudentsRequest>({
      query: (data) => ({
        url: 'parents/admin/link-students',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Parents'],
    }),
    unlinkStudent: builder.mutation<any, { parentId: string; studentId: string }>({
      query: ({ parentId, studentId }) => ({
        url: `parents/admin/unlink-student/${parentId}/${studentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Parents'],
    }),
    resetParentPassword: builder.mutation<any, { id: string; data: ResetPasswordRequest }>({
      query: ({ id, data }) => ({
        url: `parents/admin/${id}/reset-password`,
        method: 'POST',
        body: data,
      }),
    }),
    deleteParent: builder.mutation<any, string>({
      query: (id) => ({
        url: `parents/admin/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Parents'],
    }),
  }),
});

export const {
  useGetParentsQuery,
  useCreateParentMutation,
  useUpdateParentMutation,
  useLinkStudentsMutation,
  useUnlinkStudentMutation,
  useResetParentPasswordMutation,
  useDeleteParentMutation,
} = parentsApi;
