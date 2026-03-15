import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import { Typography } from 'antd';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      {user?.role === 'ADMIN' && <AdminDashboard />}
      {user?.role === 'TEACHER' && <TeacherDashboard />}
    </div>
  );
};

export default DashboardPage;
