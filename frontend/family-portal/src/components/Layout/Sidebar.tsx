import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  NotificationOutlined,
  CalendarOutlined,
  BookOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  MessageOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const location = useLocation();

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return '1';
    if (path === '/children') return '2';
    if (path === '/grades') return '3';
    if (path === '/attendance') return '4';
    if (path === '/fees') return '5';
    if (path === '/payment-history') return '6';
    if (path === '/messages') return '7';
    if (path === '/announcements') return '8';
    if (path === '/timetable') return '9';
    if (path === '/library') return '10';
    if (path === '/profile') return '11';
    return '1';
  };

  const menuItems = [
    {
      key: '1',
      icon: <DashboardOutlined style={styles.menuIcon} />,
      label: <Link to="/dashboard" style={styles.menuLink}>Dashboard</Link>,
    },
    {
      key: '2',
      icon: <TeamOutlined style={styles.menuIcon} />,
      label: <Link to="/children" style={styles.menuLink}>My Children</Link>,
    },
    {
      key: '3',
      icon: <TrophyOutlined style={styles.menuIcon} />,
      label: <Link to="/grades" style={styles.menuLink}>Grades</Link>,
    },
    {
      key: '4',
      icon: <CheckCircleOutlined style={styles.menuIcon} />,
      label: <Link to="/attendance" style={styles.menuLink}>Attendance</Link>,
    },
    {
      key: '5',
      icon: <DollarOutlined style={styles.menuIcon} />,
      label: <Link to="/fees" style={styles.menuLink}>Fees</Link>,
    },
    {
      key: '6',
      icon: <FileTextOutlined style={styles.menuIcon} />,
      label: <Link to="/payment-history" style={styles.menuLink}>Payment History</Link>,
    },
    {
      key: '7',
      icon: <MessageOutlined style={styles.menuIcon} />,
      label: <Link to="/messages" style={styles.menuLink}>Messages</Link>,
    },
    {
      key: '8',
      icon: <NotificationOutlined style={styles.menuIcon} />,
      label: <Link to="/announcements" style={styles.menuLink}>Announcements</Link>,
    },
    {
      key: '9',
      icon: <CalendarOutlined style={styles.menuIcon} />,
      label: <Link to="/timetable" style={styles.menuLink}>Timetable</Link>,
    },
    {
      key: '10',
      icon: <BookOutlined style={styles.menuIcon} />,
      label: <Link to="/library" style={styles.menuLink}>Library</Link>,
    },
    {
      key: '11',
      icon: <UserOutlined style={styles.menuIcon} />,
      label: <Link to="/profile" style={styles.menuLink}>Profile</Link>,
    },
  ];

  return (
    <Sider
      data-testid="sidebar"
      width={260}
      style={styles.sider}
    >
      {/* Logo Section */}
      <div style={styles.logoSection}>
        <img src="/logo.png" alt="Niladri Edu Pro" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
        <div style={styles.logoText}>
          <span style={styles.logoTitle}>Niladri Edu Pro</span>
          <span style={styles.logoSubtitle}>Family Portal</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItems}
        style={styles.menu}
      />

      {/* Help Section at Bottom */}
      <div style={styles.helpSection}>
        <div style={styles.helpCard}>
          <div style={styles.helpIcon}>?</div>
          <div style={styles.helpText}>
            <span style={styles.helpTitle}>Need Help?</span>
            <span style={styles.helpSubtitle}>Contact school support</span>
          </div>
        </div>
      </div>
    </Sider>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sider: {
    background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  logoSection: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    color: 'white',
    fontSize: '1.25rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.3px',
  },
  logoSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.8rem',
    fontWeight: 500,
    marginTop: '2px',
  },
  menu: {
    background: 'transparent',
    border: 'none',
    padding: '16px 12px',
    flex: 1,
  },
  menuIcon: {
    fontSize: '18px',
  },
  menuLink: {
    fontSize: '0.95rem',
    fontWeight: 500,
  },
  helpSection: {
    padding: '20px 16px',
    marginTop: 'auto',
  },
  helpCard: {
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  helpIcon: {
    width: '36px',
    height: '36px',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  helpText: {
    display: 'flex',
    flexDirection: 'column',
  },
  helpTitle: {
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  helpSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.75rem',
    marginTop: '2px',
  },
};

export default Sidebar;
