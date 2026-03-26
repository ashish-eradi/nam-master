import React, { useState } from 'react';
import { getCurrentAcademicYear, getAcademicYearOptions } from '../utils/academicYear';
import { Card, Row, Col, Button, Select, DatePicker, Space, Tabs, Table, Statistic, Progress, message, Spin, Tag } from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  TeamOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useGetClassesQuery } from '../services/classApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import {
  useGetDailyAttendanceOverviewQuery,
  useGetMonthlyAttendanceOverviewQuery,
} from '../services/attendanceApi';
import { useGetExamSeriesQuery, useLazyDownloadReportCardQuery, useLazyDownloadClassReportCardsQuery } from '../services/examApi';
import { useLazyDownloadStudentAnnualReportQuery, useLazyDownloadClassAnnualReportsQuery } from '../services/reportsApi';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Report Cards Tab ──────────────────────────────────────────────────────────

const ReportCardsTab: React.FC = () => {
  const [selectedAcYear, setSelectedAcYear] = useState(getCurrentAcademicYear());
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedExamSeries, setSelectedExamSeries] = useState<string | undefined>();
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();

  const { data: classes } = useGetClassesQuery();
  const { data: examSeriesList } = useGetExamSeriesQuery({ academic_year: selectedAcYear });
  const { data: students } = useGetStudentsQuery();

  const [triggerDownloadSingle] = useLazyDownloadReportCardQuery();
  const [triggerDownloadClass] = useLazyDownloadClassReportCardsQuery();

  const classStudents = students?.filter((s: any) => s.class_id === selectedClass) || [];

  const handleDownloadSingle = async () => {
    if (!selectedExamSeries || !selectedStudent) {
      message.warning('Please select an exam series and student');
      return;
    }
    const key = 'dl';
    message.loading({ content: 'Generating report card...', key });
    try {
      const blob = await triggerDownloadSingle({
        student_id: selectedStudent,
        exam_series_id: selectedExamSeries,
      }).unwrap();
      const student = students?.find((s: any) => s.id === selectedStudent);
      triggerBlobDownload(blob, `report_card_${student?.admission_number || selectedStudent}.pdf`);
      message.success({ content: 'Report card downloaded', key });
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || 'Failed to download report card';
      message.error({ content: detail, key });
    }
  };

  const handleDownloadClass = async () => {
    if (!selectedExamSeries || !selectedClass) {
      message.warning('Please select an exam series and class');
      return;
    }
    const key = 'dlc';
    message.loading({ content: 'Generating report cards for class...', key });
    try {
      const blob = await triggerDownloadClass({
        exam_series_id: selectedExamSeries,
        class_id: selectedClass,
      }).unwrap();
      const cls = classes?.find((c: any) => c.id === selectedClass);
      triggerBlobDownload(blob, `report_cards_${cls?.name || 'class'}.pdf`);
      message.success({ content: 'Class report cards downloaded', key });
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || 'Failed to download class report cards';
      message.error({ content: detail, key });
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="bottom">
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Academic Year</strong></div>
            <Select value={selectedAcYear} onChange={setSelectedAcYear} style={{ width: '100%' }}>
              {getAcademicYearOptions().map((y: string) => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Exam Series</strong></div>
            <Select
              placeholder="Select exam series"
              style={{ width: '100%' }}
              value={selectedExamSeries}
              onChange={setSelectedExamSeries}
              allowClear
            >
              {examSeriesList?.map((es: any) => (
                <Option key={es.id} value={es.id}>{es.name} <Tag>{es.exam_type}</Tag></Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Class</strong></div>
            <Select
              placeholder="Select class"
              style={{ width: '100%' }}
              value={selectedClass}
              onChange={(v) => { setSelectedClass(v); setSelectedStudent(undefined); }}
              allowClear
            >
              {classes?.map((c: any) => (
                <Option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Student (for single download)</strong></div>
            <Select
              placeholder="Select student"
              style={{ width: '100%' }}
              value={selectedStudent}
              onChange={setSelectedStudent}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {classStudents.map((s: any) => (
                <Option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card title="Download Report Cards">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Card
              style={{ background: '#e6f7ff', border: '1px solid #91d5ff', textAlign: 'center' }}
            >
              <FilePdfOutlined style={{ fontSize: 36, color: '#1890ff' }} />
              <h3 style={{ marginTop: 12 }}>Single Student Report Card</h3>
              <p style={{ color: '#666' }}>Download report card for a specific student</p>
              <p style={{ color: '#888', fontSize: 12 }}>
                Select exam series + class + student above
              </p>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadSingle}
                disabled={!selectedExamSeries || !selectedStudent}
              >
                Download PDF
              </Button>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card
              style={{ background: '#f6ffed', border: '1px solid #b7eb8f', textAlign: 'center' }}
            >
              <TeamOutlined style={{ fontSize: 36, color: '#52c41a' }} />
              <h3 style={{ marginTop: 12 }}>Bulk Class Report Cards</h3>
              <p style={{ color: '#666' }}>Download report cards for all students in a class</p>
              <p style={{ color: '#888', fontSize: 12 }}>
                Select exam series + class above
              </p>
              <Button
                type="primary"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                icon={<DownloadOutlined />}
                onClick={handleDownloadClass}
                disabled={!selectedExamSeries || !selectedClass}
              >
                Download All (PDF)
              </Button>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24, padding: 16, background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
          <strong>Report card includes:</strong>
          <span style={{ color: '#666', marginLeft: 8 }}>
            Student name · Father name · Class/Section · Date of birth · Admission no · Roll no · Exam marks per subject · Grade · Overall percentage · Attendance (working days / present days / %)
          </span>
        </div>
      </Card>
    </div>
  );
};

// ── Annual Report Tab ─────────────────────────────────────────────────────────

const AnnualReportTab: React.FC = () => {
  const [selectedAcYear, setSelectedAcYear] = useState(getCurrentAcademicYear());
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();

  const { data: classes } = useGetClassesQuery();
  const { data: students } = useGetStudentsQuery();

  const [triggerDownloadStudent] = useLazyDownloadStudentAnnualReportQuery();
  const [triggerDownloadClass] = useLazyDownloadClassAnnualReportsQuery();

  const classStudents = students?.filter((s: any) => s.class_id === selectedClass) || [];

  const handleDownloadStudent = async () => {
    if (!selectedStudent) {
      message.warning('Please select a student');
      return;
    }
    const key = 'dla';
    message.loading({ content: 'Generating annual report...', key });
    try {
      const blob = await triggerDownloadStudent({
        student_id: selectedStudent,
        academic_year: selectedAcYear,
      }).unwrap();
      const student = students?.find((s: any) => s.id === selectedStudent);
      triggerBlobDownload(blob, `annual_report_${student?.admission_number || selectedStudent}_${selectedAcYear}.pdf`);
      message.success({ content: 'Annual report downloaded', key });
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || 'Failed to download annual report';
      message.error({ content: detail, key });
    }
  };

  const handleDownloadClass = async () => {
    if (!selectedClass) {
      message.warning('Please select a class');
      return;
    }
    const key = 'dlac';
    message.loading({ content: 'Generating annual reports for class...', key });
    try {
      const blob = await triggerDownloadClass({
        class_id: selectedClass,
        academic_year: selectedAcYear,
      }).unwrap();
      const cls = classes?.find((c: any) => c.id === selectedClass);
      triggerBlobDownload(blob, `annual_reports_${cls?.name || 'class'}_${selectedAcYear}.pdf`);
      message.success({ content: 'Class annual reports downloaded', key });
    } catch (err: any) {
      const detail = err?.data?.detail || err?.message || 'Failed to download class annual reports';
      message.error({ content: detail, key });
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="bottom">
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Academic Year</strong></div>
            <Select value={selectedAcYear} onChange={setSelectedAcYear} style={{ width: '100%' }}>
              {getAcademicYearOptions().map((y: string) => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Class</strong></div>
            <Select
              placeholder="Select class"
              style={{ width: '100%' }}
              value={selectedClass}
              onChange={(v) => { setSelectedClass(v); setSelectedStudent(undefined); }}
              allowClear
            >
              {classes?.map((c: any) => (
                <Option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <div style={{ marginBottom: 4 }}><strong>Student (for single download)</strong></div>
            <Select
              placeholder="Select student"
              style={{ width: '100%' }}
              value={selectedStudent}
              onChange={setSelectedStudent}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {classStudents.map((s: any) => (
                <Option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number})
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card title="Download Annual Reports">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Card
              style={{ background: '#f9f0ff', border: '1px solid #d3adf7', textAlign: 'center' }}
            >
              <FilePdfOutlined style={{ fontSize: 36, color: '#722ed1' }} />
              <h3 style={{ marginTop: 12 }}>Single Student Annual Report</h3>
              <p style={{ color: '#666' }}>Full-year report: all exams + monthly attendance</p>
              <p style={{ color: '#888', fontSize: 12 }}>Select class + student above</p>
              <Button
                type="primary"
                style={{ background: '#722ed1', borderColor: '#722ed1' }}
                icon={<DownloadOutlined />}
                onClick={handleDownloadStudent}
                disabled={!selectedStudent}
              >
                Download PDF
              </Button>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card
              style={{ background: '#fff0f6', border: '1px solid #ffadd2', textAlign: 'center' }}
            >
              <TeamOutlined style={{ fontSize: 36, color: '#eb2f96' }} />
              <h3 style={{ marginTop: 12 }}>Bulk Class Annual Reports</h3>
              <p style={{ color: '#666' }}>Annual reports for all students in a class</p>
              <p style={{ color: '#888', fontSize: 12 }}>Select class above</p>
              <Button
                type="primary"
                style={{ background: '#eb2f96', borderColor: '#eb2f96' }}
                icon={<DownloadOutlined />}
                onClick={handleDownloadClass}
                disabled={!selectedClass}
              >
                Download All (PDF)
              </Button>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24, padding: 16, background: '#f9f0ff', borderRadius: 6, border: '1px solid #d3adf7' }}>
          <strong>Annual report includes:</strong>
          <span style={{ color: '#666', marginLeft: 8 }}>
            Student details · All exams for the academic year (marks, %, grade) · Month-by-month attendance (working days / present / %) · Annual totals
          </span>
        </div>
      </Card>
    </div>
  );
};

// ── Main Reports Page ─────────────────────────────────────────────────────────

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

  const toCSV = (data: unknown): string => {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0] as object);
    const escape = (val: unknown) => {
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };
    return [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escape((row as Record<string, unknown>)[h])).join(',')),
    ].join('\n');
  };

  const handleDownload = async (path: string, reportName: string) => {
    const url = `${getApiBaseUrl()}${path}`;
    const msgKey = 'download';
    message.loading({ content: `Generating ${reportName}...`, key: msgKey });
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      const csv = toCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${reportName.replace(/\s+/g, '_').toLowerCase()}.csv`;
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

        <TabPane tab="Report Cards" key="report-cards">
          <ReportCardsTab />
        </TabPane>

        <TabPane tab="Annual Report" key="annual-report">
          <AnnualReportTab />
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
                  value={getCurrentAcademicYear()}
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
