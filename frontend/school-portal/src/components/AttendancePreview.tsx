import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tabs,
  Select,
  DatePicker,
  Progress,
  Tag,
  Spin,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  useGetDailyAttendanceOverviewQuery,
  useGetMonthlyAttendanceOverviewQuery,
  type ClassAttendanceSummary,
  type StudentAttendanceSummary,
} from '../services/attendanceApi';
import { useGetClassesQuery } from '../services/classApi';
import moment from 'moment';
import type { Moment } from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;

const AttendancePreview: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [selectedMonth, setSelectedMonth] = useState<Moment>(moment());
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | undefined>(undefined);

  const { data: classes } = useGetClassesQuery();

  const { data: dailyOverview, isLoading: dailyLoading } = useGetDailyAttendanceOverviewQuery({
    date: selectedDate.format('YYYY-MM-DD'),
    classId: selectedClassFilter,
  });

  const { data: monthlyOverview, isLoading: monthlyLoading } = useGetMonthlyAttendanceOverviewQuery({
    year: selectedMonth.year(),
    month: selectedMonth.month() + 1,
    classId: selectedClassFilter,
  });

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return '#52c41a';
    if (percentage >= 75) return '#faad14';
    return '#ff4d4f';
  };

  const classColumns = [
    {
      title: 'Class',
      key: 'class',
      render: (_: any, record: ClassAttendanceSummary) => `${record.class_name} - ${record.section}`,
    },
    {
      title: 'Total Students',
      dataIndex: 'total_students',
      key: 'total_students',
    },
    {
      title: 'Present',
      dataIndex: 'present',
      key: 'present',
      render: (val: number) => <Tag color="green">{val}</Tag>,
    },
    {
      title: 'Absent',
      dataIndex: 'absent',
      key: 'absent',
      render: (val: number) => <Tag color="red">{val}</Tag>,
    },
    {
      title: 'Late',
      dataIndex: 'late',
      key: 'late',
      render: (val: number) => <Tag color="orange">{val}</Tag>,
    },
    {
      title: 'Half Day',
      dataIndex: 'half_day',
      key: 'half_day',
      render: (val: number) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Attendance %',
      dataIndex: 'attendance_percentage',
      key: 'attendance_percentage',
      render: (val: number) => (
        <Progress
          percent={Math.round(val)}
          size="small"
          strokeColor={getStatusColor(val)}
          style={{ width: 100 }}
        />
      ),
    },
  ];

  const studentColumns = [
    {
      title: 'Roll No',
      dataIndex: 'roll_number',
      key: 'roll_number',
    },
    {
      title: 'Student Name',
      dataIndex: 'student_name',
      key: 'student_name',
    },
    {
      title: 'Present',
      dataIndex: 'present',
      key: 'present',
      render: (val: number) => <Tag color="green">{val}</Tag>,
    },
    {
      title: 'Absent',
      dataIndex: 'absent',
      key: 'absent',
      render: (val: number) => <Tag color="red">{val}</Tag>,
    },
    {
      title: 'Late',
      dataIndex: 'late',
      key: 'late',
      render: (val: number) => <Tag color="orange">{val}</Tag>,
    },
    {
      title: 'Half Day',
      dataIndex: 'half_day',
      key: 'half_day',
      render: (val: number) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Total Days',
      dataIndex: 'total_days',
      key: 'total_days',
    },
    {
      title: 'Attendance %',
      dataIndex: 'attendance_percentage',
      key: 'attendance_percentage',
      render: (val: number) => (
        <Progress
          percent={Math.round(val)}
          size="small"
          strokeColor={getStatusColor(val)}
          style={{ width: 100 }}
        />
      ),
    },
  ];

  const renderDailyOverview = () => {
    if (dailyLoading) {
      return <Spin style={{ display: 'block', margin: '20px auto' }} />;
    }

    if (!dailyOverview) {
      return <Empty description="No attendance data for this date" />;
    }

    return (
      <>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Students"
                value={dailyOverview.total_students}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Present"
                value={dailyOverview.present}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Absent"
                value={dailyOverview.absent}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Late / Half Day"
                value={`${dailyOverview.late} / ${dailyOverview.half_day}`}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title="Overall Attendance Rate">
              <Progress
                type="circle"
                percent={Math.round(dailyOverview.attendance_percentage)}
                strokeColor={getStatusColor(dailyOverview.attendance_percentage)}
                format={(percent) => `${percent}%`}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Attendance by Class">
          <Table
            dataSource={dailyOverview.by_class}
            columns={classColumns}
            rowKey="class_id"
            pagination={false}
            size="small"
          />
        </Card>
      </>
    );
  };

  const renderMonthlyOverview = () => {
    if (monthlyLoading) {
      return <Spin style={{ display: 'block', margin: '20px auto' }} />;
    }

    if (!monthlyOverview) {
      return <Empty description="No attendance data for this month" />;
    }

    return (
      <>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Working Days"
                value={monthlyOverview.total_working_days}
                suffix="days"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Classes"
                value={monthlyOverview.by_class.length}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Total Students"
                value={monthlyOverview.by_student.length}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Monthly Attendance by Class" style={{ marginBottom: 24 }}>
          <Table
            dataSource={monthlyOverview.by_class}
            columns={classColumns}
            rowKey="class_id"
            pagination={false}
            size="small"
          />
        </Card>

        <Card title="Monthly Attendance by Student (Sorted by Lowest Attendance)">
          <Table
            dataSource={monthlyOverview.by_student}
            columns={studentColumns}
            rowKey="student_id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      </>
    );
  };

  return (
    <Card title="Attendance Overview" style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by Class (All)"
          style={{ width: 200, marginRight: 16 }}
          allowClear
          onChange={(value) => setSelectedClassFilter(value)}
          value={selectedClassFilter}
        >
          {classes?.map((c: any) => (
            <Option key={c.id} value={c.id}>
              {c.name} - {c.section}
            </Option>
          ))}
        </Select>
      </div>

      <Tabs defaultActiveKey="daily">
        <TabPane tab="Daily Overview" key="daily">
          <div style={{ marginBottom: 16 }}>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              format="YYYY-MM-DD"
            />
          </div>
          {renderDailyOverview()}
        </TabPane>

        <TabPane tab="Monthly Overview" key="monthly">
          <div style={{ marginBottom: 16 }}>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(date) => date && setSelectedMonth(date)}
              format="YYYY-MM"
            />
          </div>
          {renderMonthlyOverview()}
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default AttendancePreview;
