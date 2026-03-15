import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, message, Select as AntSelect, Alert, InputNumber, Card, Row, Col, Space } from 'antd';
import {
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  type Teacher,
  type TeacherCreate,
} from '../services/teachersApi';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = AntSelect;
const { Search } = Input;

const Teachers: React.FC = () => {
  const { data: teachers, isLoading, error } = useGetTeachersQuery();
  const [createTeacher] = useCreateTeacherMutation();
  const [updateTeacher] = useUpdateTeacherMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form] = Form.useForm();

  // Search & Filter states
  const [searchText, setSearchText] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!teachers) return [];
    const depts = teachers.map(t => t.department).filter(Boolean);
    return [...new Set(depts)];
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter((teacher) => {
      const matchesSearch = searchText === '' ||
        teacher.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        teacher.employee_id?.toLowerCase().includes(searchText.toLowerCase()) ||
        teacher.specialization?.toLowerCase().includes(searchText.toLowerCase());

      const matchesDepartment = !filterDepartment || teacher.department === filterDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [teachers, searchText, filterDepartment]);

  const clearFilters = () => {
    setSearchText('');
    setFilterDepartment(null);
  };

  useEffect(() => {
    if (editingTeacher) {
      form.setFieldsValue({
        ...editingTeacher,
        hire_date: editingTeacher.hire_date ? moment(editingTeacher.hire_date) : null,
      });
    } else {
      form.resetFields();
    }
  }, [editingTeacher, form]);

  const showModal = (teacher: Teacher | null = null) => {
    setEditingTeacher(teacher);
    setIsEdit(!!teacher);
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(async (values: TeacherCreate) => {
      // Format dates to string
      if (values.hire_date) {
        values.hire_date = moment(values.hire_date).format('YYYY-MM-DD');
      }

      try {
        if (isEdit && editingTeacher) {
          await updateTeacher({ id: editingTeacher.id, body: values }).unwrap();
          message.success('Teacher updated successfully!');
        } else {
          await createTeacher(values).unwrap();
          message.success('Teacher created successfully!');
        }
        setIsModalVisible(false);
        form.resetFields();
      } catch (err: unknown) {
        const apiErr = err as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to save teacher. Please check the form fields.');
      }
    }).catch(() => {
      message.error('Please fill all required fields.');
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTeacher(id).unwrap();
      message.success('Teacher deleted successfully!');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete teacher.');
    }
  };

  const tableColumns = [
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Qualification', dataIndex: 'qualification', key: 'qualification' },
    { title: 'Specialization', dataIndex: 'specialization', key: 'specialization' },
    { title: 'Hire Date', dataIndex: 'hire_date', key: 'hire_date' },
    { title: 'Experience (Years)', dataIndex: 'experience_years', key: 'experience_years' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Teacher) => (
        <>
          <Button onClick={() => showModal(record)} style={{ marginRight: 8 }}>Edit</Button>
          <Button danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <h2>Teachers Management</h2>

      {/* Search and Filter Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="Search by name, email, ID, specialization..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <AntSelect
              placeholder="Filter by Department"
              allowClear
              style={{ width: '100%' }}
              value={filterDepartment}
              onChange={setFilterDepartment}
            >
              {departments.map((dept) => (
                <Option key={dept} value={dept}>
                  {dept}
                </Option>
              ))}
            </AntSelect>
          </Col>
          <Col>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Action Button */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => showModal()}>
          Add Teacher
        </Button>
      </Space>

      {/* Results count */}
      <div style={{ marginBottom: 8 }}>
        Showing {filteredTeachers.length} of {teachers?.length || 0} teachers
      </div>

      {error && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Alert message="Error Loading Teachers" description={JSON.stringify(error)} type="error" showIcon />
        </div>
      )}
      <Table dataSource={filteredTeachers} columns={tableColumns} loading={isLoading} rowKey="id" />
      <Modal
        title={isEdit ? 'Edit Teacher' : 'Add Teacher'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="employee_id" label="Employee ID" rules={[{ required: true, message: 'Employee ID is required' }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: !isEdit, message: 'Full Name is required' }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: !isEdit, type: 'email', message: 'Valid email is required' }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          {!isEdit && (
            <Form.Item name="password" label="Password (Optional - Default: Teacher@123)">
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="department" label="Department">
            <Input />
          </Form.Item>
          <Form.Item name="qualification" label="Qualification">
            <Input />
          </Form.Item>
          <Form.Item name="specialization" label="Specialization">
            <Input />
          </Form.Item>
          <Form.Item name="hire_date" label="Hire Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="experience_years" label="Experience (Years)">
            <InputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Teachers;
