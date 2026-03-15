import React, { useState } from 'react';
import { Tabs, Card, List, Button, Modal, Form, Input, Select, Badge, Avatar, Typography, Space, Empty, message as antMessage, Tag } from 'antd';
import {
  InboxOutlined,
  SendOutlined,
  MailOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  useGetMessagesQuery,
  useGetSentMessagesQuery,
  useCreateMessageMutation,
  useMarkMessageAsReadMutation,
  type Message,
  type MessageCreate,
} from '../services/messagesApi';
import { useGetTeachersQuery } from '../services/teachersApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import moment from 'moment';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Text, Paragraph } = Typography;

const Messages: React.FC = () => {
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [form] = Form.useForm();

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: inboxMessages, isLoading: inboxLoading } = useGetMessagesQuery();
  const { data: sentMessages, isLoading: sentLoading } = useGetSentMessagesQuery();
  const { data: teachers } = useGetTeachersQuery();

  const [createMessage, { isLoading: sending }] = useCreateMessageMutation();
  const [markAsRead] = useMarkMessageAsReadMutation();

  const unreadCount = inboxMessages?.filter(msg => !msg.is_read).length || 0;

  const handleCompose = () => {
    form.resetFields();
    setIsComposeModalOpen(true);
  };

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      const messageData: MessageCreate = {
        recipient_id: values.recipient_id,
        subject: values.subject,
        content: values.content,
      };
      await createMessage(messageData).unwrap();
      antMessage.success('Message sent successfully!');
      setIsComposeModalOpen(false);
      form.resetFields();
    } catch (error: any) {
      antMessage.error(error?.data?.detail || 'Failed to send message');
    }
  };

  const handleViewMessage = async (msg: Message) => {
    setSelectedMessage(msg);
    setIsViewModalOpen(true);

    // Mark as read if it's an inbox message and unread
    if (!msg.is_read && msg.recipient_id === currentUser?.id) {
      try {
        await markAsRead(msg.id).unwrap();
      } catch {
        // Silently ignore read-marking failures
      }
    }
  };

  const renderMessageList = (messages: Message[] | undefined, type: 'inbox' | 'sent') => {
    if (!messages || messages.length === 0) {
      return (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={type === 'inbox' ? 'No messages in inbox' : 'No sent messages'}
          />
        </Card>
      );
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={messages}
        loading={type === 'inbox' ? inboxLoading : sentLoading}
        renderItem={(item: Message) => {
          const isUnread = type === 'inbox' && !item.is_read;
          const displayUser = type === 'inbox' ? item.sender : item.recipient;
          const displayName = displayUser?.full_name || displayUser?.email || 'Unknown User';

          return (
            <Card
              hoverable
              style={{
                marginBottom: 12,
                backgroundColor: isUnread ? '#f0f9ff' : 'white',
                border: isUnread ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              }}
              onClick={() => handleViewMessage(item)}
            >
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Badge dot={isUnread} offset={[-5, 5]}>
                      <Avatar
                        icon={<UserOutlined />}
                        style={{
                          backgroundColor: isUnread ? '#3b82f6' : '#94a3b8',
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <Space>
                      <span style={{ fontWeight: isUnread ? 700 : 500 }}>
                        {type === 'inbox' ? 'From:' : 'To:'} {displayName}
                      </span>
                      {isUnread && <Tag color="blue">New</Tag>}
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ fontWeight: isUnread ? 600 : 400, marginBottom: 4 }}>
                        {item.subject || '(No subject)'}
                      </div>
                      <Paragraph
                        ellipsis={{ rows: 1 }}
                        style={{ margin: 0, color: '#64748b' }}
                      >
                        {item.content}
                      </Paragraph>
                      <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#94a3b8' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {moment(item.created_at).format('DD MMM YYYY, hh:mm A')}
                      </div>
                    </div>
                  }
                />
                <MailOutlined style={{ fontSize: 20, color: isUnread ? '#3b82f6' : '#94a3b8' }} />
              </List.Item>
            </Card>
          );
        }}
      />
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Messages</h2>
          <p style={{ color: '#666', marginTop: 4 }}>Internal messaging system</p>
        </div>
        <Button type="primary" icon={<EditOutlined />} onClick={handleCompose}>
          Compose Message
        </Button>
      </div>

      <Tabs defaultActiveKey="inbox">
        <TabPane
          tab={
            <span>
              <InboxOutlined />
              Inbox {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 8 }} />}
            </span>
          }
          key="inbox"
        >
          {renderMessageList(inboxMessages, 'inbox')}
        </TabPane>
        <TabPane
          tab={
            <span>
              <SendOutlined />
              Sent
            </span>
          }
          key="sent"
        >
          {renderMessageList(sentMessages, 'sent')}
        </TabPane>
      </Tabs>

      {/* Compose Modal */}
      <Modal
        title="Compose Message"
        open={isComposeModalOpen}
        onOk={handleSend}
        onCancel={() => setIsComposeModalOpen(false)}
        okText="Send"
        confirmLoading={sending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="recipient_id"
            label="To"
            rules={[{ required: true, message: 'Please select a recipient' }]}
          >
            <Select
              showSearch
              placeholder="Select recipient"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {teachers?.map((teacher: any) => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.first_name + ' ' + teacher.last_name} ({teacher.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter a subject' }]}
          >
            <Input placeholder="Enter message subject" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="content"
            label="Message"
            rules={[{ required: true, message: 'Please enter message content' }]}
          >
            <TextArea
              rows={6}
              placeholder="Type your message here..."
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Message Modal */}
      <Modal
        title={selectedMessage?.subject || '(No subject)'}
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedMessage && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>From: </Text>
                <Text>
                  {selectedMessage.sender?.full_name || selectedMessage.sender?.email || 'Unknown'}
                </Text>
              </div>
              <div>
                <Text strong>To: </Text>
                <Text>
                  {selectedMessage.recipient?.full_name || selectedMessage.recipient?.email || 'Unknown'}
                </Text>
              </div>
              <div>
                <Text strong>Date: </Text>
                <Text>{moment(selectedMessage.created_at).format('DD MMM YYYY, hh:mm A')}</Text>
              </div>
              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: 16,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedMessage.content}
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Messages;
