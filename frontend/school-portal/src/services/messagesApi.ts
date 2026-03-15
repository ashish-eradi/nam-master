import { api } from './api';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    full_name?: string;
    email: string;
  };
  recipient?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface MessageCreate {
  recipient_id: string;
  subject?: string;
  content: string;
}

export const messagesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<Message[], void>({
      query: () => 'messages',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Message' as const, id })), { type: 'Message', id: 'LIST' }]
          : [{ type: 'Message', id: 'LIST' }],
    }),
    getSentMessages: builder.query<Message[], void>({
      query: () => 'messages/sent',
      providesTags: [{ type: 'Message', id: 'SENT' }],
    }),
    createMessage: builder.mutation<Message, MessageCreate>({
      query: (body) => ({
        url: 'messages',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Message', id: 'LIST' }, { type: 'Message', id: 'SENT' }],
    }),
    markMessageAsRead: builder.mutation<Message, string>({
      query: (id) => ({
        url: `messages/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Message', id }, { type: 'Message', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useGetSentMessagesQuery,
  useCreateMessageMutation,
  useMarkMessageAsReadMutation,
} = messagesApi;
