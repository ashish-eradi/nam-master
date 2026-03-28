import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Form, Input, Select, Modal, message, Space, Tag, Switch, Divider, Alert, Tooltip } from 'antd';
import {
  PlusOutlined, SendOutlined, EditOutlined, DeleteOutlined,
  HistoryOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useGetWhatsAppCredentialsQuery,
  useListWhatsAppTemplatesQuery,
  useCreateWhatsAppTemplateMutation,
  useUpdateWhatsAppTemplateMutation,
  useDeleteWhatsAppTemplateMutation,
  useSendWhatsAppMutation,
  useSendBulkWhatsAppMutation,
  useGetWhatsAppHistoryQuery,
  useGetWhatsAppStatsQuery,
  type WhatsAppTemplate,
  type WhatsAppTemplateCreate,
  type SendWhatsAppRequest,
  type BulkWhatsAppRequest,
} from '../services/notificationsApi';
import { useLazySearchStudentsQuery } from '../services/financeApi';
import { useGetClassesQuery } from '../services/classesApi';
import type { RootState } from '../store/store';
import type { StudentLookup } from '../schemas/finance_schema';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const WA_GREEN = '#25D366';

const STATUS_COLOR: Record<string, string> = {
  sent: 'blue',
  delivered: 'green',
  read: 'purple',
  failed: 'red',
  pending: 'orange',
};

const WhatsAppNotifications: React.FC = () => {
  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});

  const { data: credential, isLoading: credLoading } = useGetWhatsAppCredentialsQuery();
  const { data: templates, isLoading: templatesLoading } = useListWhatsAppTemplatesQuery({});
  const [createTemplate] = useCreateWhatsAppTemplateMutation();
  const [updateTemplate] = useUpdateWhatsAppTemplateMutation();
  const [deleteTemplate] = useDeleteWhatsAppTemplateMutation();
  const [sendWhatsApp] = useSendWhatsAppMutation();
  const [sendBulkWhatsApp] = useSendBulkWhatsAppMutation();
  const [searchStudents] = useLazySearchStudentsQuery();
  const { data: classes } = useGetClassesQuery();
  const { data: history } = useGetWhatsAppHistoryQuery({ limit: 100 });
  const { data: stats } = useGetWhatsAppStatsQuery();

  // Template modal state
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm] = Form.useForm();

  // Send modal state
  const [isSendModalVisible, setIsSendModalVisible] = useState(false);
  const [sendForm] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentLookup[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentLookup[]>([]);

  // ── Template handlers ────────────────────────────────────────────────

  const showTemplateModal = (template: WhatsAppTemplate | null = null) => {
    setEditingTemplate(template);
    if (template) {
      templateForm.setFieldsValue({
        name: template.name,
        notification_type: template.notification_type,
        message_template: template.message_template,
        is_active: template.is_active,
        meta_template_name: template.meta_template_name,
        meta_template_language: template.meta_template_language || 'en',
      });
    } else {
      templateForm.resetFields();
      templateForm.setFieldsValue({ is_active: true, meta_template_language: 'en' });
    }
    setIsTemplateModalVisible(true);
  };

  const handleTemplateSubmit = async () => {
    try {
      const values = await templateForm.validateFields();
      const data: WhatsAppTemplateCreate = {
        name: values.name,
        notification_type: values.notification_type,
        message_template: values.message_template,
        is_active: values.is_active !== false,
        meta_template_name: values.meta_template_name || undefined,
        meta_template_language: values.meta_template_language || 'en',
      };
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, body: data }).unwrap();
        message.success('Template updated!');
      } else {
        await createTemplate(data).unwrap();
        message.success('Template created!');
      }
      setIsTemplateModalVisible(false);
      templateForm.resetFields();
      setEditingTemplate(null);
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id).unwrap();
      message.success('Template deleted!');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete template');
    }
  };

  // ── Send handlers ────────────────────────────────────────────────────

  const openSendModal = () => {
    if (!credential?.is_active) { message.error('WhatsApp is not connected. Connect via Settings → WhatsApp first.'); return; }
    sendForm.resetFields();
    setSelectedStudents([]);
    setSearchResults([]);
    setSearchQuery('');
    setIsSendModalVisible(true);
  };

  const handleStudentSearch = async () => {
    if (searchQuery.length < 2) { message.warning('Enter at least 2 characters'); return; }
    try {
      const results = await searchStudents(searchQuery).unwrap();
      setSearchResults(results);
    } catch { message.error('Search failed'); }
  };

  const addStudent = (s: StudentLookup) => {
    if (!selectedStudents.find(x => x.id === s.id)) setSelectedStudents([...selectedStudents, s]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSend = async () => {
    try {
      const values = await sendForm.validateFields();

      if (values.send_type === 'individual') {
        if (selectedStudents.length === 0) { message.error('Please select at least one student'); return; }
        const req: SendWhatsAppRequest = {
          school_id: schoolId!,
          notification_type: values.notification_type,
          message: values.use_template ? undefined : values.message,
          template_id: values.use_template ? values.template_id : undefined,
          recipients: selectedStudents.map(s => ({
            phone: s.mobile_number || '',
            name: s.full_name,
            student_id: s.id,
          })),
        };
        const result = await sendWhatsApp(req).unwrap();
        message.success(result.message);
      } else {
        const req: BulkWhatsAppRequest = {
          school_id: schoolId!,
          notification_type: values.notification_type,
          message: values.use_template ? undefined : values.message,
          template_id: values.use_template ? values.template_id : undefined,
          class_id: values.class_id,
        };
        const result = await sendBulkWhatsApp(req).unwrap();
        message.success(result.message);
      }

      setIsSendModalVisible(false);
      sendForm.resetFields();
      setSelectedStudents([]);
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to send WhatsApp message');
    }
  };

  // ── Table columns ────────────────────────────────────────────────────

  const templateColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Type',
      dataIndex: 'notification_type',
      key: 'notification_type',
      render: (t: string) => <Tag color="green">{t}</Tag>,
    },
    { title: 'Message Template', dataIndex: 'message_template', key: 'message_template', ellipsis: true },
    {
      title: 'Meta Template',
      dataIndex: 'meta_template_name',
      key: 'meta_template_name',
      render: (n: string, r: WhatsAppTemplate) =>
        n ? <Tooltip title={`Language: ${r.meta_template_language}`}><Tag color="blue">{n}</Tag></Tooltip> : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (a: boolean) => <Tag color={a ? 'green' : 'red'}>{a ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: WhatsAppTemplate) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => showTemplateModal(record)}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTemplate(record.id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Date', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    { title: 'Recipient', dataIndex: 'recipient_name', key: 'recipient_name' },
    { title: 'Phone', dataIndex: 'recipient_phone', key: 'recipient_phone' },
    { title: 'Type', dataIndex: 'notification_type', key: 'notification_type', render: (t: string) => <Tag>{t}</Tag> },
    { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={STATUS_COLOR[s] || 'default'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Delivered',
      dataIndex: 'delivered_at',
      key: 'delivered_at',
      width: 150,
      render: (d: string) => d ? <Tooltip title={new Date(d).toLocaleString()}><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip> : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Read',
      dataIndex: 'read_at',
      key: 'read_at',
      width: 80,
      render: (d: string) => d ? <Tooltip title={new Date(d).toLocaleString()}><CheckCircleOutlined style={{ color: '#722ed1' }} /></Tooltip> : <span style={{ color: '#bbb' }}>—</span>,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  const isConnected = !credLoading && credential?.is_active;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
          alt="WhatsApp"
          style={{ width: 36, height: 36 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>WhatsApp Messaging</h2>
          <p style={{ color: '#666', margin: 0 }}>Send WhatsApp messages to parents and students</p>
        </div>
      </div>

      {/* Connection status */}
      {!credLoading && (
        isConnected ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 20 }}
            message={`WhatsApp Connected — ${credential!.display_name || credential!.phone_number_id}`}
            description="Messages are sent via your school's WhatsApp Business Account using Meta's Cloud API."
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            icon={<CloseCircleOutlined />}
            style={{ marginBottom: 20 }}
            message="WhatsApp Not Connected"
            description="Connect your WhatsApp Business Account via the Embedded Signup flow. Contact your system administrator to set up the connection."
          />
        )
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',     value: stats.total,     color: '#1677ff' },
            { label: 'Sent',      value: stats.sent,      color: '#1890ff' },
            { label: 'Delivered', value: stats.delivered, color: WA_GREEN  },
            { label: 'Read',      value: stats.read,      color: '#722ed1' },
            { label: 'Failed',    value: stats.failed,    color: '#ff4d4f' },
            { label: 'Pending',   value: stats.pending,   color: '#faad14' },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{value}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{label}</div>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultActiveKey="send">
        {/* Send Tab */}
        <TabPane tab={<span><SendOutlined /> Send Message</span>} key="send">
          <Card>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={openSendModal}
              size="large"
              disabled={!isConnected}
              style={isConnected ? { background: WA_GREEN, borderColor: WA_GREEN } : {}}
            >
              Compose &amp; Send WhatsApp
            </Button>
            {!isConnected && !credLoading && (
              <p style={{ marginTop: 12, color: '#faad14' }}>
                WhatsApp must be connected before sending messages.
              </p>
            )}
          </Card>
        </TabPane>

        {/* Templates Tab */}
        <TabPane tab={<span><FileTextOutlined /> Templates</span>} key="templates">
          <Card
            title="Message Templates"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showTemplateModal()}
                style={{ background: WA_GREEN, borderColor: WA_GREEN }}>
                New Template
              </Button>
            }
          >
            <Table dataSource={templates} columns={templateColumns} rowKey="id" loading={templatesLoading} />
          </Card>
        </TabPane>

        {/* History Tab */}
        <TabPane tab={<span><HistoryOutlined /> History</span>} key="history">
          <Card title="Message History">
            <Table dataSource={history} columns={historyColumns} rowKey="id" pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
          </Card>
        </TabPane>
      </Tabs>

      {/* Template Modal */}
      <Modal
        title={editingTemplate ? 'Edit Template' : 'New Message Template'}
        open={isTemplateModalVisible}
        onCancel={() => { setIsTemplateModalVisible(false); templateForm.resetFields(); setEditingTemplate(null); }}
        onOk={handleTemplateSubmit}
        width={700}
        okButtonProps={{ style: { background: WA_GREEN, borderColor: WA_GREEN } }}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Fee Reminder" />
          </Form.Item>
          <Form.Item name="notification_type" label="Notification Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Option value="Fee Reminder">Fee Reminder</Option>
              <Option value="Attendance Alert">Attendance Alert</Option>
              <Option value="Exam Notification">Exam Notification</Option>
              <Option value="Event Reminder">Event Reminder</Option>
              <Option value="General">General</Option>
              <Option value="Emergency">Emergency</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="message_template"
            label="Message Body"
            rules={[{ required: true }]}
            help="Variables for local rendering: {{student_name}}, {{admission_number}}"
          >
            <TextArea rows={4} placeholder="Dear {{student_name}}, this is a reminder from school..." />
          </Form.Item>

          <Divider>Meta-Approved Template (optional)</Divider>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="If this template is approved in Meta Business Manager, enter its exact name below to send it outside the 24-hour messaging window."
          />
          <Form.Item name="meta_template_name" label="Meta Template Name">
            <Input placeholder="e.g., fee_reminder_v1 (exact name from Meta Business Manager)" />
          </Form.Item>
          <Form.Item name="meta_template_language" label="Language Code">
            <Select>
              <Option value="en">en — English</Option>
              <Option value="en_US">en_US — English (US)</Option>
              <Option value="en_GB">en_GB — English (UK)</Option>
              <Option value="hi">hi — Hindi</Option>
              <Option value="mr">mr — Marathi</Option>
              <Option value="ta">ta — Tamil</Option>
              <Option value="te">te — Telugu</Option>
              <Option value="kn">kn — Kannada</Option>
              <Option value="bn">bn — Bengali</Option>
              <Option value="gu">gu — Gujarati</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Send Modal */}
      <Modal
        title="Send WhatsApp Message"
        open={isSendModalVisible}
        onCancel={() => { setIsSendModalVisible(false); sendForm.resetFields(); setSelectedStudents([]); }}
        onOk={handleSend}
        width={800}
        okText="Send"
        okButtonProps={{ style: { background: WA_GREEN, borderColor: WA_GREEN } }}
      >
        <Form form={sendForm} layout="vertical" initialValues={{ send_type: 'bulk', use_template: false }}>
          <Form.Item name="send_type" label="Send To" rules={[{ required: true }]}>
            <Select>
              <Option value="individual">Individual Students</Option>
              <Option value="bulk">Bulk — Entire Class or School</Option>
            </Select>
          </Form.Item>

          {/* Individual — student picker */}
          <Form.Item noStyle shouldUpdate={(p, c) => p.send_type !== c.send_type}>
            {({ getFieldValue }) =>
              getFieldValue('send_type') === 'individual' && (
                <div>
                  <Divider>Selected Students ({selectedStudents.length})</Divider>
                  <Space style={{ marginBottom: 12 }} wrap>
                    {selectedStudents.map(s => (
                      <Tag key={s.id} closable onClose={() => setSelectedStudents(selectedStudents.filter(x => x.id !== s.id))} color="green">
                        {s.full_name} ({s.admission_number})
                      </Tag>
                    ))}
                  </Space>
                  <Input.Search
                    placeholder="Search student by name or admission number"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onSearch={handleStudentSearch}
                    enterButton="Search"
                  />
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
                      {searchResults.map(s => (
                        <div key={s.id} style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }} onClick={() => addStudent(s)}>
                          {s.full_name} — {s.admission_number} — {s.class_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
          </Form.Item>

          {/* Bulk — class picker */}
          <Form.Item noStyle shouldUpdate={(p, c) => p.send_type !== c.send_type}>
            {({ getFieldValue }) =>
              getFieldValue('send_type') === 'bulk' && (
                <Form.Item name="class_id" label="Class (leave empty for all students)">
                  <Select placeholder="Select class or leave empty for all" allowClear>
                    {classes?.map((cls: any) => <Option key={cls.id} value={cls.id}>{cls.name}</Option>)}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="notification_type" label="Notification Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Option value="Fee Reminder">Fee Reminder</Option>
              <Option value="Attendance Alert">Attendance Alert</Option>
              <Option value="Exam Notification">Exam Notification</Option>
              <Option value="Event Reminder">Event Reminder</Option>
              <Option value="General">General</Option>
              <Option value="Emergency">Emergency</Option>
            </Select>
          </Form.Item>

          <Form.Item name="use_template" label="Use Saved Template" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(p, c) => p.use_template !== c.use_template}>
            {({ getFieldValue }) =>
              getFieldValue('use_template') ? (
                <Form.Item name="template_id" label="Select Template" rules={[{ required: true }]}>
                  <Select placeholder="Select template">
                    {templates?.filter(t => t.is_active).map(t => (
                      <Option key={t.id} value={t.id}>
                        {t.name}{t.meta_template_name ? ` (Meta: ${t.meta_template_name})` : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item name="message" label="Message" rules={[{ required: true }]}>
                  <TextArea rows={4} placeholder="Type your WhatsApp message here..." maxLength={1000} showCount />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WhatsAppNotifications;
