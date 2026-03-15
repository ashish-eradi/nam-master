import React, { useState, useEffect } from 'react';
import { Select, DatePicker, Table, Radio, Button, message, Spin, Space, Tabs, Card } from 'antd';
import { useGetClassesQuery } from '../services/classApi';
import { useGetStudentsByClassIdQuery } from '../services/studentsApi';
import {
  useGetClassAttendanceQuery,
  useBulkMarkAttendanceMutation
} from '../services/attendanceApi';
import AttendancePreview from '../components/AttendancePreview';
import moment from 'moment';
import type { Moment } from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;

const Attendance: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Moment>(moment());

  // API Hooks
  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { data: students, isLoading: studentsLoading } = useGetStudentsByClassIdQuery(selectedClass!, { skip: !selectedClass });
  const { data: attendanceData, isLoading: attendanceLoading, refetch: refetchAttendance } = useGetClassAttendanceQuery(
    { classId: selectedClass!, date: selectedDate.format('YYYY-MM-DD') },
    { skip: !selectedClass || !selectedDate }
  );
  const [bulkMarkAttendance, { isLoading: isMarking }] = useBulkMarkAttendanceMutation();

  const [attendance, setAttendance] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // When students or attendance data loads, initialize the local state
    if (students) {
      const initialAttendance: {[key: string]: string} = {};
      students.forEach((student: any) => {
        const record = attendanceData?.find((a: any) => a.student_id === student.id);
        initialAttendance[student.id] = record ? record.status : 'P'; // Default to Present
      });
      setAttendance(initialAttendance);
    }
  }, [students, attendanceData]);

  useEffect(() => {
    // Refetch attendance when date or class changes
    if (selectedClass && selectedDate) {
      refetchAttendance();
    }
  }, [selectedDate, selectedClass, refetchAttendance]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedDate) {
      message.error('Please select a class and date.');
      return;
    }

    const attendanceToSave = Object.keys(attendance).map(student_id => ({
      student_id,
      status: attendance[student_id],
    }));

    try {
      await bulkMarkAttendance({
        class_id: selectedClass,
        date: selectedDate.format('YYYY-MM-DD'),
        attendances: attendanceToSave,
      }).unwrap();
      message.success('Attendance saved successfully!');
    } catch {
      message.error('Failed to save attendance.');
    }
  };

  const columns = [
    { title: 'Roll No', dataIndex: 'roll_number', key: 'roll_number' },
    { title: 'Name', render: (_: any, record: any) => `${record.first_name} ${record.last_name}` },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <Radio.Group
          value={attendance[record.id]}
          onChange={(e) => handleStatusChange(record.id, e.target.value)}
        >
          <Radio value="P">Present</Radio>
          <Radio value="A">Absent</Radio>
          <Radio value="L">Late</Radio>
          <Radio value="HL">Half-day</Radio>
        </Radio.Group>
      ),
    },
  ];

  return (
    <div>
      <h2>Attendance Management</h2>

      <Tabs defaultActiveKey="overview" style={{ marginBottom: 24 }}>
        <TabPane tab="Overview & Reports" key="overview">
          <AttendancePreview />
        </TabPane>

        <TabPane tab="Mark Attendance" key="mark">
          <Card title="Mark Daily Attendance">
            <Space style={{ marginBottom: 16 }}>
              <Select
                placeholder="Select Class"
                style={{ width: 200 }}
                onChange={setSelectedClass}
                loading={classesLoading}
              >
                {classes?.map((c: any) => <Option key={c.id} value={c.id}>{c.name} - {c.section}</Option>)}
              </Select>
              <DatePicker value={selectedDate} onChange={(date) => setSelectedDate(date as Moment)} />
            </Space>

            {studentsLoading || attendanceLoading ? (
              <Spin style={{ display: 'block', marginTop: 20 }} />
            ) : (
              <Table
                dataSource={students}
                columns={columns}
                rowKey="id"
                pagination={false}
                style={{ marginTop: 20 }}
              />
            )}

            <Button type="primary" onClick={handleSave} loading={isMarking} style={{ marginTop: 16 }} disabled={!selectedClass}>
              Save Attendance
            </Button>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Attendance;