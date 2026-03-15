import React from 'react';
import { Typography, Spin, Empty, Tag, Input } from 'antd';
import {
  NotificationOutlined,
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  PushpinFilled,
} from '@ant-design/icons';
import { useGetAnnouncementsQuery } from '../services/announcementsApi';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_high_priority?: boolean;
  created_at?: string;
  created_by_user?: {
    username?: string;
  };
  target_roles?: string[];
}

const Announcements: React.FC = () => {
  const { data: announcements, isLoading } = useGetAnnouncementsQuery();
  const [searchText, setSearchText] = React.useState('');

  const filteredAnnouncements = React.useMemo(() => {
    if (!announcements) return [];
    if (!searchText) return announcements;
    return announcements.filter(
      (a: Announcement) =>
        a.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [announcements, searchText]);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <Spin size="large" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div style={styles.headerLeft}>
          <Title level={2} style={styles.pageTitle}>Announcements</Title>
          <Text style={styles.pageSubtitle}>
            Stay updated with the latest school news and updates
          </Text>
        </div>
        <div style={styles.headerRight}>
          <Search
            placeholder="Search announcements..."
            allowClear
            style={{ width: 280 }}
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Announcements List */}
      <div style={styles.announcementsContainer}>
        {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((announcement: Announcement, index: number) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              index={index}
            />
          ))
        ) : (
          <div style={styles.emptyContainer}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text style={styles.emptyText}>
                  {searchText
                    ? 'No announcements match your search'
                    : 'No announcements available'}
                </Text>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Announcement Card Component
const AnnouncementCard: React.FC<{
  announcement: Announcement;
  index: number;
}> = ({ announcement, index }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      return 'Just now';
    } catch {
      return '';
    }
  };

  const borderColors = ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
  const borderColor = announcement.is_high_priority
    ? '#ef4444'
    : borderColors[index % borderColors.length];

  return (
    <div
      style={{
        ...styles.announcementCard,
        borderLeftColor: borderColor,
        background: announcement.is_high_priority
          ? 'linear-gradient(to right, rgba(239, 68, 68, 0.03), transparent)'
          : '#ffffff',
      }}
    >
      {/* Card Header */}
      <div style={styles.cardHeader}>
        <div style={styles.titleSection}>
          {announcement.is_high_priority && (
            <Tag color="red" style={styles.priorityTag}>
              <PushpinFilled style={{ marginRight: '4px' }} />
              Important
            </Tag>
          )}
          <Title level={4} style={styles.announcementTitle}>
            {announcement.title}
          </Title>
        </div>
        <Text style={styles.timeAgo}>{getTimeAgo(announcement.created_at)}</Text>
      </div>

      {/* Card Content */}
      <Paragraph style={styles.announcementContent}>
        {announcement.content}
      </Paragraph>

      {/* Card Footer */}
      <div style={styles.cardFooter}>
        <div style={styles.metaInfo}>
          {announcement.created_by_user?.username && (
            <div style={styles.metaItem}>
              <UserOutlined style={styles.metaIcon} />
              <Text style={styles.metaText}>
                {announcement.created_by_user.username}
              </Text>
            </div>
          )}
          {announcement.created_at && (
            <div style={styles.metaItem}>
              <CalendarOutlined style={styles.metaIcon} />
              <Text style={styles.metaText}>
                {formatDate(announcement.created_at)}
              </Text>
            </div>
          )}
        </div>
        {announcement.target_roles && announcement.target_roles.length > 0 && (
          <div style={styles.targetRoles}>
            {announcement.target_roles.map((role) => (
              <Tag key={role} style={styles.roleTag}>
                {role}
              </Tag>
            ))}
          </div>
        )}
      </div>
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
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
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
  announcementsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  announcementCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
    borderLeft: '4px solid',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  titleSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  priorityTag: {
    width: 'fit-content',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.75rem',
    display: 'inline-flex',
    alignItems: 'center',
  },
  announcementTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1.4,
  },
  timeAgo: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  announcementContent: {
    fontSize: '0.95rem',
    color: '#475569',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
    flexWrap: 'wrap',
    gap: '12px',
  },
  metaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metaIcon: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  metaText: {
    color: '#64748b',
    fontSize: '0.85rem',
  },
  targetRoles: {
    display: 'flex',
    gap: '8px',
  },
  roleTag: {
    borderRadius: '6px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#475569',
    fontSize: '0.75rem',
    textTransform: 'capitalize',
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

export default Announcements;
