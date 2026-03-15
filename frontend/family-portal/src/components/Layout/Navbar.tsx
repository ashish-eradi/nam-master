import React from 'react';
import { Layout, Dropdown, Avatar, Badge, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser, logout } from '../../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header } = Layout;
const { Text } = Typography;

const Navbar: React.FC = () => {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const titles: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/children': 'My Children',
      '/grades': 'Academic Grades',
      '/profile': 'My Profile',
      '/announcements': 'Announcements',
      '/timetable': 'Class Timetable',
      '/library': 'Library',
    };
    return titles[path] || 'Dashboard';
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Header style={styles.header} data-testid="navbar">
      {/* Left Section - Page Title */}
      <div style={styles.leftSection}>
        <h1 style={styles.pageTitle}>{getPageTitle()}</h1>
        <Text style={styles.breadcrumb}>
          Home / {getPageTitle()}
        </Text>
      </div>

      {/* Right Section - Actions */}
      <div style={styles.rightSection}>
        {/* Notification Bell */}
        <div style={styles.notificationWrapper}>
          <Badge count={3} size="small" offset={[-2, 2]}>
            <div style={styles.iconButton}>
              <BellOutlined style={styles.bellIcon} />
            </div>
          </Badge>
        </div>

        {/* Divider */}
        <div style={styles.divider}></div>

        {/* User Profile Dropdown */}
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <div style={styles.userSection}>
            <Avatar
              size={40}
              icon={<UserOutlined />}
              style={styles.avatar}
            />
            <div style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.username || 'User'}
              </Text>
              <Text style={styles.userRole}>
                {user?.role || 'Parent'}
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    background: '#ffffff',
    padding: '0 32px',
    height: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    borderBottom: '1px solid #f0f0f0',
    position: 'sticky',
    top: 0,
    zIndex: 99,
    marginLeft: 260,
  },
  leftSection: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1.3,
  },
  breadcrumb: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  notificationWrapper: {
    cursor: 'pointer',
  },
  iconButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid #e2e8f0',
  },
  bellIcon: {
    fontSize: '20px',
    color: '#64748b',
  },
  divider: {
    width: '1px',
    height: '32px',
    background: '#e2e8f0',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  avatar: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.3,
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'capitalize',
  },
};

export default Navbar;
