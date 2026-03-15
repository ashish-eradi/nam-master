import React, { useState } from 'react';
import { Card, List, Typography, Button, Modal, Form, Input, Select, Tag, Badge, Empty, Spin, message as antdMessage } from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useGetMyMessagesQuery, useSendMessageMutation, useMarkMessageReadMutation } from '../services/messagesApi';
import moment from 'moment';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Messages: React.FC = () => {
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: messages, isLoading } = useGetMyMessagesQuery({ limit: 100 });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [markAsRead] = useMarkMessageReadMutation();

  const handleSendMessage = async (values: any) => {
    try {
      await sendMessage(values).unwrap();
      antdMessage.success('Message sent successfully!');
      setIsComposeModalOpen(false);
      form.resetFields();
    } catch (error: any) {
      antdMessage.error(error?.data?.detail || 'Failed to send message');
    }
  };

  const handleMessageClick = async (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      try {
        await markAsRead(msg.id).unwrap();
      } catch {
        // Silently ignore read-marking failures
      }
    }
  };

  const unreadCount = messages?.filter((msg) => !msg.is_read).length || 0;

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerBanner}>
        <div style={styles.headerContent}>
          <Title level={2} style={styles.headerTitle}>
            Messages
          </Title>
          <Text style={styles.headerSubtitle}>
            Communicate with teachers and school administration
          </Text>
        </div>
      </div>

      {/* Compose Button & Stats */}
      <Card style={{ ...styles.card, marginBottom: '24px' }}>
        <div style={styles.actionBar}>
          <div style={styles.statsContainer}>
            <Badge count={unreadCount} offset={[10, 0]}>
              <div style={styles.statItem}>
                <MessageOutlined style={styles.statIcon} />
                <div>
                  <Text strong style={styles.statValue}>{messages?.length || 0}</Text>
                  <Text type="secondary" style={styles.statLabel}>Total Messages</Text>
                </div>
              </div>
            </Badge>
            <div style={styles.statItem}>
              <MessageOutlined style={{ ...styles.statIcon, color: '#f59e0b' }} />
              <div>
                <Text strong style={styles.statValue}>{unreadCount}</Text>
                <Text type="secondary" style={styles.statLabel}>Unread</Text>
              </div>
            </div>
          </div>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setIsComposeModalOpen(true)}
            size="large"
            style={styles.composeButton}
          >
            Compose Message
          </Button>
        </div>
      </Card>

      {/* Messages List */}
      <Card
        style={styles.card}
        title={
          <div style={styles.cardHeader}>
            <MessageOutlined style={styles.cardHeaderIcon} />
            <span>Inbox</span>
          </div>
        }
      >
        {messages && messages.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={messages}
            renderItem={(msg: any) => (
              <List.Item
                style={{
                  ...styles.messageItem,
                  background: msg.is_read ? 'transparent' : '#f0f9ff',
                  cursor: 'pointer',
                }}
                onClick={() => handleMessageClick(msg)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      ...styles.avatar,
                      background: msg.is_read ? '#e5e7eb' : '#3b82f6',
                    }}>
                      <UserOutlined style={{ color: msg.is_read ? '#6b7280' : 'white' }} />
                    </div>
                  }
                  title={
                    <div style={styles.messageHeader}>
                      <Text strong style={{ fontSize: '1rem' }}>{msg.subject}</Text>
                      {!msg.is_read && <Tag color="blue">New</Tag>}
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary">
                        From: {msg.sender?.full_name} ({msg.sender?.role})
                      </Text>
                      <div style={{ marginTop: '4px' }}>
                        <Text ellipsis style={{ color: '#64748b' }}>
                          {msg.body?.substring(0, 100)}
                          {msg.body?.length > 100 && '...'}
                        </Text>
                      </div>
                    </div>
                  }
                />
                <div style={styles.messageTime}>
                  <ClockCircleOutlined style={{ marginRight: '4px' }} />
                  {moment(msg.created_at).fromNow()}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No messages yet"
          />
        )}
      </Card>

      {/* Compose Message Modal */}
      <Modal
        title={
          <div style={styles.modalHeader}>
            <SendOutlined style={{ marginRight: '8px', color: '#4f46e5' }} />
            Compose Message
          </div>
        }
        open={isComposeModalOpen}
        onCancel={() => {
          setIsComposeModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSendMessage}
        >
          <Form.Item
            name="recipient_id"
            label="Send To"
            rules={[{ required: true, message: 'Please select a recipient' }]}
          >
            <Select
              placeholder="Select teacher or admin"
              size="large"
            >
              <Option value="teacher1">Class Teacher</Option>
              <Option value="principal">Principal</Option>
              <Option value="admin">School Admin</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter a subject' }]}
          >
            <Input
              placeholder="Enter message subject"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="body"
            label="Message"
            rules={[{ required: true, message: 'Please enter your message' }]}
          >
            <TextArea
              rows={6}
              placeholder="Type your message here..."
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsComposeModalOpen(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={isSending}
              >
                Send Message
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Message Modal */}
      <Modal
        title={
          <div style={styles.modalHeader}>
            <MessageOutlined style={{ marginRight: '8px', color: '#4f46e5' }} />
            Message Details
          </div>
        }
        open={!!selectedMessage}
        onCancel={() => setSelectedMessage(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedMessage(null)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedMessage && (
          <div>
            <div style={styles.messageDetailHeader}>
              <div>
                <Text strong style={{ fontSize: '1.1rem' }}>{selectedMessage.subject}</Text>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">
                    From: <Text strong>{selectedMessage.sender?.full_name}</Text> ({selectedMessage.sender?.role})
                  </Text>
                </div>
                <div>
                  <Text type="secondary">
                    <ClockCircleOutlined style={{ marginRight: '4px' }} />
                    {moment(selectedMessage.created_at).format('MMM DD, YYYY [at] h:mm A')}
                  </Text>
                </div>
              </div>
            </div>
            <div style={styles.messageBody}>
              <Paragraph>{selectedMessage.body}</Paragraph>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    marginLeft: '260px',
    minHeight: 'calc(100vh - 72px)',
    background: '#f8fafc',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '1rem',
  },
  headerBanner: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
    borderRadius: '20px',
    padding: '32px 40px',
    marginBottom: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  headerTitle: {
    color: 'white',
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '8px',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1rem',
    margin: 0,
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  cardHeaderIcon: {
    color: '#8b5cf6',
    fontSize: '18px',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  statsContainer: {
    display: 'flex',
    gap: '32px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statIcon: {
    fontSize: '32px',
    color: '#4f46e5',
  },
  statValue: {
    fontSize: '1.5rem',
    display: 'block',
  },
  statLabel: {
    fontSize: '0.85rem',
    display: 'block',
  },
  composeButton: {
    background: '#4f46e5',
    borderColor: '#4f46e5',
  },
  messageItem: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  messageTime: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  modalHeader: {
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  messageDetailHeader: {
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '16px',
  },
  messageBody: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    minHeight: '150px',
  },
};

export default Messages;
