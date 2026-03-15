import React, { useState } from 'react';
import { Card, Col, Row, Spin, Typography, Calendar, Badge, Select, Statistic, Progress } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useGetChildAttendanceQuery, useGetChildAttendanceStatsQuery } from '../services/attendanceApi';
import type { RootState } from '../store/store';
import moment from 'moment';
import type { Moment } from 'moment';

const { Text, Title } = Typography;
const { Option } = Select;

const Attendance: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${String(currentYear + 1).slice(-2)}`);

  const children = useSelector((state: RootState) => state.auth.user?.children || []);
  const childId = selectedChild || children[0]?.id;

  const { data: attendance, isLoading: attendanceLoading } = useGetChildAttendanceQuery(
    {
      child_id: childId,
      month: String(selectedDate.month() + 1),
      year: String(selectedDate.year()),
    },
    { skip: !childId }
  );

  const { data: stats, isLoading: statsLoading } = useGetChildAttendanceStatsQuery(
    { child_id: childId, academic_year: academicYear },
    { skip: !childId }
  );

  const isLoading = attendanceLoading || statsLoading;

  // Create attendance map
  const attendanceMap = new Map(
    (attendance || []).map((record) => [moment(record.date).format('YYYY-MM-DD'), record.status])
  );

  const dateCellRender = (value: Moment) => {
    const dateStr = value.format('YYYY-MM-DD');
    const status = attendanceMap.get(dateStr);

    if (!status) return null;

    let badgeStatus: 'success' | 'error' | 'warning' = 'success';
    let text = 'P';

    switch (status) {
      case 'PRESENT':
        badgeStatus = 'success';
        text = 'P';
        break;
      case 'ABSENT':
        badgeStatus = 'error';
        text = 'A';
        break;
      case 'LATE':
        badgeStatus = 'warning';
        text = 'L';
        break;
      case 'HALF_DAY':
        badgeStatus = 'warning';
        text = 'H';
        break;
    }

    return <Badge status={badgeStatus} text={text} />;
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerBanner}>
        <div style={styles.headerContent}>
          <Title level={2} style={styles.headerTitle}>
            Attendance
          </Title>
          <Text style={styles.headerSubtitle}>
            Track your child's attendance and presence record
          </Text>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ ...styles.card, marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          {children.length > 1 && (
            <>
              <Col>
                <Text strong>Select Child:</Text>
              </Col>
              <Col>
                <Select
                  value={selectedChild || children[0]?.id}
                  onChange={setSelectedChild}
                  style={{ width: 200 }}
                >
                  {children.map((child: any) => (
                    <Option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </>
          )}
          <Col>
            <Text strong>Academic Year:</Text>
          </Col>
          <Col>
            <Select value={academicYear} onChange={setAcademicYear} style={{ width: 120 }}>
              {[0, 1, 2].map((offset) => {
                const year = currentYear - offset;
                return (
                  <Option key={year} value={`${year}-${String(year + 1).slice(-2)}`}>
                    {year}-{String(year + 1).slice(-2)}
                  </Option>
                );
              })}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Statistics Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Attendance Rate"
              value={stats?.attendance_percentage || 0}
              suffix="%"
              valueStyle={{ color: (stats?.attendance_percentage || 0) >= 85 ? '#52c41a' : '#f5222d' }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={stats?.attendance_percentage || 0}
              showInfo={false}
              strokeColor={
                (stats?.attendance_percentage || 0) >= 85 ? '#52c41a' : '#f5222d'
              }
              style={{ marginTop: '10px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Total Days"
              value={stats?.total_days || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Present Days"
              value={stats?.present_days || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Absent Days"
              value={stats?.absent_days || 0}
              valueStyle={{ color: '#f5222d' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Calendar View */}
      <Card
        style={styles.card}
        title={
          <div style={styles.cardHeader}>
            <CalendarOutlined style={styles.cardHeaderIcon} />
            <span>Attendance Calendar</span>
          </div>
        }
      >
        <Calendar
          value={selectedDate}
          onSelect={setSelectedDate}
          dateCellRender={dateCellRender}
        />

        {/* Legend */}
        <div style={styles.legend}>
          <Text strong style={{ marginRight: '20px' }}>Legend:</Text>
          <Badge status="success" text="Present (P)" style={{ marginRight: '15px' }} />
          <Badge status="error" text="Absent (A)" style={{ marginRight: '15px' }} />
          <Badge status="warning" text="Late (L)" style={{ marginRight: '15px' }} />
          <Badge status="warning" text="Half Day (H)" />
        </div>
      </Card>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    marginLeft: '260px',
    minHeight: 'calc(100vh - 72px)',
    background: '#f8fafc',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '1rem',
  },
  headerBanner: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    borderRadius: '20px',
    padding: '32px 40px',
    marginBottom: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  headerTitle: {
    color: 'white',
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '8px',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1rem',
    margin: 0,
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  statCard: {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  cardHeaderIcon: {
    color: '#3b82f6',
    fontSize: '18px',
  },
  legend: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
  },
};

export default Attendance;
