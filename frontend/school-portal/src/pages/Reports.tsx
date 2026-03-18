import React, { useState } from 'react';
import { Card, Row, Col, Button, Select, DatePicker, Space, Tabs, Table, Statistic, Progress, message, Spin } from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  TeamOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { useGetClassesQuery } from '../services/classApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import {
  useGetDailyAttendanceOverviewQuery,
  useGetMonthlyAttendanceOverviewQuery,
} from '../services/attendanceApi';
import moment from 'moment';
import type { Moment } from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const getApiBaseUrl = () => {
  if (window.location.hostname.includes('cloudshell.dev')) {
    return window.location.origin + '/api/v1';
  }
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1';
};

const Reports: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [reportType, setReportType] = useState<string>('attendance');

  const { data: classes } = useGetClassesQuery();
  const { data: students } = useGetStudentsQuery();

  const { data: monthlyAttendance, isLoading: attendanceLoading } = useGetMonthlyAttendanceOverviewQuery({
    year: selectedMonth.year(),
    month: selectedMonth.month() + 1,
    classId: selectedClass,
  });

  const handleDownload = async (path: string, reportName: string) => {
    const url = `${getApiBaseUrl()}${path}`;
    const msgKey = 'download';
    message.loading({ content: `Generating ${reportName}...`, key: msgKey });
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${reportName.replace(/\s+/g, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      message.success({ content: `${reportName} downloaded`, key: msgKey });
    } catch {
      message.error({ content: `Failed to download ${reportName}. Please try again.`, key: msgKey });
    }
  };

  const reportCards = [
    {
      title: 'Attendance Report',
      description: 'Daily and monthly attendance summary',
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      url: '/reports/attendance',
      color: '#f6ffed',
      borderColor: '#b7eb8f',
    },
    {
      title: 'Grades Report',
      description: 'Student grades and assessment results',
      icon: <BarChartOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      url: '/reports/grades',
      color: '#e6f7ff',
      borderColor: '#91d5ff',
    },
    {
      title: 'Financial Report',
      description: 'Fee collection and payment summary',
      icon: <DollarOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      url: '/reports/financial',
      color: '#fffbe6',
      borderColor: '#ffe58f',
    },
    {
      title: 'Students Report',
      description: 'Complete student list and details',
      icon: <TeamOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      url: '/reports/students',
      color: '#f9f0ff',
      borderColor: '#d3adf7',
    },
  ];

  const attendanceColumns = [
    {
      title: 'Class',
      key: 'class',
      render: (_: any, record: any) => `${record.class_name} - ${record.section}`,
    },
    { title: 'Total Students', dataIndex: 'total_students', key: 'total_students' },
    {
      title: 'Present',
      dataIndex: 'present',
      key: 'present',
      render: (val: number) => <span style={{ color: '#52c41a' }}>{val}</span>,
    },
    {
      title: 'Absent',
      dataIndex: 'absent',
      key: 'absent',
      render: (val: number) => <span style={{ color: '#ff4d4f' }}>{val}</span>,
    },
    {
      title: 'Attendance %',
      dataIndex: 'attendance_percentage',
      key: 'attendance_percentage',
      render: (val: number) => (
        <Progress
          percent={Math.round(val)}
          size="small"
          status={val >= 75 ? 'success' : val >= 50 ? 'normal' : 'exception'}
          style={{ width: 100 }}
        />
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Reports & Analytics</h2>
        <p style={{ color: '#666', marginTop: 8 }}>Generate and download various reports</p>
      </div>

      <Tabs defaultActiveKey="download" size="large">
        <TabPane tab="Download Reports" key="download">
          <Row gutter={[16, 16]}>
            {reportCards.map((report, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    background: report.color,
                    border: `1px solid ${report.borderColor}`,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    {report.icon}
                    <h3 style={{ marginTop: 16, marginBottom: 8 }}>{report.title}</h3>
                    <p style={{ color: '#666', marginBottom: 16, fontSize: '0.9rem' }}>
                      {report.description}
                    </p>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(report.url, report.title)}
                    >
                      Download
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card title="Custom Report Generation" style={{ marginTop: 24 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <label>Report Type</label>
                  <Select
                    value={reportType}
                    onChange={setReportType}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Option value="attendance">Attendance Report</Option>
                    <Option value="grades">Grades Report</Option>
                    <Option value="financial">Financial Report</Option>
                    <Option value="students">Students Report</Option>
                  </Select>
                </Col>
                <Col span={6}>
                  <label>Class (Optional)</label>
                  <Select
                    placeholder="All Classes"
                    allowClear
                    style={{ width: '100%', marginTop: 8 }}
                    onChange={setSelectedClass}
                    value={selectedClass}
                  >
                    {classes?.map((c: any) => (
                      <Option key={c.id} value={c.id}>{c.name} - {c.section}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <label>Date Range</label>
                  <RangePicker style={{ width: '100%', marginTop: 8 }} />
                </Col>
                <Col span={6}>
                  <label>&nbsp;</label>
                  <div style={{ marginTop: 8 }}>
                    <Button type="primary" icon={<FileTextOutlined />}>
                      Generate Report
                    </Button>
                  </div>
                </Col>
              </Row>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab="Attendance Analytics" key="attendance">
          <Card style={{ marginBottom: 24 }}>
            <Space>
              <label>Month:</label>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(date) => date && setSelectedMonth(date)}
              />
              <label style={{ marginLeft: 16 }}>Class:</label>
              <Select
                placeholder="All Classes"
                allowClear
                style={{ width: 150 }}
                onChange={setSelectedClass}
                value={selectedClass}
              >
                {classes?.map((c: any) => (
                  <Option key={c.id} value={c.id}>{c.name} - {c.section}</Option>
                ))}
              </Select>
            </Space>
          </Card>

          {attendanceLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
            </div>
          ) : monthlyAttendance ? (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Card>
                    <Statistic
                      title="Working Days"
                      value={monthlyAttendance.total_working_days}
                      suffix="days"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card>
                    <Statistic
                      title="Total Classes"
                      value={monthlyAttendance.by_class?.length || 0}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card>
                    <Statistic
                      title="Total Students"
                      value={monthlyAttendance.by_student?.length || 0}
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="Class-wise Attendance Summary">
                <Table
                  dataSource={monthlyAttendance.by_class}
                  columns={attendanceColumns}
                  rowKey="class_id"
                  pagination={false}
                />
              </Card>
            </>
          ) : (
            <Card>
              <p>No attendance data available for the selected period.</p>
            </Card>
          )}
        </TabPane>

        <TabPane tab="Quick Stats" key="stats">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Students"
                  value={students?.length || 0}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Classes"
                  value={classes?.length || 0}
                  prefix={<PieChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="This Month"
                  value={moment().format('MMMM YYYY')}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Academic Year"
                  value="2024-25"
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Reports;
