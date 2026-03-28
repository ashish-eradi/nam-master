import { api } from './baseApi';

// ── Credential Types ──────────────────────────────────────────────────────────

export interface WhatsAppCredential {
  id: string;
  school_id: string;
  phone_number_id: string;
  waba_id: string;
  display_name?: string;
  is_active: boolean;
  connected_at?: string;
}

export interface WhatsAppCredentialCreate {
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  display_name?: string;
}

// ── Template Types ────────────────────────────────────────────────────────────

export interface WhatsAppTemplate {
  id: string;
  school_id: string;
  name: string;
  notification_type: string;
  message_template: string;
  is_active: boolean;
  meta_template_name?: string;
  meta_template_language?: string;
  created_by_user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface WhatsAppTemplateCreate {
  name: string;
  notification_type: string;
  message_template: string;
  is_active?: boolean;
  meta_template_name?: string;
  meta_template_language?: string;
}

export interface WhatsAppTemplateUpdate {
  name?: string;
  message_template?: string;
  is_active?: boolean;
  meta_template_name?: string;
  meta_template_language?: string;
}

// ── Send Types ────────────────────────────────────────────────────────────────

export interface WhatsAppRecipient {
  phone: string;
  name?: string;
  student_id?: string;
  variables?: Record<string, string>;
  meta_template_params?: string[];
}

export interface SendWhatsAppRequest {
  school_id: string;
  notification_type: string;
  message?: string;
  template_id?: string;
  recipients: WhatsAppRecipient[];
  meta_template_name?: string;
  meta_template_language?: string;
  meta_template_params?: string[];
}

export interface BulkWhatsAppRequest {
  school_id: string;
  notification_type: string;
  message?: string;
  template_id?: string;
  class_id?: string;
  meta_template_name?: string;
  meta_template_language?: string;
  meta_template_params?: string[];
}

export interface WhatsAppSendResponse {
  total_sent: number;
  total_failed: number;
  failed_numbers: string[];
  message: string;
}

// ── Notification (log) Types ──────────────────────────────────────────────────

export interface WhatsAppNotification {
  id: string;
  school_id: string;
  recipient_phone: string;
  recipient_name?: string;
  student_id?: string;
  message: string;
  notification_type: string;
  /** pending | sent | delivered | read | failed */
  status: string;
  error_message?: string;
  meta_message_id?: string;
  sent_by_user_id?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface WhatsAppNotificationWithStudent extends WhatsAppNotification {
  student_name?: string;
  admission_number?: string;
  class_name?: string;
}

export interface WhatsAppStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

// ── Backward-compat SMS aliases ───────────────────────────────────────────────

export type SMSTemplate = WhatsAppTemplate;
export type SMSTemplateCreate = WhatsAppTemplateCreate;
export type SMSTemplateUpdate = WhatsAppTemplateUpdate;
export type SMSRecipient = WhatsAppRecipient;
export type SendSMSRequest = SendWhatsAppRequest;
export type BulkSMSRequest = BulkWhatsAppRequest;
export type SMSSendResponse = WhatsAppSendResponse;
export type SMSNotification = WhatsAppNotification;
export type SMSNotificationWithStudent = WhatsAppNotificationWithStudent;
export type SMSStats = WhatsAppStats;

// ── RTK Query endpoints ───────────────────────────────────────────────────────

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Credentials (Embedded Signup)
    getWhatsAppCredentials: builder.query<WhatsAppCredential, void>({
      query: () => 'notifications/whatsapp/credentials',
      providesTags: ['Notification'],
    }),
    saveWhatsAppCredentials: builder.mutation<WhatsAppCredential, WhatsAppCredentialCreate>({
      query: (body) => ({ url: 'notifications/whatsapp/credentials', method: 'POST', body }),
      invalidatesTags: ['Notification'],
    }),
    disconnectWhatsApp: builder.mutation<void, void>({
      query: () => ({ url: 'notifications/whatsapp/credentials', method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),

    // Templates
    listWhatsAppTemplates: builder.query<WhatsAppTemplate[], { notification_type?: string; is_active?: boolean }>({
      query: (params) => ({ url: 'notifications/whatsapp/templates', params }),
      providesTags: ['Notification'],
    }),
    createWhatsAppTemplate: builder.mutation<WhatsAppTemplate, WhatsAppTemplateCreate>({
      query: (body) => ({ url: 'notifications/whatsapp/templates', method: 'POST', body }),
      invalidatesTags: ['Notification'],
    }),
    updateWhatsAppTemplate: builder.mutation<WhatsAppTemplate, { id: string; body: WhatsAppTemplateUpdate }>({
      query: ({ id, body }) => ({ url: `notifications/whatsapp/templates/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Notification'],
    }),
    deleteWhatsAppTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `notifications/whatsapp/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),

    // Sending
    sendWhatsApp: builder.mutation<WhatsAppSendResponse, SendWhatsAppRequest>({
      query: (body) => ({ url: 'notifications/whatsapp/send', method: 'POST', body }),
      invalidatesTags: ['Notification'],
    }),
    sendBulkWhatsApp: builder.mutation<WhatsAppSendResponse, BulkWhatsAppRequest>({
      query: (body) => ({ url: 'notifications/whatsapp/send-bulk', method: 'POST', body }),
      invalidatesTags: ['Notification'],
    }),

    // History & Stats
    getWhatsAppHistory: builder.query<WhatsAppNotificationWithStudent[], {
      notification_type?: string;
      status?: string;
      student_id?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params) => ({ url: 'notifications/whatsapp/history', params }),
      providesTags: ['Notification'],
    }),
    getWhatsAppStats: builder.query<WhatsAppStats, void>({
      query: () => 'notifications/whatsapp/stats',
      providesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetWhatsAppCredentialsQuery,
  useSaveWhatsAppCredentialsMutation,
  useDisconnectWhatsAppMutation,
  useListWhatsAppTemplatesQuery,
  useCreateWhatsAppTemplateMutation,
  useUpdateWhatsAppTemplateMutation,
  useDeleteWhatsAppTemplateMutation,
  useSendWhatsAppMutation,
  useSendBulkWhatsAppMutation,
  useGetWhatsAppHistoryQuery,
  useGetWhatsAppStatsQuery,
} = notificationsApi;
