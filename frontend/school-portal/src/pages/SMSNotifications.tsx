import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Form, Input, Select, Modal, message, Space, Tag, Switch, Divider } from 'antd';
import { PlusOutlined, SendOutlined, EditOutlined, DeleteOutlined, MessageOutlined, HistoryOutlined, FileTextOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useListSMSTemplatesQuery,
  useCreateSMSTemplateMutation,
  useUpdateSMSTemplateMutation,
  useDeleteSMSTemplateMutation,
  useSendSMSMutation,
  useSendBulkSMSMutation,
  useGetSMSHistoryQuery,
  useGetSMSStatsQuery,
  type SMSTemplate,
  type SMSTemplateCreate,
  type SendSMSRequest,
  type BulkSMSRequest,
} from '../services/notificationsApi';
import { useLazySearchStudentsQuery } from '../services/financeApi';
import { useGetClassesQuery } from '../services/classesApi';
import type { RootState } from '../store/store';
import type { StudentLookup } from '../schemas/finance_schema';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const SMSNotifications: React.FC = () => {
  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});

  // Templates
  const { data: templates, isLoading: templatesLoading } = useListSMSTemplatesQuery({});
  const [createTemplate] = useCreateSMSTemplateMutation();
  const [updateTemplate] = useUpdateSMSTemplateMutation();
  const [deleteTemplate] = useDeleteSMSTemplateMutation();

  // Sending
  const [sendSMS] = useSendSMSMutation();
  const [sendBulkSMS] = useSendBulkSMSMutation();
  const [searchStudents] = useLazySearchStudentsQuery();

  // Classes
  const { data: classes } = useGetClassesQuery();

  // History & Stats
  const { data: smsHistory } = useGetSMSHistoryQuery({ limit: 100 });
  const { data: smsStats } = useGetSMSStatsQuery();

  // State
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [templateForm] = Form.useForm();

  const [isSendSMSModalVisible, setIsSendSMSModalVisible] = useState(false);
  const [sendSMSForm] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentLookup[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentLookup[]>([]);

  // Template Modal
  const showTemplateModal = (template: SMSTemplate | null = null) => {
    setEditingTemplate(template);
    if (template) {
      templateForm.setFieldsValue({
        name: template.name,
        notification_type: template.notification_type,
        message_template: template.message_template,
        is_active: template.is_active,
      });
    } else {
      templateForm.resetFields();
      templateForm.setFieldsValue({ is_active: true });
    }
    setIsTemplateModalVisible(true);
  };

  const handleTemplateSubmit = async () => {
    try {
      const values = await templateForm.validateFields();
      const templateData: SMSTemplateCreate = {
        school_id: schoolId!,
        name: values.name,
        notification_type: values.notification_type,
        message_template: values.message_template,
        is_active: values.is_active !== false,
      };

      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, body: values }).unwrap();
        message.success('Template updated successfully!');
      } else {
        await createTemplate(templateData).unwrap();
        message.success('Template created successfully!');
      }

      setIsTemplateModalVisible(false);
      templateForm.resetFields();
      setEditingTemplate(null);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id).unwrap();
      message.success('Template deleted successfully!');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to delete template');
    }
  };

  // Send SMS
  const showSendSMSModal = () => {
    sendSMSForm.resetFields();
    setSelectedStudents([]);
    setSearchResults([]);
    setSearchQuery('');
    setIsSendSMSModalVisible(true);
  };

  const handleStudentSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      message.warning('Please enter at least 2 characters');
      return;
    }

    try {
      const results = await searchStudents(searchQuery).unwrap();
      setSearchResults(results);
    } catch (error) {
      message.error('Search failed');
    }
  };

  const addStudent = (student: StudentLookup) => {
    if (!selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const handleSendSMS = async () => {
    try {
      const values = await sendSMSForm.validateFields();

      if (values.send_type === 'individual' && selectedStudents.length === 0) {
        message.error('Please select at least one student');
        return;
      }

      if (values.send_type === 'bulk') {
        const bulkData: BulkSMSRequest = {
          school_id: schoolId!,
          notification_type: values.notification_type,
          message: values.use_template ? undefined : values.message,
          template_id: values.use_template ? values.template_id : undefined,
          class_id: values.class_id,
        };

        const result = await sendBulkSMS(bulkData).unwrap();
        message.success(result.message);
      } else {
        const sendData: SendSMSRequest = {
          school_id: schoolId!,
          notification_type: values.notification_type,
          message: values.use_template ? undefined : values.message,
          template_id: values.use_template ? values.template_id : undefined,
          recipients: selectedStudents.map(student => ({
            phone: student.class_name, // Assuming mobile is in class_name field for demo
            name: student.full_name,
            student_id: student.id,
          })),
        };

        const result = await sendSMS(sendData).unwrap();
        message.success(result.message);
      }

      setIsSendSMSModalVisible(false);
      sendSMSForm.resetFields();
      setSelectedStudents([]);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to send SMS');
    }
  };

  const templateColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'notification_type',
      key: 'notification_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Message Template',
      dataIndex: 'message_template',
      key: 'message_template',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: SMSTemplate) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => showTemplateModal(record)}>
            Edit
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTemplate(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
      width: 180,
    },
    {
      title: 'Recipient',
      dataIndex: 'recipient_name',
      key: 'recipient_name',
    },
    {
      title: 'Phone',
      dataIndex: 'recipient_phone',
      key: 'recipient_phone',
    },
    {
      title: 'Type',
      dataIndex: 'notification_type',
      key: 'notification_type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'sent' ? 'green' : status === 'failed' ? 'red' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <h2>SMS Notifications</h2>

      {/* Stats Cards */}
      {smsStats && (
        <div style={{ marginBottom: 24 }}>
          <Space size="large">
            <Card style={{ width: 200 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                  {smsStats.total}
                </div>
                <div style={{ color: '#666' }}>Total SMS</div>
              </div>
            </Card>
            <Card style={{ width: 200 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                  {smsStats.sent}
                </div>
                <div style={{ color: '#666' }}>Sent</div>
              </div>
            </Card>
            <Card style={{ width: 200 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ff4d4f' }}>
                  {smsStats.failed}
                </div>
                <div style={{ color: '#666' }}>Failed</div>
              </div>
            </Card>
            <Card style={{ width: 200 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>
                  {smsStats.pending}
                </div>
                <div style={{ color: '#666' }}>Pending</div>
              </div>
            </Card>
          </Space>
        </div>
      )}

      <Tabs defaultActiveKey="send">
        {/* Send SMS Tab */}
        <TabPane tab={<span><SendOutlined /> Send SMS</span>} key="send">
          <Card>
            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={showSendSMSModal}
              size="large"
            >
              Compose & Send SMS
            </Button>
          </Card>
        </TabPane>

        {/* Templates Tab */}
        <TabPane tab={<span><FileTextOutlined /> Templates</span>} key="templates">
          <Card
            title="SMS Templates"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showTemplateModal()}>
                New Template
              </Button>
            }
          >
            <Table
              dataSource={templates}
              columns={templateColumns}
              rowKey="id"
              loading={templatesLoading}
            />
          </Card>
        </TabPane>

        {/* History Tab */}
        <TabPane tab={<span><HistoryOutlined /> History</span>} key="history">
          <Card title="SMS History">
            <Table
              dataSource={smsHistory}
              columns={historyColumns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Template Modal */}
      <Modal
        title={editingTemplate ? 'Edit SMS Template' : 'New SMS Template'}
        visible={isTemplateModalVisible}
        onCancel={() => {
          setIsTemplateModalVisible(false);
          templateForm.resetFields();
          setEditingTemplate(null);
        }}
        onOk={handleTemplateSubmit}
        width={700}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="e.g., Fee Reminder" />
          </Form.Item>

          <Form.Item
            name="notification_type"
            label="Notification Type"
            rules={[{ required: true, message: 'Please select notification type' }]}
          >
            <Select placeholder="Select type">
              <Option value="FEE_REMINDER">Fee Reminder</Option>
              <Option value="ATTENDANCE">Attendance</Option>
              <Option value="EXAM">Exam</Option>
              <Option value="ANNOUNCEMENT">Announcement</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="message_template"
            label="Message Template"
            rules={[{ required: true, message: 'Please enter message template' }]}
            help="Use {{student_name}} and {{admission_number}} as variables"
          >
            <TextArea
              rows={4}
              placeholder="Dear {{student_name}}, this is a reminder..."
            />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Send SMS Modal */}
      <Modal
        title="Send SMS"
        visible={isSendSMSModalVisible}
        onCancel={() => {
          setIsSendSMSModalVisible(false);
          sendSMSForm.resetFields();
          setSelectedStudents([]);
        }}
        onOk={handleSendSMS}
        width={800}
      >
        <Form form={sendSMSForm} layout="vertical" initialValues={{ send_type: 'bulk', use_template: false }}>
          <Form.Item name="send_type" label="Send Type" rules={[{ required: true }]}>
            <Select>
              <Option value="individual">Individual Students</Option>
              <Option value="bulk">Bulk (Entire Class or School)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.send_type !== currentValues.send_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('send_type') === 'individual' && (
                <div>
                  <Divider>Selected Students ({selectedStudents.length})</Divider>
                  <Space style={{ marginBottom: 16 }} wrap>
                    {selectedStudents.map(student => (
                      <Tag
                        key={student.id}
                        closable
                        onClose={() => removeStudent(student.id)}
                        color="blue"
                      >
                        {student.full_name} ({student.admission_number})
                      </Tag>
                    ))}
                  </Space>

                  <Input.Search
                    placeholder="Search student by name or admission number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onSearch={handleStudentSearch}
                    enterButton="Search"
                  />

                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
                      {searchResults.map(student => (
                        <div
                          key={student.id}
                          style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                          onClick={() => addStudent(student)}
                        >
                          {student.full_name} - {student.admission_number} - {student.class_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.send_type !== currentValues.send_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('send_type') === 'bulk' && (
                <Form.Item name="class_id" label="Class (Optional - Leave empty for all students)">
                  <Select placeholder="Select class or leave empty for all" allowClear>
                    {classes?.map((cls: any) => (
                      <Option key={cls.id} value={cls.id}>
                        {cls.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="notification_type" label="Notification Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Option value="FEE_REMINDER">Fee Reminder</Option>
              <Option value="ATTENDANCE">Attendance</Option>
              <Option value="EXAM">Exam</Option>
              <Option value="ANNOUNCEMENT">Announcement</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item name="use_template" label="Use Template" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.use_template !== currentValues.use_template}
          >
            {({ getFieldValue }) =>
              getFieldValue('use_template') ? (
                <Form.Item
                  name="template_id"
                  label="Select Template"
                  rules={[{ required: true, message: 'Please select a template' }]}
                >
                  <Select placeholder="Select template">
                    {templates?.filter(t => t.is_active).map(template => (
                      <Option key={template.id} value={template.id}>
                        {template.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item
                  name="message"
                  label="Message"
                  rules={[{ required: true, message: 'Please enter message' }]}
                >
                  <TextArea rows={4} placeholder="Enter your message..." maxLength={160} showCount />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SMSNotifications;
