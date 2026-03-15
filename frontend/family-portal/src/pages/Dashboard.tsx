import React from 'react';
import { Card, Col, Row, Spin, Typography, Progress } from 'antd';
import {
  TeamOutlined,
  CalendarOutlined,
  TrophyOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useGetFamilyDashboardStatsQuery } from '../services/dashboardApi';

const { Text, Title } = Typography;

const Dashboard: React.FC = () => {
  const { data, isLoading } = useGetFamilyDashboardStatsQuery();

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Welcome Banner */}
      <div style={styles.welcomeBanner}>
        <div style={styles.welcomeContent}>
          <Title level={2} style={styles.welcomeTitle}>
            Welcome Back!
          </Title>
          <Text style={styles.welcomeSubtitle}>
            Here's what's happening with your children's education today.
          </Text>
        </div>
        <div style={styles.welcomeDecoration}></div>
        <div style={styles.welcomeDecoration2}></div>
      </div>

      {/* Stats Cards Row */}
      <Row gutter={[24, 24]} style={styles.statsRow}>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, ...styles.statCardPrimary }}>
            <div style={{ ...styles.statIconBox, ...styles.iconPrimary }}>
              <TeamOutlined style={styles.statIcon} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.my_children || 0}</Text>
              <Text style={styles.statLabel}>My Children</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, ...styles.statCardSuccess }}>
            <div style={{ ...styles.statIconBox, ...styles.iconSuccess }}>
              <CalendarOutlined style={styles.statIcon} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.upcoming_exams || 0}</Text>
              <Text style={styles.statLabel}>Upcoming Exams</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, ...styles.statCardWarning }}>
            <div style={{ ...styles.statIconBox, ...styles.iconWarning }}>
              <BookOutlined style={styles.statIcon} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.books_borrowed || 0}</Text>
              <Text style={styles.statLabel}>Books Borrowed</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, ...styles.statCardInfo }}>
            <div style={{ ...styles.statIconBox, ...styles.iconInfo }}>
              <TrophyOutlined style={styles.statIcon} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.achievements || 0}</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row gutter={[24, 24]}>
        {/* Attendance Overview */}
        <Col xs={24} lg={8}>
          <Card style={styles.card} title={
            <div style={styles.cardHeader}>
              <CheckCircleOutlined style={styles.cardHeaderIcon} />
              <span>Attendance Overview</span>
            </div>
          }>
            <div style={styles.attendanceContainer}>
              <Progress
                type="circle"
                percent={92}
                size={140}
                strokeWidth={10}
                strokeColor={{
                  '0%': '#4f46e5',
                  '100%': '#7c3aed',
                }}
                format={(percent) => (
                  <div style={styles.progressContent}>
                    <span style={styles.progressValue}>{percent}%</span>
                    <span style={styles.progressLabel}>Present</span>
                  </div>
                )}
              />
              <div style={styles.attendanceStats}>
                <div style={styles.attendanceStat}>
                  <span style={styles.attendanceStatValue}>180</span>
                  <span style={styles.attendanceStatLabel}>Days Present</span>
                </div>
                <div style={styles.attendanceStat}>
                  <span style={styles.attendanceStatValue}>15</span>
                  <span style={styles.attendanceStatLabel}>Days Absent</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Recent Activities */}
        <Col xs={24} lg={16}>
          <Card style={styles.card} title={
            <div style={styles.cardHeader}>
              <ClockCircleOutlined style={styles.cardHeaderIcon} />
              <span>Recent Activities</span>
            </div>
          }>
            <div style={styles.activitiesContainer}>
              <ActivityItem
                icon={<TrophyOutlined />}
                iconBg="#10b981"
                title="Math Quiz Result"
                description="Your child scored 95% in the Math Quiz"
                time="2 hours ago"
              />
              <ActivityItem
                icon={<CalendarOutlined />}
                iconBg="#3b82f6"
                title="Exam Schedule Updated"
                description="Science exam scheduled for next Monday"
                time="5 hours ago"
              />
              <ActivityItem
                icon={<BookOutlined />}
                iconBg="#f59e0b"
                title="Book Returned"
                description="'Introduction to Physics' has been returned"
                time="1 day ago"
              />
              <ActivityItem
                icon={<TeamOutlined />}
                iconBg="#8b5cf6"
                title="Parent Meeting"
                description="PTM scheduled for Saturday 10:00 AM"
                time="2 days ago"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[24, 24]} style={styles.quickActionsRow}>
        <Col xs={24}>
          <Card style={styles.card} title={
            <div style={styles.cardHeader}>
              <span>Quick Actions</span>
            </div>
          }>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <div style={styles.quickAction}>
                  <div style={{ ...styles.quickActionIcon, background: 'rgba(79, 70, 229, 0.1)' }}>
                    <TeamOutlined style={{ color: '#4f46e5', fontSize: '24px' }} />
                  </div>
                  <Text style={styles.quickActionText}>View Children</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={styles.quickAction}>
                  <div style={{ ...styles.quickActionIcon, background: 'rgba(16, 185, 129, 0.1)' }}>
                    <TrophyOutlined style={{ color: '#10b981', fontSize: '24px' }} />
                  </div>
                  <Text style={styles.quickActionText}>Check Grades</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={styles.quickAction}>
                  <div style={{ ...styles.quickActionIcon, background: 'rgba(245, 158, 11, 0.1)' }}>
                    <CalendarOutlined style={{ color: '#f59e0b', fontSize: '24px' }} />
                  </div>
                  <Text style={styles.quickActionText}>Timetable</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={styles.quickAction}>
                  <div style={{ ...styles.quickActionIcon, background: 'rgba(59, 130, 246, 0.1)' }}>
                    <BookOutlined style={{ color: '#3b82f6', fontSize: '24px' }} />
                  </div>
                  <Text style={styles.quickActionText}>Library</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Activity Item Component
const ActivityItem: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  time: string;
}> = ({ icon, iconBg, title, description, time }) => (
  <div style={styles.activityItem}>
    <div style={{ ...styles.activityIcon, background: iconBg }}>
      {icon}
    </div>
    <div style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityDescription}>{description}</Text>
    </div>
    <Text style={styles.activityTime}>{time}</Text>
  </div>
);

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
  welcomeBanner: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
    borderRadius: '20px',
    padding: '32px 40px',
    marginBottom: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  welcomeContent: {
    position: 'relative',
    zIndex: 2,
  },
  welcomeTitle: {
    color: 'white',
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1rem',
    margin: 0,
  },
  welcomeDecoration: {
    position: 'absolute',
    top: '-50px',
    right: '-50px',
    width: '250px',
    height: '250px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
  welcomeDecoration2: {
    position: 'absolute',
    bottom: '-30px',
    right: '100px',
    width: '150px',
    height: '150px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
  },
  statsRow: {
    marginBottom: '24px',
  },
  statCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid #f0f0f0',
    position: 'relative',
    overflow: 'hidden',
  },
  statCardPrimary: {
    borderTop: '4px solid #4f46e5',
  },
  statCardSuccess: {
    borderTop: '4px solid #10b981',
  },
  statCardWarning: {
    borderTop: '4px solid #f59e0b',
  },
  statCardInfo: {
    borderTop: '4px solid #3b82f6',
  },
  statIconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconPrimary: {
    background: 'rgba(79, 70, 229, 0.1)',
  },
  iconSuccess: {
    background: 'rgba(16, 185, 129, 0.1)',
  },
  iconWarning: {
    background: 'rgba(245, 158, 11, 0.1)',
  },
  iconInfo: {
    background: 'rgba(59, 130, 246, 0.1)',
  },
  statIcon: {
    fontSize: '24px',
    color: 'inherit',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: 500,
    marginTop: '4px',
  },
  card: {
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
    color: '#4f46e5',
    fontSize: '18px',
  },
  attendanceContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0',
  },
  progressContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  progressLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
  },
  attendanceStats: {
    display: 'flex',
    gap: '40px',
    marginTop: '24px',
  },
  attendanceStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  attendanceStatLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '4px',
  },
  activitiesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
  },
  activityIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  activityTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  activityDescription: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '2px',
  },
  activityTime: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  quickActionsRow: {
    marginTop: '24px',
  },
  quickAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  quickActionIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#374151',
  },
};

export default Dashboard;
