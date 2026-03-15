import React, { useState } from 'react';
import { Card, Row, Col, Button, Form, Input, Select, DatePicker, Modal, message, Tabs, Divider, Tag } from 'antd';
import { FileTextOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  useLazyDownloadTransferCertificateQuery,
  useLazyDownloadBonafideCertificateQuery,
  useLazyDownloadCharacterCertificateQuery,
} from '../services/certificatesApi';
import { useLazySearchStudentsQuery } from '../services/financeApi';
import type { StudentLookup } from '../schemas/finance_schema';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Certificates: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<StudentLookup | null>(null);
  const [searchOptions, setSearchOptions] = useState<StudentLookup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [searchStudents, { isLoading: isSearching }] = useLazySearchStudentsQuery();
  const [downloadTC, { isLoading: isDownloadingTC }] = useLazyDownloadTransferCertificateQuery();
  const [downloadBonafide, { isLoading: isDownloadingBonafide }] = useLazyDownloadBonafideCertificateQuery();
  const [downloadCharacter, { isLoading: isDownloadingCharacter }] = useLazyDownloadCharacterCertificateQuery();

  const [tcForm] = Form.useForm();
  const [bonafideForm] = Form.useForm();
  const [characterForm] = Form.useForm();

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      message.warning('Please enter at least 2 characters to search');
      return;
    }

    try {
      const results = await searchStudents(searchQuery).unwrap();
      if (results.length === 0) {
        message.info('No students found');
        setSearchOptions([]);
        setSelectedStudent(null);
      } else if (results.length === 1) {
        setSelectedStudent(results[0]);
        setSearchOptions([]);
      } else {
        setSearchOptions(results);
        setSelectedStudent(null);
      }
    } catch (error) {
      message.error('Search failed. Please try again.');
    }
  };

  const handleSelectStudent = (student: StudentLookup) => {
    setSelectedStudent(student);
    setSearchOptions([]);
    setSearchQuery('');
  };

  const handleDownloadTC = async () => {
    if (!selectedStudent) {
      message.error('Please select a student first');
      return;
    }

    try {
      const values = await tcForm.validateFields();
      const params: any = {
        student_id: selectedStudent.id,
        reason_for_leaving: values.reason_for_leaving,
        conduct: values.conduct,
      };

      if (values.tc_number) params.tc_number = values.tc_number;
      if (values.date_of_leaving) params.date_of_leaving = values.date_of_leaving.format('DD-MMM-YYYY');
      if (values.remarks) params.remarks = values.remarks;

      const pdfBlob = await downloadTC(params).unwrap();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transfer_certificate_${selectedStudent.admission_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Transfer Certificate downloaded successfully!');
      tcForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to download certificate');
    }
  };

  const handleDownloadBonafide = async () => {
    if (!selectedStudent) {
      message.error('Please select a student first');
      return;
    }

    try {
      const values = await bonafideForm.validateFields();
      const params: any = {
        student_id: selectedStudent.id,
        purpose: values.purpose,
      };

      if (values.certificate_number) params.certificate_number = values.certificate_number;
      if (values.academic_year) params.academic_year = values.academic_year;

      const pdfBlob = await downloadBonafide(params).unwrap();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bonafide_certificate_${selectedStudent.admission_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Bonafide Certificate downloaded successfully!');
      bonafideForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to download certificate');
    }
  };

  const handleDownloadCharacter = async () => {
    if (!selectedStudent) {
      message.error('Please select a student first');
      return;
    }

    try {
      const values = await characterForm.validateFields();
      const params: any = {
        student_id: selectedStudent.id,
        character_remarks: values.character_remarks,
      };

      if (values.certificate_number) params.certificate_number = values.certificate_number;
      if (values.date_of_leaving) params.date_of_leaving = values.date_of_leaving.format('DD-MMM-YYYY');

      const pdfBlob = await downloadCharacter(params).unwrap();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `character_certificate_${selectedStudent.admission_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Character Certificate downloaded successfully!');
      characterForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to download certificate');
    }
  };

  return (
    <div>
      <h2>Certificate Generation</h2>

      {/* Student Search */}
      <Card title="Search Student" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={20}>
            <Input
              size="large"
              placeholder="Enter student name or admission number..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearch}
              disabled={isSearching}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={isSearching}
              disabled={!searchQuery || searchQuery.length < 2}
              block
            >
              Search
            </Button>
          </Col>
        </Row>

        {/* Search Results */}
        {searchOptions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Divider orientation="left">Search Results ({searchOptions.length})</Divider>
            <Row gutter={[16, 16]}>
              {searchOptions.map(student => (
                <Col xs={24} sm={12} md={8} key={student.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectStudent(student)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: '16px' }}>{student.full_name}</strong>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="blue">{student.admission_number}</Tag>
                    </div>
                    <div style={{ color: '#666' }}>
                      Class: {student.class_name}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Card>

      {/* Selected Student Info & Certificate Forms */}
      {selectedStudent && (
        <Card
          title={
            <div>
              <FileTextOutlined /> Generate Certificates for {selectedStudent.full_name}
            </div>
          }
          extra={
            <div>
              <Tag color="blue">{selectedStudent.admission_number}</Tag>
              <Tag>{selectedStudent.class_name}</Tag>
            </div>
          }
        >
          <Tabs defaultActiveKey="tc" type="card">
            {/* Transfer Certificate */}
            <TabPane tab="Transfer Certificate" key="tc">
              <Form form={tcForm} layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="tc_number"
                      label="TC Number"
                      tooltip="Leave blank to auto-generate"
                    >
                      <Input placeholder="Auto-generated if not provided" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="date_of_leaving"
                      label="Date of Leaving"
                      tooltip="Leave blank to use today's date"
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="reason_for_leaving"
                      label="Reason for Leaving"
                      initialValue="On Request"
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Option value="On Request">On Request</Option>
                        <Option value="Completed Course">Completed Course</Option>
                        <Option value="Change of Residence">Change of Residence</Option>
                        <Option value="Financial Reasons">Financial Reasons</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="conduct"
                      label="Conduct"
                      initialValue="Good"
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Option value="Excellent">Excellent</Option>
                        <Option value="Very Good">Very Good</Option>
                        <Option value="Good">Good</Option>
                        <Option value="Satisfactory">Satisfactory</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="remarks" label="Remarks">
                  <TextArea rows={2} placeholder="Optional additional remarks" />
                </Form.Item>

                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTC}
                  loading={isDownloadingTC}
                  size="large"
                >
                  Generate & Download Transfer Certificate
                </Button>
              </Form>
            </TabPane>

            {/* Bonafide Certificate */}
            <TabPane tab="Bonafide Certificate" key="bonafide">
              <Form form={bonafideForm} layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="purpose"
                      label="Purpose of Certificate"
                      rules={[{ required: true, message: 'Please enter the purpose' }]}
                    >
                      <Input placeholder="e.g., Bank Account, Library Card, Passport" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="certificate_number"
                      label="Certificate Number"
                      tooltip="Leave blank to auto-generate"
                    >
                      <Input placeholder="Auto-generated if not provided" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="academic_year"
                  label="Academic Year"
                  tooltip="Leave blank to use current year"
                >
                  <Input placeholder="e.g., 2024-2025 (Auto-generated if not provided)" />
                </Form.Item>

                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadBonafide}
                  loading={isDownloadingBonafide}
                  size="large"
                >
                  Generate & Download Bonafide Certificate
                </Button>
              </Form>
            </TabPane>

            {/* Character Certificate */}
            <TabPane tab="Character Certificate" key="character">
              <Form form={characterForm} layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="character_remarks"
                      label="Character Remarks"
                      initialValue="Excellent"
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Option value="Excellent">Excellent</Option>
                        <Option value="Very Good">Very Good</Option>
                        <Option value="Good">Good</Option>
                        <Option value="Satisfactory">Satisfactory</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="certificate_number"
                      label="Certificate Number"
                      tooltip="Leave blank to auto-generate"
                    >
                      <Input placeholder="Auto-generated if not provided" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="date_of_leaving"
                  label="Date of Leaving"
                  tooltip="Leave blank to use today's date"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadCharacter}
                  loading={isDownloadingCharacter}
                  size="large"
                >
                  Generate & Download Character Certificate
                </Button>
              </Form>
            </TabPane>
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default Certificates;
