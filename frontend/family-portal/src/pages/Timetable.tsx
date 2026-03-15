
import React from 'react';
import { Table } from 'antd';
import { useGetMyTimetableQuery } from '../services/timetableApi';

const Timetable: React.FC = () => {
  const { data: timetable, isLoading } = useGetMyTimetableQuery();

  const columns = [
    { title: 'Day', dataIndex: 'day_of_week', key: 'day' },
    { title: 'Period', dataIndex: ['period', 'period_number'], key: 'period' },
    { title: 'Start Time', dataIndex: ['period', 'start_time'], key: 'start_time' },
    { title: 'End Time', dataIndex: ['period', 'end_time'], key: 'end_time' },
    { title: 'Subject', dataIndex: ['subject', 'name'], key: 'subject' },
    { title: 'Teacher', dataIndex: ['teacher', 'first_name'], key: 'teacher' },
  ];

  return (
    <div>
      <h1>My Timetable</h1>
      <Table dataSource={timetable} columns={columns} loading={isLoading} rowKey="id" />
    </div>
  );
};

export default Timetable;
