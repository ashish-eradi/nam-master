import React, { useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, List, Tag, Space, Empty, message, Popconfirm, Avatar, Typography } from 'antd';
import {
  PlusOutlined,
  NotificationOutlined,
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useGetAnnouncementsQuery, useCreateAnnouncementMutation, useUpdateAnnouncementMutation, useDeleteAnnouncementMutation } from '../services/announcementsApi';
import type { Announcement } from '../services/announcementsApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

const priorityColors: { [key: string]: string } = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'green',
  NORMAL: 'blue',
};

const Announcements: React.FC = () => {
  const { data: announcements, isLoading } = useGetAnnouncementsQuery();
  const [createAnnouncement] = useCreateAnnouncementMutation();
  const [updateAnnouncement] = useUpdateAnnouncementMutation();
  const [deleteAnnouncement] = useDeleteAnnouncementMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [form] = Form.useForm();

  const { school_id: schoolId, id: userId, full_name: userName } = useSelector(
    (state: RootState) => state.auth.user || {}
  );

  const showModal = (announcement: Announcement | null = null) => {
    setEditingAnnouncement(announcement);
    if (announcement) {
      form.setFieldsValue({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority || 'NORMAL',
        target_audience: announcement.target_audience || 'ALL',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ priority: 'NORMAL', target_audience: 'ALL' });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingAnnouncement(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const announcementData = {
        ...values,
        school_id: schoolId,
        created_by_user_id: userId,
      };

      if (editingAnnouncement) {
        await updateAnnouncement({ id: editingAnnouncement.id, body: announcementData }).unwrap();
        message.success('Announcement updated successfully!');
      } else {
        await createAnnouncement(announcementData).unwrap();
        message.success('Announcement created successfully!');
      }
      handleCancel();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id).unwrap();
      message.success('Announcement deleted successfully!');
    } catch {
      message.error('Failed to delete announcement');
    }
  };

  const getPriorityTag = (priority: string) => {
    const color = priorityColors[priority] || 'blue';
    return <Tag color={color}>{priority}</Tag>;
  };

  const getTargetAudienceTag = (audience: string) => {
    const labels: { [key: string]: { label: string; color: string } } = {
      ALL: { label: 'Everyone', color: 'purple' },
      TEACHERS: { label: 'Teachers Only', color: 'cyan' },
      STUDENTS: { label: 'Students Only', color: 'geekblue' },
      PARENTS: { label: 'Parents Only', color: 'magenta' },
    };
    const config = labels[audience] || { label: audience, color: 'default' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Announcements</h2>
          <p style={{ color: '#666', marginTop: 4 }}>Create and manage school announcements</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          New Announcement
        </Button>
      </div>

      {announcements && announcements.length > 0 ? (
        <List
          itemLayout="vertical"
          dataSource={announcements}
          loading={isLoading}
          pagination={{ pageSize: 5 }}
          renderItem={(item: Announcement) => (
            <Card
              style={{ marginBottom: 16 }}
              actions={[
                <Button type="text" icon={<EditOutlined />} onClick={() => showModal(item)}>
                  Edit
                </Button>,
                <Popconfirm
                  title="Are you sure you want to delete this announcement?"
                  onConfirm={() => handleDelete(item.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size={48}
                    style={{ backgroundColor: '#1890ff' }}
                    icon={<NotificationOutlined />}
                  />
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{item.title}</span>
                    {item.priority && getPriorityTag(item.priority)}
                    {item.target_audience && getTargetAudienceTag(item.target_audience)}
                  </div>
                }
                description={
                  <Space size="middle">
                    <span>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {item.created_at ? moment(item.created_at).format('DD MMM YYYY, hh:mm A') : 'N/A'}
                    </span>
                    <span>
                      <UserOutlined style={{ marginRight: 4 }} />
                      {item.created_by_name || 'Admin'}
                    </span>
                  </Space>
                }
              />
              <Paragraph style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
                {item.content}
              </Paragraph>
            </Card>
          )}
        />
      ) : (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No announcements yet"
          >
            <Button type="primary" onClick={() => showModal()}>
              Create First Announcement
            </Button>
          </Empty>
        </Card>
      )}

      <Modal
        title={editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={editingAnnouncement ? 'Update' : 'Create'}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter announcement title' }]}
          >
            <Input placeholder="Enter announcement title" maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please enter announcement content' }]}
          >
            <TextArea
              rows={6}
              placeholder="Enter announcement content..."
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item name="priority" label="Priority">
            <Select placeholder="Select priority">
              <Option value="LOW">
                <Tag color="green">Low</Tag> - General information
              </Option>
              <Option value="NORMAL">
                <Tag color="blue">Normal</Tag> - Regular announcement
              </Option>
              <Option value="MEDIUM">
                <Tag color="orange">Medium</Tag> - Important notice
              </Option>
              <Option value="HIGH">
                <Tag color="red">High</Tag> - Urgent / Critical
              </Option>
            </Select>
          </Form.Item>

          <Form.Item name="target_audience" label="Target Audience">
            <Select placeholder="Select target audience">
              <Option value="ALL">Everyone (All Users)</Option>
              <Option value="TEACHERS">Teachers Only</Option>
              <Option value="STUDENTS">Students Only</Option>
              <Option value="PARENTS">Parents Only</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Announcements;
