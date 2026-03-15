import { api } from './baseApi';

// SMS Template Types
export interface SMSTemplate {
  id: string;
  school_id: string;
  name: string;
  notification_type: string;
  message_template: string;
  is_active: boolean;
  created_by_user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface SMSTemplateCreate {
  school_id: string;
  name: string;
  notification_type: string;
  message_template: string;
  is_active?: boolean;
}

export interface SMSTemplateUpdate {
  name?: string;
  message_template?: string;
  is_active?: boolean;
}

// SMS Notification Types
export interface SMSRecipient {
  phone: string;
  name?: string;
  student_id?: string;
  variables?: Record<string, any>;
}

export interface SendSMSRequest {
  school_id: string;
  notification_type: string;
  message?: string;
  template_id?: string;
  recipients: SMSRecipient[];
}

export interface BulkSMSRequest {
  school_id: string;
  notification_type: string;
  message?: string;
  template_id?: string;
  class_id?: string;
}

export interface SMSSendResponse {
  total_sent: number;
  total_failed: number;
  failed_numbers: string[];
  message: string;
}

export interface SMSNotification {
  id: string;
  school_id: string;
  recipient_phone: string;
  recipient_name?: string;
  student_id?: string;
  message: string;
  notification_type: string;
  status: string;
  error_message?: string;
  sent_by_user_id?: string;
  sent_at?: string;
  created_at: string;
}

export interface SMSNotificationWithStudent extends SMSNotification {
  student_name?: string;
  admission_number?: string;
  class_name?: string;
}

export interface SMSStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // SMS Templates
    listSMSTemplates: builder.query<SMSTemplate[], { notification_type?: string; is_active?: boolean }>({
      query: (params) => ({
        url: 'notifications/sms/templates',
        params,
      }),
      providesTags: ['Notification'],
    }),

    createSMSTemplate: builder.mutation<SMSTemplate, SMSTemplateCreate>({
      query: (body) => ({
        url: 'notifications/sms/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    updateSMSTemplate: builder.mutation<SMSTemplate, { id: string; body: SMSTemplateUpdate }>({
      query: ({ id, body }) => ({
        url: `notifications/sms/templates/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    deleteSMSTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `notifications/sms/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),

    // SMS Sending
    sendSMS: builder.mutation<SMSSendResponse, SendSMSRequest>({
      query: (body) => ({
        url: 'notifications/sms/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    sendBulkSMS: builder.mutation<SMSSendResponse, BulkSMSRequest>({
      query: (body) => ({
        url: 'notifications/sms/send-bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    // SMS History
    getSMSHistory: builder.query<SMSNotificationWithStudent[], {
      notification_type?: string;
      status?: string;
      student_id?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params) => ({
        url: 'notifications/sms/history',
        params,
      }),
      providesTags: ['Notification'],
    }),

    getSMSStats: builder.query<SMSStats, void>({
      query: () => 'notifications/sms/stats',
      providesTags: ['Notification'],
    }),
  }),
});

export const {
  useListSMSTemplatesQuery,
  useCreateSMSTemplateMutation,
  useUpdateSMSTemplateMutation,
  useDeleteSMSTemplateMutation,
  useSendSMSMutation,
  useSendBulkSMSMutation,
  useGetSMSHistoryQuery,
  useGetSMSStatsQuery,
} = notificationsApi;
