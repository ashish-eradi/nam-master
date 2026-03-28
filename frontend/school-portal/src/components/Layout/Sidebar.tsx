import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import {
  DashboardOutlined,
  TeamOutlined,
  BookOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  TrophyOutlined,
  DollarOutlined,
  ReadOutlined,
  CarOutlined,
  FileTextOutlined,
  NotificationOutlined,
  CalendarOutlined,
  BarChartOutlined,
  HomeOutlined,
  UserOutlined,
  BankOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  ContainerOutlined,
  SafetyCertificateOutlined,
  MessageOutlined,
  PrinterOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const user = useSelector(selectUser);

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return '1';
    if (path === '/admission') return '2';
    if (path === '/student-management') return '16';
    if (path === '/parents') return '24';
    if (path === '/employees') return '15';
    if (path === '/subjects') return '3';
    if (path === '/classes') return '13';
    if (path === '/attendance') return '4';
    if (path === '/accounts') return '6';
    if (path === '/fee-collection') return '17';
    if (path === '/financial-reports') return '18';
    if (path === '/library') return '7';
    if (path === '/transport') return '8';
    if (path === '/exams') return '9-1';
    if (path === '/marks-entry') return '19';
    if (path === '/announcements') return '10';
    if (path === '/timetable') return '11';
    if (path === '/year-planner') return '20';
    if (path === '/reports') return '12';
    if (path === '/hostel') return '14';
    if (path === '/print-settings') return '24';
    if (path === '/certificates') return '21';
    if (path === '/whatsapp') return '22';
    return '1';
  };

  const menuItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Dashboard</Link>,
    },
    {
      key: '2',
      icon: <UsergroupAddOutlined />,
      label: <Link to="/admission">Admission</Link>,
    },
    {
      key: '16',
      icon: <ContainerOutlined />,
      label: <Link to="/student-management">Student Management</Link>,
    },
    {
      key: '24',
      icon: <TeamOutlined />,
      label: <Link to="/parents">Parents</Link>,
    },
    {
      key: '15',
      icon: <SolutionOutlined />,
      label: <Link to="/employees">Employees</Link>,
    },
    {
      key: '3',
      icon: <BookOutlined />,
      label: <Link to="/subjects">Subjects</Link>,
    },
    {
      key: '13',
      icon: <AppstoreOutlined />,
      label: <Link to="/classes">Classes</Link>,
    },
    {
      key: '4',
      icon: <CheckSquareOutlined />,
      label: <Link to="/attendance">Attendance</Link>,
    },
    {
      key: '9',
      icon: <FileTextOutlined />,
      label: 'Exams',
      children: [
        {
          key: '9-1',
          label: <Link to="/exams">Exam Management</Link>,
        },
        {
          key: '19',
          label: <Link to="/marks-entry">Marks Entry</Link>,
        },
      ],
    },
    {
      key: '6',
      icon: <DollarOutlined />,
      label: 'Accounts',
      children: [
        {
          key: '6-1',
          label: <Link to="/accounts">Fee Structure</Link>,
        },
        {
          key: '17',
          label: <Link to="/fee-collection">Fee Collection</Link>,
        },
        {
          key: '18',
          label: <Link to="/financial-reports">Financial Reports</Link>,
        },
        {
          key: '23',
          label: <Link to="/daily-expenditure">Daily Expenditure</Link>,
        },
      ],
    },
    {
      key: '7',
      icon: <ReadOutlined />,
      label: <Link to="/library">Library</Link>,
    },
    {
      key: '8',
      icon: <CarOutlined />,
      label: <Link to="/transport">Transport</Link>,
    },
    {
      key: '14',
      icon: <HomeOutlined />,
      label: <Link to="/hostel">Hostel</Link>,
    },
    {
      key: '10',
      icon: <NotificationOutlined />,
      label: <Link to="/announcements">Announcements</Link>,
    },
    {
      key: '22',
      icon: <MessageOutlined />,
      label: <Link to="/whatsapp">WhatsApp Messaging</Link>,
    },
    {
      key: '21',
      icon: <SafetyCertificateOutlined />,
      label: <Link to="/certificates">Certificates</Link>,
    },
    {
      key: '11',
      icon: <CalendarOutlined />,
      label: <Link to="/timetable">Timetable</Link>,
    },
    {
      key: '20',
      icon: <CalendarOutlined />,
      label: <Link to="/year-planner">Year Planner</Link>,
    },
    {
      key: '12',
      icon: <BarChartOutlined />,
      label: <Link to="/reports">Reports</Link>,
    },
    {
      key: '24',
      icon: <PrinterOutlined />,
      label: <Link to="/print-settings">Print Settings</Link>,
    },
  ];

  return (
    <Sider
      data-testid="sidebar"
      width={240}
      style={{
        background: '#0f766e',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          padding: '20px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          background: '#115e59',
        }}
      >
        <img
          src={user?.school?.logo_url ? `${BACKEND_URL}${user.school.logo_url}` : '/logo.png'}
          alt={user?.school?.name || 'School'}
          style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {user?.school?.name || 'Niladri Edu Pro'}
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div
        style={{
          height: 'calc(100vh - 82px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '12px 8px',
          }}
          theme="dark"
        />
      </div>

      <style>{`
        .ant-layout-sider .ant-menu-dark {
          background: transparent !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item {
          margin: 4px 0 !important;
          border-radius: 8px !important;
          height: 44px !important;
          line-height: 44px !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item a {
          color: rgba(255, 255, 255, 0.85) !important;
          font-weight: 500 !important;
          font-size: 0.9rem !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item-selected {
          background: rgba(255, 255, 255, 0.2) !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item-selected a {
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item .anticon {
          font-size: 16px !important;
          color: rgba(255, 255, 255, 0.85) !important;
        }
        .ant-layout-sider .ant-menu-dark .ant-menu-item-selected .anticon {
          color: #ffffff !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
