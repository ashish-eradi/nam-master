import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, DatePicker, message, Select as AntSelect, Alert, InputNumber, Card, Row, Col, Space, Divider } from 'antd';
import {
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useBulkImportTeachingStaffMutation,
  useBulkImportNonTeachingStaffMutation,
  type Teacher,
  type TeacherCreate,
} from '../services/teachersApi';
import { SearchOutlined, ClearOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import moment from 'moment';
import FileUpload from '../components/FileUpload';

const { TabPane } = Tabs;
const { Option } = AntSelect;
const { Search } = Input;

const TEACHING_CSV_TEMPLATE = `employee_id,full_name,email,password,department,qualification,specialization,hire_date,experience_years
T001,Ramesh Kumar,ramesh@school.com,,Mathematics,B.Ed,Algebra,2020-06-01,5
T002,Sunita Devi,,,Science,M.Sc,,2019-04-01,8`;

const NON_TEACHING_CSV_TEMPLATE = `employee_id,full_name,email,password,department,qualification,hire_date,experience_years
NT001,Mohan Lal,mohan@school.com,,Administration,Graduate,2021-01-01,3
NT002,Priya Singh,,,,12th Pass,2022-03-15,1`;

const downloadTemplate = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// Teaching Staff Component
const TeachingStaff: React.FC = () => {
  const { data: allTeachers, isLoading, error } = useGetTeachersQuery();
  const [createTeacher] = useCreateTeacherMutation();
  const [updateTeacher] = useUpdateTeacherMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();
  const [bulkImport, { isLoading: isImporting }] = useBulkImportTeachingStaffMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form] = Form.useForm();

  // Search & Filter states
  const [searchText, setSearchText] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  // Filter only teaching staff (you can add a field to distinguish if needed)
  const teachers = useMemo(() => {
    if (!allTeachers) return [];
    // For now, we'll show all teachers. You can add a filter based on employee_type if added to backend
    return allTeachers;
  }, [allTeachers]);

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
          message.success('Teaching staff updated successfully!');
        } else {
          await createTeacher(values).unwrap();
          message.success('Teaching staff added successfully!');
        }
        setIsModalVisible(false);
        form.resetFields();
      } catch (err: unknown) {
        const apiErr = err as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to save teaching staff. Please check the form fields.');
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
      message.success('Teaching staff deleted successfully!');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete teaching staff.');
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await bulkImport(formData).unwrap();
      if (result.errors?.length) {
        Modal.warning({
          title: result.message,
          content: (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {result.errors.map((e, i) => <div key={i} style={{ color: 'red', fontSize: 12 }}>{e}</div>)}
            </div>
          ),
          width: 600,
        });
      } else {
        message.success(result.message);
      }
    } catch (err: any) {
      message.error(err?.data?.detail || 'Bulk import failed.');
    }
    e.target.value = '';
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
        <Space>
          <Button onClick={() => showModal(record)} size="small">Edit</Button>
          <Button danger onClick={() => handleDelete(record.id)} size="small">Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
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

      {/* Action Buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => showModal()}>
          Add Teaching Staff
        </Button>
        <label>
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
          <Button icon={<UploadOutlined />} loading={isImporting} onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}>
            Bulk Import CSV
          </Button>
        </label>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate(TEACHING_CSV_TEMPLATE, 'teaching_staff_template.csv')}>
          Download Template
        </Button>
      </Space>

      {/* Results count */}
      <div style={{ marginBottom: 8 }}>
        Showing {filteredTeachers.length} of {teachers?.length || 0} teaching staff
      </div>

      {error && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Alert message="Error Loading Teaching Staff" description={JSON.stringify(error)} type="error" showIcon />
        </div>
      )}
      <Table dataSource={filteredTeachers} columns={tableColumns} loading={isLoading} rowKey="id" scroll={{ x: 1200 }} />
      <Modal
        title={isEdit ? 'Edit Teaching Staff' : 'Add Teaching Staff'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={900}
      >
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col span={16}>
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
            </Col>
            <Col span={8}>
              {isEdit && editingTeacher ? (
                <Form.Item label="Employee Photo">
                  <FileUpload
                    type="teacher-photo"
                    entityId={editingTeacher.id}
                    currentPhotoUrl={editingTeacher.photo_url}
                    accept=".jpg,.jpeg,.png"
                    maxSize={5}
                  />
                </Form.Item>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                    📷 Photo and documents can be uploaded after creating the employee record
                  </p>
                </div>
              )}
            </Col>
          </Row>
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

          {/* Document Upload Section */}
          {isEdit && editingTeacher && (
            <>
              <Divider>Documents</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Resume/CV">
                    <FileUpload
                      type="teacher-document"
                      entityId={editingTeacher.id}
                      documentType="resume"
                      accept=".pdf,.doc,.docx"
                      maxSize={5}
                    />
                    {editingTeacher.documents?.resume && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingTeacher.documents.resume.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="ID Proof">
                    <FileUpload
                      type="teacher-document"
                      entityId={editingTeacher.id}
                      documentType="id_proof"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={5}
                    />
                    {editingTeacher.documents?.id_proof && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingTeacher.documents.id_proof.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Educational Certificates">
                    <FileUpload
                      type="teacher-document"
                      entityId={editingTeacher.id}
                      documentType="certificates"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={5}
                    />
                    {editingTeacher.documents?.certificates && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingTeacher.documents.certificates.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Experience Letter">
                    <FileUpload
                      type="teacher-document"
                      entityId={editingTeacher.id}
                      documentType="experience_letter"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={5}
                    />
                    {editingTeacher.documents?.experience_letter && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingTeacher.documents.experience_letter.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

// Non-Teaching Staff Component
const NonTeachingStaff: React.FC = () => {
  const { data: allStaff, isLoading, error } = useGetTeachersQuery();
  const [createStaff] = useCreateTeacherMutation();
  const [updateStaff] = useUpdateTeacherMutation();
  const [deleteStaff] = useDeleteTeacherMutation();
  const [bulkImport, { isLoading: isImporting }] = useBulkImportNonTeachingStaffMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Teacher | null>(null);
  const [form] = Form.useForm();

  // Search & Filter states
  const [searchText, setSearchText] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  // For now, show all staff (in future, filter by employee_type)
  const staff = useMemo(() => {
    if (!allStaff) return [];
    return allStaff;
  }, [allStaff]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!staff) return [];
    const depts = staff.map(s => s.department).filter(Boolean);
    return [...new Set(depts)];
  }, [staff]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter((member) => {
      const matchesSearch = searchText === '' ||
        member.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.employee_id?.toLowerCase().includes(searchText.toLowerCase());

      const matchesDepartment = !filterDepartment || member.department === filterDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [staff, searchText, filterDepartment]);

  const clearFilters = () => {
    setSearchText('');
    setFilterDepartment(null);
  };

  useEffect(() => {
    if (editingStaff) {
      form.setFieldsValue({
        ...editingStaff,
        hire_date: editingStaff.hire_date ? moment(editingStaff.hire_date) : null,
      });
    } else {
      form.resetFields();
    }
  }, [editingStaff, form]);

  const showModal = (member: Teacher | null = null) => {
    setEditingStaff(member);
    setIsEdit(!!member);
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(async (values: TeacherCreate) => {
      // Format dates to string
      if (values.hire_date) {
        values.hire_date = moment(values.hire_date).format('YYYY-MM-DD');
      }

      try {
        if (isEdit && editingStaff) {
          await updateStaff({ id: editingStaff.id, body: values }).unwrap();
          message.success('Non-teaching staff updated successfully!');
        } else {
          await createStaff(values).unwrap();
          message.success('Non-teaching staff added successfully!');
        }
        setIsModalVisible(false);
        form.resetFields();
      } catch (err: unknown) {
        const apiErr = err as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to save non-teaching staff. Please check the form fields.');
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
      await deleteStaff(id).unwrap();
      message.success('Non-teaching staff deleted successfully!');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete non-teaching staff.');
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await bulkImport(formData).unwrap();
      if (result.errors?.length) {
        Modal.warning({
          title: result.message,
          content: (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {result.errors.map((e, i) => <div key={i} style={{ color: 'red', fontSize: 12 }}>{e}</div>)}
            </div>
          ),
          width: 600,
        });
      } else {
        message.success(result.message);
      }
    } catch (err: any) {
      message.error(err?.data?.detail || 'Bulk import failed.');
    }
    e.target.value = '';
  };

  const tableColumns = [
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Qualification', dataIndex: 'qualification', key: 'qualification' },
    { title: 'Hire Date', dataIndex: 'hire_date', key: 'hire_date' },
    { title: 'Experience (Years)', dataIndex: 'experience_years', key: 'experience_years' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Teacher) => (
        <Space>
          <Button onClick={() => showModal(record)} size="small">Edit</Button>
          <Button danger onClick={() => handleDelete(record.id)} size="small">Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Search and Filter Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="Search by name, email, ID..."
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

      {/* Action Buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => showModal()}>
          Add Non-Teaching Staff
        </Button>
        <label>
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
          <Button icon={<UploadOutlined />} loading={isImporting} onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}>
            Bulk Import CSV
          </Button>
        </label>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate(NON_TEACHING_CSV_TEMPLATE, 'non_teaching_staff_template.csv')}>
          Download Template
        </Button>
      </Space>

      {/* Results count */}
      <div style={{ marginBottom: 8 }}>
        Showing {filteredStaff.length} of {staff?.length || 0} non-teaching staff
      </div>

      {error && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Alert message="Error Loading Non-Teaching Staff" description={JSON.stringify(error)} type="error" showIcon />
        </div>
      )}
      <Table dataSource={filteredStaff} columns={tableColumns} loading={isLoading} rowKey="id" scroll={{ x: 1200 }} />
      <Modal
        title={isEdit ? 'Edit Non-Teaching Staff' : 'Add Non-Teaching Staff'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="employee_id" label="Employee ID" rules={[{ required: true, message: 'Employee ID is required' }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true, message: 'Full Name is required' }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          <Form.Item name="email" label="Email (Optional)" rules={[{ type: 'email', message: 'Please enter a valid email' }]}>
            <Input disabled={isEdit} placeholder="Optional - for login access" />
          </Form.Item>
          {!isEdit && (
            <Form.Item name="password" label="Password (Optional)">
              <Input.Password placeholder="Optional - Default: Teacher@123" />
            </Form.Item>
          )}
          <Form.Item name="department" label="Department">
            <Input />
          </Form.Item>
          <Form.Item name="qualification" label="Qualification">
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

// Main Employees Component
const Employees: React.FC = () => {
  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600 }}>Employees Management</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Teaching Staff" key="1">
          <TeachingStaff />
        </TabPane>
        <TabPane tab="Non-Teaching Staff" key="2">
          <NonTeachingStaff />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Employees;
