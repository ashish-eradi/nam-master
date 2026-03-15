
import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Tag, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, IdcardOutlined, BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser, logout } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { useGetLicenseStatusQuery } from '../../services/licenseApi';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const { Header } = Layout;
const { Text } = Typography;

const Navbar: React.FC = () => {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: licenseStatus } = useGetLicenseStatusQuery();

  const handleLogout = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore errors — clear state regardless
    }
    dispatch(logout());
    navigate('/login');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'blue';
      case 'TEACHER': return 'green';
      case 'SUPERADMIN': return 'purple';
      default: return 'default';
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="profile" disabled style={{ cursor: 'default' }}>
        <div style={{ padding: '8px 0' }}>
          <div><strong>{user?.full_name || user?.username || 'User'}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{user?.email}</div>
          {user?.employee_id && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <IdcardOutlined /> Employee ID: {user.employee_id}
            </div>
          )}
          {user?.school && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <BankOutlined /> {user.school.name}
            </div>
          )}
        </div>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-testid="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user?.school?.logo_url ? (
          <img
            src={`${BACKEND_URL}${user.school.logo_url}`}
            alt={user.school.name}
            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
          />
        ) : (
          <BankOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
        )}
        <h2 style={{ margin: 0 }}>{user?.school?.name || 'School Portal'}</h2>
      </div>
      <Space size="middle">
        {licenseStatus?.is_licensed && !licenseStatus.is_expired && licenseStatus.days_remaining !== null && licenseStatus.days_remaining <= 7 && (
          <Tag icon={<SafetyCertificateOutlined />} color="warning" style={{ margin: 0 }}>
            License expires in {licenseStatus.days_remaining} day{licenseStatus.days_remaining !== 1 ? 's' : ''}
          </Tag>
        )}
        <div style={{ textAlign: 'right' }}>
          <div>
            <Text strong>{user?.full_name || user?.username || 'User'}</Text>
            <Tag color={getRoleColor(user?.role || '')} style={{ marginLeft: 8 }}>
              {user?.role}
            </Tag>
          </div>
          {user?.employee_id && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ID: {user.employee_id}
            </Text>
          )}
        </div>
        <Dropdown overlay={menu} trigger={['click']}>
          <a onClick={e => e.preventDefault()}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          </a>
        </Dropdown>
      </Space>
    </Header>
  );
};

export default Navbar;
