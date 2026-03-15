import React from 'react';
import { Card, Col, Row, Progress, Spin, Typography, Badge } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  AppstoreOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  BookOutlined,
  CalendarOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useGetAdminDashboardQuery } from '../services/dashboardApi';
import RevenueChart from '../components/RevenueChart';
import AttendanceChart from '../components/AttendanceChart';

const { Text, Title } = Typography;

const timeAgo = (isoString: string | null): string => {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const activityIcon = (type: string) => {
  switch (type) {
    case 'admission': return <TeamOutlined />;
    case 'payment': return <DollarOutlined />;
    case 'teacher': return <UserOutlined />;
    default: return <CalendarOutlined />;
  }
};

const activityColor = (type: string) => {
  switch (type) {
    case 'admission': return '#0d9488';
    case 'payment': return '#10b981';
    case 'teacher': return '#6366f1';
    default: return '#f59e0b';
  }
};

const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useGetAdminDashboardQuery(undefined, {
    pollingInterval: 10000, // Auto-refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </div>
    );
  }

  // Mock data for charts (replace with real API data later)
  const revenueData = [
    { month: 'Jan', revenue: 4000 },
    { month: 'Feb', revenue: 3000 },
    { month: 'Mar', revenue: 2000 },
    { month: 'Apr', revenue: 2780 },
    { month: 'May', revenue: 1890 },
    { month: 'Jun', revenue: 2390 },
    { month: 'Jul', revenue: 3490 },
    { month: 'Aug', revenue: 4000 },
    { month: 'Sep', revenue: 3000 },
    { month: 'Oct', revenue: 2000 },
    { month: 'Nov', revenue: 2780 },
    { month: 'Dec', revenue: 3890 },
  ];

  const attendanceData = [
    { class: 'Class 1', present: 40, absent: 2 },
    { class: 'Class 2', present: 30, absent: 5 },
    { class: 'Class 3', present: 20, absent: 8 },
    { class: 'Class 4', present: 27, absent: 3 },
    { class: 'Class 5', present: 18, absent: 10 },
    { class: 'Class 6', present: 23, absent: 5 },
    { class: 'Class 7', present: 34, absent: 2 },
  ];

  return (
    <div style={styles.container}>
      {/* Welcome Banner */}
      <div style={styles.welcomeBanner}>
        <div style={styles.welcomeContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Title level={2} style={{ ...styles.welcomeTitle, margin: 0 }}>
              School Dashboard
            </Title>
            <Badge
              status="processing"
              text={<span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>Live</span>}
            />
          </div>
          <Text style={styles.welcomeSubtitle}>
            Monitor and manage your school's academic performance at a glance. Data updates every 10 seconds.
          </Text>
        </div>
        <div style={styles.welcomeDecoration}></div>
        <div style={styles.welcomeDecoration2}></div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={styles.statsRow}>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, borderTopColor: '#0d9488' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(13, 148, 136, 0.1)' }}>
              <TeamOutlined style={{ fontSize: '24px', color: '#0d9488' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.total_students || 0}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, borderTopColor: '#6366f1' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(99, 102, 241, 0.1)' }}>
              <UserOutlined style={{ fontSize: '24px', color: '#6366f1' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.total_teachers || 0}</Text>
              <Text style={styles.statLabel}>Total Teachers</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, borderTopColor: '#f59e0b' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(245, 158, 11, 0.1)' }}>
              <AppstoreOutlined style={{ fontSize: '24px', color: '#f59e0b' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{data?.total_classes || 0}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div style={{ ...styles.statCard, borderTopColor: '#ef4444' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(239, 68, 68, 0.1)' }}>
              <DollarOutlined style={{ fontSize: '24px', color: '#ef4444' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(data?.outstanding_fees || 0)}
              </Text>
              <Text style={styles.statLabel}>Outstanding Fees</Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={16}>
          <RevenueChart data={revenueData} />
        </Col>
        <Col xs={24} lg={8}>
          <AttendanceChart data={attendanceData} />
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row gutter={[24, 24]}>
        {/* Attendance Overview */}
        <Col xs={24} lg={8}>
          <Card
            style={styles.card}
            title={
              <div style={styles.cardHeader}>
                <CheckCircleOutlined style={styles.cardHeaderIcon} />
                <span>Today's Attendance</span>
              </div>
            }
          >
            <div style={styles.attendanceContainer}>
              <Progress
                type="circle"
                percent={data?.attendance_rate || 0}
                size={160}
                strokeWidth={12}
                strokeColor={{
                  '0%': '#0d9488',
                  '100%': '#0891b2',
                }}
                format={(percent) => (
                  <div style={styles.progressContent}>
                    <span style={styles.progressValue}>{percent}%</span>
                    <span style={styles.progressLabel}>Present</span>
                  </div>
                )}
              />
              <Row gutter={16} style={styles.attendanceStats}>
                <Col span={12}>
                  <div style={styles.attendanceStat}>
                    <div style={{ ...styles.attendanceDot, background: '#10b981' }}></div>
                    <div>
                      <Text style={styles.attendanceStatValue}>
                        {Math.round((data?.total_students || 0) * (data?.attendance_rate || 0) / 100)}
                      </Text>
                      <Text style={styles.attendanceStatLabel}>Present</Text>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={styles.attendanceStat}>
                    <div style={{ ...styles.attendanceDot, background: '#ef4444' }}></div>
                    <div>
                      <Text style={styles.attendanceStatValue}>
                        {(data?.total_students || 0) - Math.round((data?.total_students || 0) * (data?.attendance_rate || 0) / 100)}
                      </Text>
                      <Text style={styles.attendanceStatLabel}>Absent</Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        {/* Quick Stats */}
        <Col xs={24} lg={16}>
          <Card
            style={styles.card}
            title={
              <div style={styles.cardHeader}>
                <RiseOutlined style={styles.cardHeaderIcon} />
                <span>Quick Overview</span>
              </div>
            }
          >
            <Row gutter={[24, 24]}>
              <Col xs={12} sm={6}>
                <div style={styles.quickStat}>
                  <div style={{ ...styles.quickStatIcon, background: 'rgba(13, 148, 136, 0.1)' }}>
                    <DollarOutlined style={{ fontSize: '20px', color: '#0d9488' }} />
                  </div>
                  <Text style={styles.quickStatValue}>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(data?.today_collection || 0)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Today's Collection</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={styles.quickStat}>
                  <div style={{ ...styles.quickStatIcon, background: 'rgba(99, 102, 241, 0.1)' }}>
                    <DollarOutlined style={{ fontSize: '20px', color: '#6366f1' }} />
                  </div>
                  <Text style={styles.quickStatValue}>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(data?.month_collection || 0)}
                  </Text>
                  <Text style={styles.quickStatLabel}>This Month</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={styles.quickStat}>
                  <div style={{ ...styles.quickStatIcon, background: 'rgba(245, 158, 11, 0.1)' }}>
                    <DollarOutlined style={{ fontSize: '20px', color: '#f59e0b' }} />
                  </div>
                  <Text style={styles.quickStatValue}>
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(data?.total_collected || 0)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Total Collected</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={styles.quickStat}>
                  <div style={{ ...styles.quickStatIcon, background: 'rgba(16, 185, 129, 0.1)' }}>
                    <CheckCircleOutlined style={{ fontSize: '20px', color: '#10b981' }} />
                  </div>
                  <Text style={styles.quickStatValue}>{Math.round(data?.collection_percentage || 0)}%</Text>
                  <Text style={styles.quickStatLabel}>Fee Collection Rate</Text>
                </div>
              </Col>
            </Row>

            {/* Recent Activity */}
            <div style={styles.recentActivity}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Text style={styles.recentActivityTitle}>Recent Activity</Text>
                <Badge status="processing" />
              </div>
              <div style={styles.activityList}>
                {data?.recent_activity && data.recent_activity.length > 0 ? (
                  data.recent_activity.map((activity: any, index: number) => (
                    <ActivityItem
                      key={index}
                      icon={activityIcon(activity.type)}
                      iconBg={activityColor(activity.type)}
                      title={activity.title}
                      description={activity.description}
                      time={timeAgo(activity.time)}
                    />
                  ))
                ) : (
                  <Text style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No recent activity yet</Text>
                )}
              </div>
            </div>
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
    padding: '0',
    minHeight: 'calc(100vh - 64px)',
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
    background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #0369a1 100%)',
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
    border: '1px solid #f0f0f0',
    borderTop: '4px solid',
    position: 'relative',
  },
  statIconBox: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 500,
    marginTop: '4px',
  },
  statTrend: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
  },
  trendText: {
    color: '#10b981',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
    height: '100%',
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
    color: '#0d9488',
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
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  progressLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  attendanceStats: {
    marginTop: '24px',
    width: '100%',
  },
  attendanceStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  attendanceDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  attendanceStatValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1e293b',
    display: 'block',
  },
  attendanceStatLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  quickStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
  },
  quickStatIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  quickStatValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    display: 'block',
  },
  quickStatLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '4px',
  },
  recentActivity: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #f0f0f0',
  },
  recentActivityTitle: {
    fontWeight: 600,
    color: '#1e293b',
    display: 'block',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '10px',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  activityTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  activityDescription: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '2px',
  },
  activityTime: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
};

export default AdminDashboard;
