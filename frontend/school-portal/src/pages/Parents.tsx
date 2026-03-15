import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Popconfirm,
  Tag,
  Card,
  Row,
  Col,
  Descriptions,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import {
  useGetParentsQuery,
  useCreateParentMutation,
  useUpdateParentMutation,
  useDeleteParentMutation,
  useResetParentPasswordMutation,
  useLinkStudentsMutation,
  useUnlinkStudentMutation,
  Parent,
} from '../services/parentsApi';
import { useGetStudentsQuery } from '../services/studentsApi';

const { Option } = Select;

const Parents: React.FC = () => {
  const { data: parents, isLoading } = useGetParentsQuery();
  const { data: students } = useGetStudentsQuery();
  const [createParent] = useCreateParentMutation();
  const [updateParent] = useUpdateParentMutation();
  const [deleteParent] = useDeleteParentMutation();
  const [resetPassword] = useResetParentPasswordMutation();
  const [linkStudents] = useLinkStudentsMutation();
  const [unlinkStudent] = useUnlinkStudentMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkStudentsModalOpen, setIsLinkStudentsModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [form] = Form.useForm();
  const [linkForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleCreate = async (values: any) => {
    try {
      await createParent(values).unwrap();
      message.success('Parent account created successfully');
      form.resetFields();
      setIsCreateModalOpen(false);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to create parent account');
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedParent) return;

    try {
      await updateParent({ id: selectedParent.id, data: values }).unwrap();
      message.success('Parent updated successfully');
      setIsEditModalOpen(false);
      setSelectedParent(null);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to update parent');
    }
  };

  const handleDelete = async (parentId: string) => {
    try {
      await deleteParent(parentId).unwrap();
      message.success('Parent deleted successfully');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to delete parent');
    }
  };

  const handleLinkStudents = async (values: any) => {
    if (!selectedParent) return;

    try {
      await linkStudents({
        parent_id: selectedParent.id,
        student_ids: values.student_ids,
        relationship_type: 'PARENT',
      }).unwrap();
      message.success('Students linked successfully');
      setIsLinkStudentsModalOpen(false);
      linkForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to link students');
    }
  };

  const handleUnlinkStudent = async (parentId: string, studentId: string) => {
    try {
      await unlinkStudent({ parentId, studentId }).unwrap();
      message.success('Student unlinked successfully');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to unlink student');
    }
  };

  const handleResetPassword = async (values: any) => {
    if (!selectedParent) return;

    try {
      await resetPassword({ id: selectedParent.id, data: { new_password: values.password } }).unwrap();
      message.success('Password reset successfully');
      setIsResetPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to reset password');
    }
  };

  const openEditModal = (parent: Parent) => {
    setSelectedParent(parent);
    form.setFieldsValue({
      full_name: parent.full_name,
      father_name: parent.father_name,
      father_phone: parent.father_phone,
      father_email: parent.father_email,
      father_occupation: parent.father_occupation,
      mother_name: parent.mother_name,
      mother_phone: parent.mother_phone,
      mother_email: parent.mother_email,
      mother_occupation: parent.mother_occupation,
      address: parent.address,
      city: parent.city,
      state: parent.state,
      pincode: parent.pincode,
    });
    setIsEditModalOpen(true);
  };

  const openLinkStudentsModal = (parent: Parent) => {
    setSelectedParent(parent);
    linkForm.setFieldsValue({
      student_ids: parent.students.map((s) => s.id),
    });
    setIsLinkStudentsModalOpen(true);
  };

  const openResetPasswordModal = (parent: Parent) => {
    setSelectedParent(parent);
    setIsResetPasswordModalOpen(true);
  };

  const columns = [
    {
      title: 'Parent Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text: string, record: Parent) => (
        <Space>
          <UserOutlined />
          <span>{text || '-'}</span>
          {!record.is_active && <Tag color="red">Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => (
        <Space>
          <MailOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'Father Name',
      dataIndex: 'father_name',
      key: 'father_name',
      render: (text: string) => text || '-',
    },
    {
      title: 'Father Phone',
      dataIndex: 'father_phone',
      key: 'father_phone',
      render: (text: string) => (text ? <><PhoneOutlined /> {text}</> : '-'),
    },
    {
      title: 'Mother Name',
      dataIndex: 'mother_name',
      key: 'mother_name',
      render: (text: string) => text || '-',
    },
    {
      title: 'Mother Phone',
      dataIndex: 'mother_phone',
      key: 'mother_phone',
      render: (text: string) => (text ? <><PhoneOutlined /> {text}</> : '-'),
    },
    {
      title: 'Children',
      dataIndex: 'students',
      key: 'students',
      render: (students: any[]) => (
        <Space direction="vertical" size="small">
          {students && students.length > 0 ? (
            students.map((student) => (
              <Tag key={student.id} color="blue">
                {student.first_name} {student.last_name} ({student.admission_number})
              </Tag>
            ))
          ) : (
            <Tag>No children linked</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 250,
      render: (_: any, record: Parent) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => openLinkStudentsModal(record)}
          >
            Link
          </Button>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => openResetPasswordModal(record)}
          >
            Reset Pwd
          </Button>
          <Popconfirm
            title="Are you sure to delete this parent?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <h2>Parent Management</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add Parent
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={parents || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Parent Modal */}
      <Modal
        title="Create Parent Account"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <h4>Login Credentials</h4>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="email"
                label="Email (Login ID)"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Invalid email' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="parent@example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Password is required' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Enter password" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
                <Input placeholder="Full Name" />
              </Form.Item>
            </Col>
          </Row>

          <h4>Father Details</h4>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="father_name" label="Father Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="father_phone" label="Father Phone">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="father_email" label="Father Email">
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="father_occupation" label="Father Occupation">
            <Input />
          </Form.Item>

          <h4>Mother Details</h4>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="mother_name" label="Mother Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mother_phone" label="Mother Phone">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mother_email" label="Mother Email">
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="mother_occupation" label="Mother Occupation">
            <Input />
          </Form.Item>

          <h4>Address Details</h4>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} prefix={<HomeOutlined />} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pincode" label="Pincode">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <h4>Link Students (Optional)</h4>
          <Form.Item name="student_ids" label="Select Students">
            <Select
              mode="multiple"
              placeholder="Select students to link"
              showSearch
              optionFilterProp="children"
            >
              {students?.map((student) => (
                <Option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} ({student.admission_number})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Parent Modal */}
      <Modal
        title="Edit Parent Information"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedParent(null);
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <h4>Father Details</h4>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="father_name" label="Father Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="father_phone" label="Father Phone">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="father_email" label="Father Email">
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="father_occupation" label="Father Occupation">
            <Input />
          </Form.Item>

          <h4>Mother Details</h4>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="mother_name" label="Mother Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mother_phone" label="Mother Phone">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mother_email" label="Mother Email">
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="mother_occupation" label="Mother Occupation">
            <Input />
          </Form.Item>

          <h4>Address Details</h4>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pincode" label="Pincode">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Link Students Modal */}
      <Modal
        title="Link Students to Parent"
        open={isLinkStudentsModalOpen}
        onCancel={() => {
          setIsLinkStudentsModalOpen(false);
          setSelectedParent(null);
          linkForm.resetFields();
        }}
        onOk={() => linkForm.submit()}
      >
        <Form form={linkForm} layout="vertical" onFinish={handleLinkStudents}>
          <Form.Item name="student_ids" label="Select Students" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              placeholder="Select students to link"
              showSearch
              optionFilterProp="children"
            >
              {students?.map((student) => (
                <Option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} ({student.admission_number})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title="Reset Parent Password"
        open={isResetPasswordModalOpen}
        onCancel={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedParent(null);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[{ required: true, message: 'Please enter new password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Parents;
