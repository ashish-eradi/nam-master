import React from 'react';
import { Card, Col, Row, Statistic, Spin, Table, Tag } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useGetTeacherDashboardQuery } from '../services/dashboardApi';

const TeacherDashboard: React.FC = () => {
  const { data, isLoading } = useGetTeacherDashboardQuery();

  if (isLoading) return <Spin />;

  const scheduleColumns = [
    { title: 'Period', dataIndex: 'period_name', key: 'period_name' },
    {
      title: 'Time',
      key: 'time',
      render: (record: any) => `${record.start_time} – ${record.end_time}`,
    },
    { title: 'Class', dataIndex: 'class_name', key: 'class_name', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Subject', dataIndex: 'subject_name', key: 'subject_name', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic title="Assigned Classes" value={data?.assigned_classes_count} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic title="Total Students" value={data?.total_students} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic title="Attendance Marked Today" value={data?.today_attendance_marked} />
        </Card>
      </Col>
      <Col xs={24}>
        <Card title={<><CalendarOutlined style={{ marginRight: 8 }} />Today's Schedule</>}>
          {data?.today_schedule?.length > 0 ? (
            <Table
              dataSource={data.today_schedule}
              columns={scheduleColumns}
              pagination={false}
              size="small"
              rowKey={(r) => `${r.period_name}-${r.class_name}`}
            />
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>
              No classes scheduled for today.
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default TeacherDashboard;
