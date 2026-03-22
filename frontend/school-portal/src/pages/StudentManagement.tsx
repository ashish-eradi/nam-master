import React, { useState } from 'react';
import { getCurrentAcademicYear, getAcademicYearOptions } from '../utils/academicYear';
import {
  Table,
  Button,
  Modal,
  Descriptions,
  Tabs,
  Select,
  message,
  Card,
  Tag,
  Space,
  Checkbox,
  Row,
  Col,
  Radio,
  Input,
  Upload,
} from 'antd';
import {
  EyeOutlined,
  SwapOutlined,
  RiseOutlined,
  NumberOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  useGetStudentsQuery,
  useGetStudentPaymentsQuery,
  useGetStudentGradesQuery,
  useTransferStudentMutation,
  useBulkPromoteStudentsMutation,
  useAssignRollNumberMutation,
  useBulkAssignRollNumbersMutation,
  useBulkImportStudentsMutation,
  useLazyExportStudentsQuery,
  Student,
} from '../services/studentsApi';
import { useGetClassesQuery } from '../services/classesApi';

const { Option } = Select;
const { TabPane } = Tabs;

const StudentManagement: React.FC = () => {
  const { data: students, isLoading } = useGetStudentsQuery();
  const { data: classes } = useGetClassesQuery();
  const [transferStudent] = useTransferStudentMutation();
  const [bulkPromote] = useBulkPromoteStudentsMutation();
  const [assignRollNumber] = useAssignRollNumberMutation();
  const [bulkAssignRollNumbers] = useBulkAssignRollNumbersMutation();
  const [bulkImportStudents] = useBulkImportStudentsMutation();
  const [exportStudents] = useLazyExportStudentsQuery();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = selectedStudentId ? (students?.find(s => s.id === selectedStudentId) ?? null) : null;
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBulkPromoteModalOpen, setIsBulkPromoteModalOpen] = useState(false);
  const [isRollNumberModalOpen, setIsRollNumberModalOpen] = useState(false);
  const [isBulkRollNumberModalOpen, setIsBulkRollNumberModalOpen] = useState(false);

  const [transferClassId, setTransferClassId] = useState<string>('');

  // Roll number assignment state
  const [rollNumberAssignmentType, setRollNumberAssignmentType] = useState<string>('AUTO_NORMAL');
  const [manualRollNumber, setManualRollNumber] = useState<string>('');
  const [bulkRollNumberClassId, setBulkRollNumberClassId] = useState<string>('');
  const [bulkRollNumberType, setBulkRollNumberType] = useState<string>('AUTO_NORMAL');

  // Bulk promotion state
  const [sourceClassId, setSourceClassId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [demoteTargetClassId, setDemoteTargetClassId] = useState<string>('');
  const [excludedStudents, setExcludedStudents] = useState<string[]>([]);
  const [demotedStudents, setDemotedStudents] = useState<string[]>([]);
  const [newAcademicYear, setNewAcademicYear] = useState<string>(getCurrentAcademicYear());

  // Get payments and grades for selected student
  const { data: payments = [] } = useGetStudentPaymentsQuery(selectedStudent?.id || '', {
    skip: !selectedStudent,
  });

  const { data: grades = [] } = useGetStudentGradesQuery(selectedStudent?.id || '', {
    skip: !selectedStudent,
  });

  const showDetailModal = (student: Student) => {
    setSelectedStudentId(student.id);
    setIsDetailModalOpen(true);
  };

  const showTransferModal = (student: Student) => {
    setSelectedStudentId(student.id);
    setTransferClassId('');
    setIsTransferModalOpen(true);
  };

  const showBulkPromoteModal = () => {
    setSourceClassId('');
    setTargetClassId('');
    setDemoteTargetClassId('');
    setExcludedStudents([]);
    setDemotedStudents([]);
    setNewAcademicYear(getCurrentAcademicYear());
    setIsBulkPromoteModalOpen(true);
  };

  const showRollNumberModal = (student: Student) => {
    setSelectedStudentId(student.id);
    setRollNumberAssignmentType('AUTO_NORMAL');
    setManualRollNumber('');
    setIsRollNumberModalOpen(true);
  };

  const showBulkRollNumberModal = () => {
    setBulkRollNumberClassId('');
    setBulkRollNumberType('AUTO_NORMAL');
    setIsBulkRollNumberModalOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedStudent || !transferClassId) {
      message.error('Please select a class');
      return;
    }

    try {
      await transferStudent({
        studentId: selectedStudent.id,
        classId: transferClassId,
      }).unwrap();
      message.success('Student transferred successfully');
      setIsTransferModalOpen(false);
    } catch (error) {
      message.error('Failed to transfer student');
    }
  };

  const handleBulkPromote = async () => {
    if (!sourceClassId || !targetClassId) {
      message.error('Please select source and target classes');
      return;
    }

    if (demotedStudents.length > 0 && !demoteTargetClassId) {
      message.error('Please select a class for demoted students');
      return;
    }

    try {
      await bulkPromote({
        source_class_id: sourceClassId,
        target_class_id: targetClassId,
        new_academic_year: newAcademicYear,
        exclude_student_ids: excludedStudents,
        demote_student_ids: demotedStudents,
        demote_target_class_id: demoteTargetClassId || undefined,
      }).unwrap();
      message.success('Bulk promotion completed successfully');
      setIsBulkPromoteModalOpen(false);
    } catch (error) {
      message.error('Failed to complete bulk promotion');
    }
  };

  const handleAssignRollNumber = async () => {
    if (!selectedStudent) return;

    if (rollNumberAssignmentType === 'MANUAL' && !manualRollNumber) {
      message.error('Please enter a roll number for manual assignment');
      return;
    }

    try {
      await assignRollNumber({
        student_id: selectedStudent.id,
        assignment_type: rollNumberAssignmentType,
        manual_roll_number: rollNumberAssignmentType === 'MANUAL' ? manualRollNumber : undefined,
      }).unwrap();
      message.success('Roll number assigned successfully');
      setIsRollNumberModalOpen(false);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to assign roll number');
    }
  };

  const handleBulkAssignRollNumbers = async () => {
    if (!bulkRollNumberClassId) {
      message.error('Please select a class');
      return;
    }

    try {
      const result = await bulkAssignRollNumbers({
        class_id: bulkRollNumberClassId,
        assignment_type: bulkRollNumberType,
      }).unwrap();
      message.success(`Roll numbers assigned to ${result.assigned_count} students`);
      setIsBulkRollNumberModalOpen(false);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to assign roll numbers');
    }
  };

  const studentsInSourceClass = students?.filter(
    (s) => s.class_id === sourceClassId
  ) || [];

  const handleExport = async () => {
    try {
      const result = await exportStudents().unwrap();
      const url = window.URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Students exported successfully!');
    } catch (error) {
      message.error('Failed to export students');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await bulkImportStudents(formData).unwrap();
      message.success('Students imported successfully!');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to import students');
    }
    return false; // Prevent default upload behavior
  };

  const columns = [
    {
      title: 'Admission Number',
      dataIndex: 'admission_number',
      key: 'admission_number',
    },
    {
      title: 'Roll Number',
      dataIndex: 'roll_number',
      key: 'roll_number',
      render: (rollNumber: string) => rollNumber || <Tag color="orange">Not Assigned</Tag>,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: Student) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Class',
      dataIndex: ['class_', 'name'],
      key: 'class',
    },
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Student) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showDetailModal(record)}
          >
            View Details
          </Button>
          <Button
            type="link"
            icon={<SwapOutlined />}
            onClick={() => showTransferModal(record)}
          >
            Transfer
          </Button>
          <Button
            type="link"
            icon={<NumberOutlined />}
            onClick={() => showRollNumberModal(record)}
          >
            Roll Number
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<RiseOutlined />}
            onClick={showBulkPromoteModal}
          >
            Bulk Class Promotion
          </Button>
          <Button
            type="primary"
            icon={<NumberOutlined />}
            onClick={showBulkRollNumberModal}
          >
            Bulk Assign Roll Numbers
          </Button>
          <Upload
            accept=".csv"
            beforeUpload={handleImport}
            showUploadList={false}
          >
            <Button
              icon={<UploadOutlined />}
            >
              Import Students (CSV)
            </Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export Students (CSV)
          </Button>
        </Space>
      </div>

      <Table
        dataSource={students}
        columns={columns}
        loading={isLoading}
        rowKey="id"
      />

      {/* Student Detail Modal */}
      <Modal
        title="Student Details"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedStudent && (
          <Tabs defaultActiveKey="personal">
            <TabPane tab="Personal Info" key="personal">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Admission Number">
                  {selectedStudent.admission_number}
                </Descriptions.Item>
                <Descriptions.Item label="Academic Year">
                  {selectedStudent.academic_year}
                </Descriptions.Item>
                <Descriptions.Item label="First Name">
                  {selectedStudent.first_name}
                </Descriptions.Item>
                <Descriptions.Item label="Last Name">
                  {selectedStudent.last_name}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {selectedStudent.date_of_birth}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">
                  {selectedStudent.gender}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedStudent.email}
                </Descriptions.Item>
                <Descriptions.Item label="Admission Date">
                  {selectedStudent.admission_date}
                </Descriptions.Item>
                <Descriptions.Item label="Class" span={2}>
                  {selectedStudent.class_?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Blood Group">
                  {selectedStudent.blood_group || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Aadhar Number">
                  {selectedStudent.aadhar_number || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Father Name">
                  {selectedStudent.father_name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Father Phone">
                  {selectedStudent.father_phone || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Mother Name">
                  {selectedStudent.mother_name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Mother Phone">
                  {selectedStudent.mother_phone || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>
                  {selectedStudent.address || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Area" span={2}>
                  {selectedStudent.area || 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>

            <TabPane tab="Fees & Payments" key="fees">
              <Table
                dataSource={payments}
                columns={[
                  {
                    title: 'Receipt Number',
                    dataIndex: 'receipt_number',
                    key: 'receipt_number',
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (amount: number) => `₹${amount}`,
                  },
                  {
                    title: 'Payment Date',
                    dataIndex: 'payment_date',
                    key: 'payment_date',
                  },
                  {
                    title: 'Payment Mode',
                    dataIndex: 'payment_mode',
                    key: 'payment_mode',
                  },
                ]}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </TabPane>

            <TabPane tab="Grades" key="grades">
              <Table
                dataSource={grades}
                columns={[
                  {
                    title: 'Subject',
                    dataIndex: ['subject', 'name'],
                    key: 'subject',
                  },
                  {
                    title: 'Score',
                    dataIndex: 'score_achieved',
                    key: 'score',
                  },
                  {
                    title: 'Max Score',
                    dataIndex: 'max_score',
                    key: 'max_score',
                  },
                  {
                    title: 'Grade',
                    dataIndex: 'grade',
                    key: 'grade',
                    render: (grade: string) => <Tag color="blue">{grade}</Tag>,
                  },
                ]}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Transfer Student Modal */}
      <Modal
        title="Transfer Student"
        open={isTransferModalOpen}
        onOk={handleTransfer}
        onCancel={() => setIsTransferModalOpen(false)}
      >
        {selectedStudent && (
          <div>
            <p>
              Transfer <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> to:
            </p>
            <Select
              style={{ width: '100%' }}
              placeholder="Select target class"
              value={transferClassId}
              onChange={setTransferClassId}
            >
              {classes?.map((cls) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </Modal>

      {/* Bulk Promotion Modal */}
      <Modal
        title="Bulk Class Promotion"
        open={isBulkPromoteModalOpen}
        onOk={handleBulkPromote}
        onCancel={() => setIsBulkPromoteModalOpen(false)}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card title="Select Classes & Academic Year" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>Source Class (Current)</div>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select source class"
                  value={sourceClassId}
                  onChange={setSourceClassId}
                >
                  {classes?.map((cls) => (
                    <Option key={cls.id} value={cls.id}>
                      {cls.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>Target Class (Promote To)</div>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select target class"
                  value={targetClassId}
                  onChange={setTargetClassId}
                >
                  {classes?.map((cls) => (
                    <Option key={cls.id} value={cls.id}>
                      {cls.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8 }}>New Academic Year</div>
                <Select
                  style={{ width: '100%' }}
                  value={newAcademicYear}
                  onChange={setNewAcademicYear}
                >
                  {getAcademicYearOptions(1, 2).map(y => <Option key={y} value={y}>{y}</Option>)}
                </Select>
              </Col>
            </Row>
          </Card>

          {sourceClassId && studentsInSourceClass.length > 0 && (
            <Card title="Manage Students" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>Exclude from Promotion:</strong>
                  <Checkbox.Group
                    style={{ width: '100%', marginTop: 8 }}
                    value={excludedStudents}
                    onChange={(values) => setExcludedStudents(values as string[])}
                  >
                    <Row>
                      {studentsInSourceClass.map((student) => (
                        <Col span={24} key={student.id} style={{ marginBottom: 8 }}>
                          <Checkbox value={student.id}>
                            {student.first_name} {student.last_name} ({student.admission_number})
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </div>

                <div style={{ marginTop: 16 }}>
                  <strong>Demote Students:</strong>
                  <Checkbox.Group
                    style={{ width: '100%', marginTop: 8 }}
                    value={demotedStudents}
                    onChange={(values) => setDemotedStudents(values as string[])}
                  >
                    <Row>
                      {studentsInSourceClass.map((student) => (
                        <Col span={24} key={student.id} style={{ marginBottom: 8 }}>
                          <Checkbox value={student.id}>
                            {student.first_name} {student.last_name} ({student.admission_number})
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </div>

                {demotedStudents.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8 }}>Demote To Class:</div>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Select class for demoted students"
                      value={demoteTargetClassId}
                      onChange={setDemoteTargetClassId}
                    >
                      {classes?.map((cls) => (
                        <Option key={cls.id} value={cls.id}>
                          {cls.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                )}
              </Space>
            </Card>
          )}

          {sourceClassId && (
            <Card size="small">
              <p>Total Students: {studentsInSourceClass.length}</p>
              <p>To be Promoted: {studentsInSourceClass.length - excludedStudents.length - demotedStudents.length}</p>
              <p>Excluded: {excludedStudents.length}</p>
              <p>To be Demoted: {demotedStudents.length}</p>
            </Card>
          )}
        </Space>
      </Modal>

      {/* Assign Roll Number Modal */}
      <Modal
        title="Assign Roll Number"
        open={isRollNumberModalOpen}
        onOk={handleAssignRollNumber}
        onCancel={() => setIsRollNumberModalOpen(false)}
      >
        {selectedStudent && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <p>
                Assign roll number to <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>
              </p>
              <p>
                <strong>Gender:</strong> {selectedStudent.gender} | <strong>Class:</strong> {selectedStudent.class_?.name}
              </p>
              {selectedStudent.roll_number && (
                <p>
                  <strong>Current Roll Number:</strong> <Tag color="blue">{selectedStudent.roll_number}</Tag>
                </p>
              )}
            </div>

            <div>
              <div style={{ marginBottom: 8 }}>Assignment Type:</div>
              <Radio.Group
                value={rollNumberAssignmentType}
                onChange={(e) => setRollNumberAssignmentType(e.target.value)}
              >
                <Space direction="vertical">
                  <Radio value="AUTO_NORMAL">Automatic (Normal) - All students sequential</Radio>
                  <Radio value="AUTO_BOYS">
                    Automatic (Boys First) - Boys first, then girls
                  </Radio>
                  <Radio value="AUTO_GIRLS">
                    Automatic (Girls First) - Girls first, then boys
                  </Radio>
                  <Radio value="MANUAL">Manual - Enter custom roll number</Radio>
                </Space>
              </Radio.Group>
            </div>

            {rollNumberAssignmentType === 'MANUAL' && (
              <div>
                <div style={{ marginBottom: 8 }}>Roll Number:</div>
                <Input
                  placeholder="Enter roll number"
                  value={manualRollNumber}
                  onChange={(e) => setManualRollNumber(e.target.value)}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* Bulk Assign Roll Numbers Modal */}
      <Modal
        title="Bulk Assign Roll Numbers"
        open={isBulkRollNumberModalOpen}
        onOk={handleBulkAssignRollNumbers}
        onCancel={() => setIsBulkRollNumberModalOpen(false)}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card title="Select Class" size="small">
            <Select
              style={{ width: '100%' }}
              placeholder="Select class"
              value={bulkRollNumberClassId}
              onChange={setBulkRollNumberClassId}
            >
              {classes?.map((cls) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name}
                </Option>
              ))}
            </Select>
          </Card>

          <Card title="Assignment Type" size="small">
            <Radio.Group
              value={bulkRollNumberType}
              onChange={(e) => setBulkRollNumberType(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="AUTO_NORMAL">
                  <strong>Automatic (Normal)</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Sequential numbering for all students (001, 002, 003...)
                  </div>
                </Radio>
                <Radio value="AUTO_BOYS">
                  <strong>Automatic (Boys First)</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Boys get roll numbers first (001, 002...), then girls continue the sequence
                  </div>
                </Radio>
                <Radio value="AUTO_GIRLS">
                  <strong>Automatic (Girls First)</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Girls get roll numbers first (001, 002...), then boys continue the sequence
                  </div>
                </Radio>
              </Space>
            </Radio.Group>
          </Card>

          <Card size="small" style={{ backgroundColor: '#f6f8fa' }}>
            <p style={{ margin: 0, fontSize: '12px' }}>
              <strong>Note:</strong> This will assign roll numbers only to students who don't have one yet.
              Students are ordered alphabetically by name.
            </p>
          </Card>
        </Space>
      </Modal>
    </div>
  );
};

export default StudentManagement;
