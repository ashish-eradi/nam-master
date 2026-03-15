import { api } from './api';

export interface Message {
  id: string;
  subject: string;
  body: string;
  sender: {
    id: string;
    full_name: string;
    role: string;
  };
  created_at: string;
  is_read: boolean;
}

export interface SendMessageRequest {
  recipient_id: string;
  subject: string;
  body: string;
}

export const messagesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get messages for parent
    getMyMessages: builder.query<Message[], { limit?: number; offset?: number }>({
      query: ({ limit = 50, offset = 0 }) => ({
        url: 'parents/me/messages',
        params: { limit, offset },
      }),
      providesTags: ['Messages'],
    }),

    // Send a message
    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: (body) => ({
        url: 'parents/me/messages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Messages'],
    }),

    // Mark message as read
    markMessageRead: builder.mutation<void, string>({
      query: (message_id) => ({
        url: `parents/me/messages/${message_id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Messages'],
    }),
  }),
});

export const {
  useGetMyMessagesQuery,
  useSendMessageMutation,
  useMarkMessageReadMutation,
} = messagesApi;
