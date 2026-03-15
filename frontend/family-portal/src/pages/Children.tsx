import React from 'react';
import { Row, Col, Typography, Spin, Empty } from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  BookOutlined,
  CalendarOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useGetMyChildrenQuery } from '../services/familyApi';

const { Text, Title } = Typography;

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  date_of_birth?: string;
  gender?: string;
  class_?: {
    name: string;
    section?: string;
  };
}

const Children: React.FC = () => {
  const { data: children, isLoading } = useGetMyChildrenQuery();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <Spin size="large" />
          <Text style={styles.loadingText}>Loading children information...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <Title level={2} style={styles.pageTitle}>My Children</Title>
        <Text style={styles.pageSubtitle}>
          View and manage your children's academic profiles
        </Text>
      </div>

      {/* Children Grid */}
      {children && children.length > 0 ? (
        <Row gutter={[24, 24]}>
          {children.map((child: Child, index: number) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={child.id}>
              <ChildCard child={child} index={index} />
            </Col>
          ))}
        </Row>
      ) : (
        <div style={styles.emptyContainer}>
          <Empty
            description={
              <Text style={styles.emptyText}>No children found in your account</Text>
            }
          />
        </div>
      )}
    </div>
  );
};

// Child Card Component
const ChildCard: React.FC<{ child: Child; index: number }> = ({ child, index }) => {
  const gradientColors = [
    'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  ];

  const getInitials = () => {
    return `${child.first_name?.charAt(0) || ''}${child.last_name?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div style={styles.childCard}>
      {/* Card Header with Avatar */}
      <div style={{ ...styles.cardHeader, background: gradientColors[index % 4] }}>
        <div style={styles.avatarContainer}>
          <div style={styles.avatar}>
            {getInitials() || <UserOutlined />}
          </div>
        </div>
        <Title level={4} style={styles.childName}>
          {child.first_name} {child.last_name}
        </Title>
        {child.class_ && (
          <div style={styles.classBadge}>
            <BookOutlined style={{ marginRight: '6px' }} />
            {child.class_.name} {child.class_.section && `- ${child.class_.section}`}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={styles.cardBody}>
        <InfoRow
          icon={<IdcardOutlined style={styles.infoIcon} />}
          label="Admission No."
          value={child.admission_number}
        />
        {child.date_of_birth && (
          <InfoRow
            icon={<CalendarOutlined style={styles.infoIcon} />}
            label="Date of Birth"
            value={formatDate(child.date_of_birth)}
          />
        )}
        {child.gender && (
          <InfoRow
            icon={<UserOutlined style={styles.infoIcon} />}
            label="Gender"
            value={child.gender}
          />
        )}
      </div>

      {/* Card Footer */}
      <div style={styles.cardFooter}>
        <div style={styles.actionButton}>
          <MailOutlined style={{ marginRight: '8px' }} />
          View Profile
        </div>
      </div>
    </div>
  );
};

// Info Row Component
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div style={styles.infoRow}>
    <div style={styles.infoLabel}>
      {icon}
      <Text style={styles.infoLabelText}>{label}</Text>
    </div>
    <Text style={styles.infoValue}>{value}</Text>
  </div>
);

// Helper function to format date
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
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
  pageHeader: {
    marginBottom: '32px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
  },
  childCard: {
    background: '#ffffff',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    padding: '32px 24px',
    textAlign: 'center',
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: '16px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'white',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  childName: {
    color: 'white',
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '12px',
  },
  classBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '6px 16px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  cardBody: {
    padding: '24px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  infoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  infoIcon: {
    color: '#64748b',
    fontSize: '16px',
  },
  infoLabelText: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
  infoValue: {
    color: '#1e293b',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  cardFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #f0f0f0',
    background: '#f8fafc',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 500,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  emptyContainer: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '64px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '1rem',
  },
};

export default Children;
