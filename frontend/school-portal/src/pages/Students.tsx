import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Upload, message, Select as AntSelect, Alert, Card, Row, Col, Space, Radio, Divider, Checkbox, Tag, Descriptions, Statistic } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useLazyGetStudentLedgerQuery } from '../services/financeApi';
import {
  useGetStudentsQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useBulkImportStudentsMutation,
  useLazyExportStudentsQuery,
  type Student,
} from '../services/studentsApi';
import { useGetClassesQuery } from '../services/classesApi';
import { useGetRoutesQuery } from '../services/transportApi';
import { UploadOutlined, SearchOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons';

const STUDENT_CSV_TEMPLATE = `admission_number,first_name,last_name,date_of_birth,gender,admission_date,academic_year,class_id,father_name,father_phone,mother_name,mother_phone,parent_email,address,area,blood_group,aadhar_number
ADM001,Rahul,Sharma,2015-05-15,MALE,2024-06-01,2024-2025,,Ramesh Sharma,9876543210,Sunita Sharma,9876543211,ramesh@example.com,123 MG Road,Bhubaneswar,O+,123456789012
ADM002,Priya,Devi,2016-03-10,FEMALE,2024-06-01,2024-2025,,Suresh Kumar,9876500001,Anita Kumar,9876500002,suresh@example.com,456 Park St,Cuttack,A+,`;

const downloadStudentTemplate = () => {
  const blob = new Blob([STUDENT_CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'students_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
};
import moment from 'moment';
import FileUpload from '../components/FileUpload';

const { Option } = AntSelect;
const { Search } = Input;

const Students: React.FC = () => {
  const { data: students, isLoading, error } = useGetStudentsQuery();
  const { data: classes } = useGetClassesQuery();
  const { data: routes } = useGetRoutesQuery();
  const [createStudent] = useCreateStudentMutation();
  const [updateStudent] = useUpdateStudentMutation();
  const [bulkImportStudents] = useBulkImportStudentsMutation();
  const [exportStudents] = useLazyExportStudentsQuery();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form] = Form.useForm();

  // Fee details modal
  const [feeModalStudent, setFeeModalStudent] = useState<Student | null>(null);
  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [getStudentLedger, { data: studentLedger, isLoading: isFeeLoading }] = useLazyGetStudentLedgerQuery();

  const handleViewFees = async (student: Student) => {
    setFeeModalStudent(student);
    setFeeModalVisible(true);
    await getStudentLedger({ student_id: student.id });
  };

  // Search & Filter states
  const [searchText, setSearchText] = useState('');
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [filterGender, setFilterGender] = useState<string | null>(null);

  // Roll number assignment states
  const [rollNumberMode, setRollNumberMode] = useState<'auto' | 'manual'>('auto');
  const [rollNumberType, setRollNumberType] = useState<'normal' | 'boys' | 'girls'>('normal');

  // Transport selection state
  const [transportRequired, setTransportRequired] = useState<string>('no');

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((student) => {
      const matchesSearch = searchText === '' ||
        student.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        student.last_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        student.admission_number?.toLowerCase().includes(searchText.toLowerCase()) ||
        student.aadhar_number?.includes(searchText);

      const matchesClass = !filterClass || student.class_id === filterClass;
      const matchesGender = !filterGender || student.gender === filterGender;

      return matchesSearch && matchesClass && matchesGender;
    });
  }, [students, searchText, filterClass, filterGender]);

  const clearFilters = () => {
    setSearchText('');
    setFilterClass(null);
    setFilterGender(null);
  };

  useEffect(() => {
    if (editingStudent) {
      form.setFieldsValue({
        ...editingStudent,
        date_of_birth: editingStudent.date_of_birth ? moment(editingStudent.date_of_birth) : null,
        admission_date: editingStudent.admission_date ? moment(editingStudent.admission_date) : null,
      });
      setTransportRequired(editingStudent.needs_transport || 'no');
    } else {
      form.resetFields();
      setTransportRequired('no');
    }
  }, [editingStudent, form]);

  const showModal = (student: Student | null = null) => {
    setEditingStudent(student);
    setIsEdit(!!student);
    setIsModalVisible(true);
  };

  // Calculate next roll number based on class and type
  const calculateNextRollNumber = (classId: string, gender: string): string => {
    if (!students || !classId) return '1';

    // Filter students by class
    const classStudents = students.filter(s => s.class_id === classId);

    if (rollNumberType === 'normal') {
      // Normal: sequential for all students in class
      const maxRoll = classStudents.reduce((max, student) => {
        const rollNum = parseInt(student.roll_number || '0');
        return rollNum > max ? rollNum : max;
      }, 0);
      return String(maxRoll + 1);
    } else if (rollNumberType === 'boys') {
      // Boys: separate sequence for boys
      const boys = classStudents.filter(s => s.gender === 'MALE');
      const maxRoll = boys.reduce((max, student) => {
        const rollNum = parseInt(student.roll_number || '0');
        return rollNum > max ? rollNum : max;
      }, 0);
      return String(maxRoll + 1);
    } else if (rollNumberType === 'girls') {
      // Girls: separate sequence for girls
      const girls = classStudents.filter(s => s.gender === 'FEMALE');
      const maxRoll = girls.reduce((max, student) => {
        const rollNum = parseInt(student.roll_number || '0');
        return rollNum > max ? rollNum : max;
      }, 0);
      return String(maxRoll + 1);
    }
    return '1';
  };

  const handleOk = () => {
    form.validateFields().then(async (values: Partial<Student>) => {
      // Format dates to string
      if (values.date_of_birth) {
        values.date_of_birth = moment(values.date_of_birth).format('YYYY-MM-DD');
      }
      if (values.admission_date) {
        values.admission_date = moment(values.admission_date).format('YYYY-MM-DD');
      }

      // Auto-assign roll number if in auto mode and not editing
      if (!isEdit && rollNumberMode === 'auto' && values.class_id && values.gender) {
        values.roll_number = calculateNextRollNumber(values.class_id, values.gender);
      }

      // school_id is expected to be handled by the backend based on the authenticated user's school.
      // Removed client-side derivation of school_id.

      try {
        if (isEdit) {
          await updateStudent({ id: editingStudent!.id, body: values }).unwrap();
        } else {
          await createStudent(values).unwrap();
        }
        setIsModalVisible(false);
        message.success('Student saved successfully!');
      } catch (err: unknown) {
        const apiErr = err as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to save student. Please check the form fields.');
      }
    }).catch(() => {
      message.error('Failed to save student. Please check the form fields.');
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await bulkImportStudents(formData).unwrap() as { message: string; students_created: number; errors?: string[] };
      if (result.errors && result.errors.length > 0) {
        message.warning(`${result.message}. Errors: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? ` (+${result.errors.length - 3} more)` : ''}`);
      } else {
        message.success(result.message || 'Students imported successfully!');
      }
      setIsImportModalVisible(false);
    } catch (err: unknown) {
      const error = err as { data?: { detail?: string }; status?: number };
      const detail = error?.data?.detail || 'Failed to import students.';
      message.error(detail);
    }
    return false; // Prevent default upload behavior
  };

  const handleExport = async () => {
    try {
      const response = await exportStudents().unwrap();
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students.csv');
      document.body.appendChild(link);
      link.click();
      message.success('Students exported successfully!');
    } catch {
      message.error('Failed to export students.');
    }
  };

  const tableColumns = [
    { title: 'Roll No', dataIndex: 'roll_number', key: 'roll_number', width: 100 },
    { title: 'Admission No', dataIndex: 'admission_number', key: 'admission_number', width: 130 },
    { title: 'First Name', dataIndex: 'first_name', key: 'first_name', width: 120 },
    { title: 'Last Name', dataIndex: 'last_name', key: 'last_name', width: 120 },
    { title: 'Gender', dataIndex: 'gender', key: 'gender', width: 80 },
    { title: 'Class', dataIndex: ['class_', 'name'], key: 'class', width: 100, render: (name: string, record: Student) => {
      return record.class_ ? `${record.class_.name} (${record.class_.section})` : '-';
    } },
    { title: 'DOB', dataIndex: 'date_of_birth', key: 'date_of_birth', width: 110 },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: Student) => (
        <Space>
          <Button size="small" onClick={() => showModal(record)}>Edit</Button>
          <Button size="small" icon={<DollarOutlined />} onClick={() => handleViewFees(record)} type="link">
            Fees
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600 }}>Students Management</h2>

      {/* Search and Filter Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="Search by name, admission no, Aadhaar..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <AntSelect
              placeholder="Filter by Class"
              allowClear
              style={{ width: '100%' }}
              value={filterClass}
              onChange={setFilterClass}
            >
              {classes?.map((cls) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.section})
                </Option>
              ))}
            </AntSelect>
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <AntSelect
              placeholder="Filter by Gender"
              allowClear
              style={{ width: '100%' }}
              value={filterGender}
              onChange={setFilterGender}
            >
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Other">Other</Option>
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
          Add Student
        </Button>
        <Button onClick={() => setIsImportModalVisible(true)}>
          Import from CSV
        </Button>
        <Button onClick={handleExport}>
          Export to CSV
        </Button>
      </Space>

      {/* Results count */}
      <div style={{ marginBottom: 8 }}>
        Showing {filteredStudents.length} of {students?.length || 0} students
      </div>

      {/* Show error if loading fails */}
      {(error as any) && (
        <div style={{ marginTop: 16 }}>
          <Alert message="Error Loading Students" description={JSON.stringify(error)} type="error" showIcon />
        </div>
      )}
      <Table dataSource={filteredStudents} columns={tableColumns} loading={isLoading} rowKey="id" scroll={{ x: 1500 }} />
      <Modal
        title={isEdit ? 'Edit Student' : 'Add Student'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={900} // Increased width for photo section
      >
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col span={16}>
              <Form.Item name="admission_number" label="Admission Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              {isEdit && editingStudent ? (
                <Form.Item label="Student Photo">
                  <FileUpload
                    type="student-photo"
                    entityId={editingStudent.id}
                    currentPhotoUrl={editingStudent.photo_url}
                    accept=".jpg,.jpeg,.png"
                    maxSize={5}
                  />
                </Form.Item>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                    📷 Photo and documents can be uploaded after creating the student record
                  </p>
                </div>
              )}
            </Col>
          </Row>

          <Form.Item name="date_of_birth" label="Date of Birth" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="admission_date" label="Admission Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
            <AntSelect placeholder="Select gender">
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Other">Other</Option>
            </AntSelect>
          </Form.Item>
          <Form.Item name="blood_group" label="Blood Group">
            <Input />
          </Form.Item>
          <Form.Item name="aadhar_number" label="Aadhaar Number">
            <Input maxLength={12} />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="area" label="Area">
            <Input />
          </Form.Item>

          {/* Parent Information Section */}
          {!isEdit && (
            <>
              <Divider>Parent/Guardian Information</Divider>
              <Alert
                message="Parent Information"
                description="Father's name and phone are required. Parent email is optional — only needed if the parent will use the Family Portal. If provided, a login account will be created with the default password 'Parent@123'."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* Hidden field to always set create_parent_account to true */}
              <Form.Item name="create_parent_account" initialValue={true} hidden>
                <Input />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="parent_email"
                    label="Parent Email (Optional)"
                    tooltip="Only required if the parent will log in to the Family Portal"
                    rules={[
                      { type: 'email', message: 'Invalid email' },
                    ]}
                  >
                    <Input placeholder="parent@example.com (optional)" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="parent_password"
                    label="Password (Optional)"
                    tooltip="Default password is 'Parent@123'"
                  >
                    <Input.Password placeholder="Leave empty for default" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="parent_full_name"
                    label="Parent Full Name"
                    tooltip="Optional - will auto-generate if not provided"
                  >
                    <Input placeholder="Full name for login" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="father_name"
                    label="Father's Name"
                    rules={[{ required: true, message: 'Father name is required' }]}
                  >
                    <Input placeholder="Enter father's name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="father_phone"
                    label="Father's Cell"
                    rules={[
                      { required: true, message: 'Father phone is required' },
                      { min: 10, message: 'Phone must be at least 10 digits' }
                    ]}
                  >
                    <Input maxLength={20} placeholder="Enter father's phone" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="mother_name" label="Mother's Name (Optional)">
                    <Input placeholder="Enter mother's name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="mother_phone" label="Mother's Cell (Optional)">
                    <Input maxLength={20} placeholder="Enter mother's phone" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Form.Item name="needs_transport" label="School Transport Required" rules={[{ required: true }]}>
            <AntSelect
              placeholder="Select option"
              onChange={(value) => {
                setTransportRequired(value);
                if (value === 'no') {
                  form.setFieldValue('route_id', undefined);
                }
              }}
            >
              <Option value="yes">Yes</Option>
              <Option value="no">No</Option>
            </AntSelect>
          </Form.Item>

          {transportRequired === 'yes' && (
            <Form.Item
              name="route_id"
              label="Select Route"
              rules={[{ required: true, message: 'Please select a route' }]}
            >
              <AntSelect placeholder="Select transport route">
                {routes?.map((route: any) => (
                  <Option key={route.id} value={route.id}>
                    {route.route_name} {route.route_number ? `(${route.route_number})` : ''}
                  </Option>
                ))}
              </AntSelect>
            </Form.Item>
          )}

          <Form.Item name="accommodation_type" label="Accommodation Type" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="hostel">Hostel</Radio>
              <Radio value="dayscholar">Day Scholar</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="class_id" label="Class" rules={[{ required: true }]}>
            <AntSelect placeholder="Select class">
              {classes?.map((cls) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.section})
                </Option>
              ))}
            </AntSelect>
          </Form.Item>

          {/* Roll Number Section */}
          <Divider>Roll Number Assignment</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Roll Number Mode">
                <Radio.Group value={rollNumberMode} onChange={(e) => setRollNumberMode(e.target.value)}>
                  <Radio value="auto">Auto-Assign</Radio>
                  <Radio value="manual">Manual</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            {rollNumberMode === 'auto' && (
              <Col span={12}>
                <Form.Item label="Numbering Type">
                  <Radio.Group value={rollNumberType} onChange={(e) => setRollNumberType(e.target.value)}>
                    <Radio value="normal">Normal</Radio>
                    <Radio value="boys">Boys Separate</Radio>
                    <Radio value="girls">Girls Separate</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            )}
          </Row>
          {rollNumberMode === 'auto' && (
            <Alert
              message="Auto-Assign Mode"
              description={
                rollNumberType === 'normal'
                  ? "Roll numbers will be assigned sequentially for all students in the selected class."
                  : rollNumberType === 'boys'
                  ? "Roll numbers will be assigned separately for boys only."
                  : "Roll numbers will be assigned separately for girls only."
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item
            name="roll_number"
            label="Roll Number"
            rules={[{ required: rollNumberMode === 'manual' }]}
          >
            <Input
              placeholder={rollNumberMode === 'auto' ? 'Will be auto-assigned' : 'Enter roll number'}
              disabled={rollNumberMode === 'auto'}
            />
          </Form.Item>

          {/* Document Upload Section */}
          {isEdit && editingStudent && (
            <>
              <Divider>Documents</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Birth Certificate">
                    <FileUpload
                      type="student-document"
                      entityId={editingStudent.id}
                      documentType="birth_certificate"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={5}
                    />
                    {editingStudent.documents?.birth_certificate && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingStudent.documents.birth_certificate.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="ID Proof (Aadhaar/etc)">
                    <FileUpload
                      type="student-document"
                      entityId={editingStudent.id}
                      documentType="id_proof"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={5}
                    />
                    {editingStudent.documents?.id_proof && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingStudent.documents.id_proof.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Transfer Certificate">
                    <FileUpload
                      type="student-document"
                      entityId={editingStudent.id}
                      documentType="transfer_certificate"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={5}
                    />
                    {editingStudent.documents?.transfer_certificate && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingStudent.documents.transfer_certificate.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Other Documents">
                    <FileUpload
                      type="student-document"
                      entityId={editingStudent.id}
                      documentType="other"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      maxSize={5}
                    />
                    {editingStudent.documents?.other && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                        ✓ {editingStudent.documents.other.filename}
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* school_id is typically derived from the authenticated user's school for a School Portal */}
          {/* If it needs to be explicitly selectable for some reason, uncomment and manage accordingly */}
          {/*
          <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
            <AntSelect placeholder="Select school">
              {schools?.map((school) => (
                <Option key={school.id} value={school.id}>
                  {school.name}
                </Option>
              ))}
            </AntSelect>
          </Form.Item>
          */}
        </Form>
      </Modal>
      <Modal
        title="Import Students from CSV"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: 12, fontSize: 13 }}>
            <strong>Required columns:</strong> admission_number, father_name, father_phone<br />
            <strong>Optional columns:</strong> parent_email, first_name, last_name, date_of_birth, gender, admission_date, academic_year, class_id, address, area, blood_group, aadhar_number, mother_name, mother_phone
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={downloadStudentTemplate}>
              Download Template
            </Button>
            <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv">
              <Button icon={<UploadOutlined />} type="primary">Upload CSV</Button>
            </Upload>
          </Space>
        </Space>
      </Modal>

      {/* Fee Details Modal */}
      <Modal
        title={`Fee Details — ${feeModalStudent?.first_name} ${feeModalStudent?.last_name}`}
        open={feeModalVisible}
        onCancel={() => { setFeeModalVisible(false); setFeeModalStudent(null); }}
        footer={null}
        width={800}
      >
        {isFeeLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>Loading fee details...</div>
        ) : studentLedger ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Summary */}
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="Total Fees" value={studentLedger.total_expected} prefix="₹" precision={2} />
              </Col>
              <Col span={8}>
                <Statistic title="Amount Paid" value={studentLedger.total_paid} prefix="₹" precision={2} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col span={8}>
                <Statistic title="Outstanding" value={studentLedger.total_outstanding} prefix="₹" precision={2} valueStyle={{ color: studentLedger.total_outstanding > 0 ? '#cf1322' : '#3f8600' }} />
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />

            {/* Fee Breakdown */}
            <div><strong>Fee Breakdown</strong></div>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={studentLedger.fee_structures}
              columns={[
                { title: 'Fee', dataIndex: 'fee_name', key: 'fee_name' },
                { title: 'Total', dataIndex: 'final_amount', key: 'final_amount', render: (v: number) => `₹${v.toFixed(2)}` },
                { title: 'Paid', dataIndex: 'amount_paid', key: 'amount_paid', render: (v: number) => <Tag color="green">₹{v.toFixed(2)}</Tag> },
                { title: 'Due', dataIndex: 'outstanding_amount', key: 'outstanding_amount', render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>₹{v.toFixed(2)}</Tag> },
              ]}
            />

            {/* Payment History */}
            {studentLedger.payments?.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div><strong>Payment History</strong></div>
                <Table
                  size="small"
                  pagination={{ pageSize: 5 }}
                  rowKey="id"
                  dataSource={studentLedger.payments}
                  columns={[
                    { title: 'Receipt No.', dataIndex: 'receipt_number', key: 'receipt_number' },
                    { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
                    { title: 'Amount', dataIndex: 'amount_paid', key: 'amount_paid', render: (v: number) => `₹${v.toFixed(2)}` },
                    { title: 'Mode', dataIndex: 'payment_mode', key: 'payment_mode', render: (m: string) => <Tag>{m}</Tag> },
                  ]}
                />
              </>
            )}
          </Space>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>No fee records found for this student.</div>
        )}
      </Modal>
    </div>
  );
};

export default Students;