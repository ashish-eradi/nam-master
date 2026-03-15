import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Table, Button, Input, Checkbox, message, Space, Tag } from 'antd';
import { SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useGetExamSeriesQuery,
  useLazyGetTimetablesForSeriesQuery,
  useLazyGetMarksByScheduleItemQuery,
  useBulkCreateMarksMutation,
  type SubjectMarksEntry,
} from '../services/examApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import type { RootState } from '../store/store';
import moment from 'moment';

const { Option } = Select;

const MarksEntry: React.FC = () => {
  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});

  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2025-26');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [marksData, setMarksData] = useState<Record<string, SubjectMarksEntry>>({});

  // API hooks
  const { data: examSeries } = useGetExamSeriesQuery({ academic_year: selectedAcademicYear });
  const [getTimetables, { data: timetables }] = useLazyGetTimetablesForSeriesQuery();
  const { data: students } = useGetStudentsQuery();
  const [getMarks, { data: existingMarks }] = useLazyGetMarksByScheduleItemQuery();
  const [bulkSaveMarks, { isLoading: saving }] = useBulkCreateMarksMutation();

  // Get selected timetable and schedule item (memoized to prevent unnecessary recalculations)
  const selectedTimetable = useMemo(
    () => timetables?.find((t) => t.class_id === selectedClassId),
    [timetables, selectedClassId]
  );

  const selectedScheduleItem = useMemo(
    () => selectedTimetable?.schedule_items.find((item) => item.subject_id === selectedSubjectId),
    [selectedTimetable, selectedSubjectId]
  );

  // Filter students by selected class (memoized to prevent useEffect loop)
  const classStudents = useMemo(
    () => students?.filter((s: any) => s.class_id === selectedClassId) || [],
    [students, selectedClassId]
  );

  // Load timetables when series changes
  useEffect(() => {
    if (selectedSeriesId) {
      getTimetables(selectedSeriesId);
    }
  }, [selectedSeriesId, getTimetables]);

  // Load existing marks when subject changes
  useEffect(() => {
    if (selectedScheduleItem?.id) {
      getMarks(selectedScheduleItem.id);
    }
  }, [selectedScheduleItem?.id, getMarks]);

  // Populate marks data ONLY when schedule item changes (not when user is typing)
  useEffect(() => {
    if (classStudents.length > 0 && selectedScheduleItem?.id) {
      const marksMap: Record<string, SubjectMarksEntry> = {};
      classStudents.forEach((student: any) => {
        const existingMark = existingMarks?.find((m) => m.student_id === student.id);
        marksMap[student.id] = {
          student_id: student.id,
          marks_obtained: existingMark?.marks_obtained ? String(existingMark.marks_obtained) : '',
          grade_letter: existingMark?.grade_letter || '',
          is_absent: existingMark?.is_absent || false,
          remarks: existingMark?.remarks || '',
        };
      });
      setMarksData(marksMap);
    } else {
      setMarksData({});
    }
    // Only re-run when schedule item ID changes, NOT when classStudents array changes
  }, [selectedScheduleItem?.id, existingMarks]);

  const updateMarks = (studentId: string, field: keyof SubjectMarksEntry, value: any) => {
    setMarksData((prev) => {
      const current = prev[studentId] || {
        student_id: studentId,
        marks_obtained: '',
        grade_letter: '',
        is_absent: false,
        remarks: ''
      };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSaveMarks = async () => {
    if (!selectedScheduleItem) {
      message.error('Please select a subject');
      return;
    }

    try {
      const marksArray = Object.values(marksData).filter(
        (m) => m.marks_obtained || m.is_absent || m.remarks
      );

      await bulkSaveMarks({
        exam_schedule_item_id: selectedScheduleItem.id,
        marks: marksArray,
      }).unwrap();

      message.success(`Marks saved successfully! Updated ${marksArray.length} students.`);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to save marks');
    }
  };

  const calculateGrade = (marks: string, maxMarks: string): string => {
    if (!marks || !maxMarks) return '';
    const percentage = (parseFloat(marks) / parseFloat(maxMarks)) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Memoize columns to prevent Table from recreating inputs on every render
  const columns = useMemo(() => [
    {
      title: 'Roll No',
      dataIndex: 'roll_number',
      key: 'roll_number',
      width: 100,
      render: (roll: string) => <strong>{roll || '-'}</strong>,
    },
    {
      title: 'Student Name',
      key: 'name',
      width: 250,
      render: (_: any, record: any) => (
        <div>
          <div><strong>{record.first_name} {record.last_name}</strong></div>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.admission_number}</div>
        </div>
      ),
    },
    {
      title: 'Marks Obtained',
      key: 'marks',
      width: 150,
      render: (_: any, record: any) => {
        const currentValue = marksData[record.id]?.marks_obtained || '';
        const isDisabled = marksData[record.id]?.is_absent || false;

        return (
          <Input
            value={currentValue}
            disabled={isDisabled}
            onChange={(e) => {
              const val = e.target.value;
              updateMarks(record.id, 'marks_obtained', val);
              if (val && selectedScheduleItem) {
                const grade = calculateGrade(val, selectedScheduleItem.max_marks);
                updateMarks(record.id, 'grade_letter', grade);
              } else {
                updateMarks(record.id, 'grade_letter', '');
              }
            }}
            style={{ width: '100%' }}
            placeholder="Enter marks"
          />
        );
      },
    },
    {
      title: 'Grade',
      key: 'grade',
      width: 100,
      render: (_: any, record: any) => {
        const grade = marksData[record.id]?.grade_letter;
        if (!grade) return '-';

        let color = 'default';
        if (grade.startsWith('A')) color = 'green';
        else if (grade.startsWith('B')) color = 'blue';
        else if (grade.startsWith('C')) color = 'cyan';
        else if (grade === 'D') color = 'orange';
        else color = 'red';

        return <Tag color={color}>{grade}</Tag>;
      },
    },
    {
      title: 'Absent',
      key: 'absent',
      width: 100,
      render: (_: any, record: any) => {
        const isChecked = marksData[record.id]?.is_absent || false;
        return (
          <Checkbox
            checked={isChecked}
            onChange={(e) => {
              const checked = e.target.checked;
              updateMarks(record.id, 'is_absent', checked);
              if (checked) {
                updateMarks(record.id, 'marks_obtained', '');
                updateMarks(record.id, 'grade_letter', '');
              }
            }}
          />
        );
      },
    },
    {
      title: 'Remarks',
      key: 'remarks',
      width: 200,
      render: (_: any, record: any) => {
        const remarksValue = marksData[record.id]?.remarks || '';
        return (
          <Input
            value={remarksValue}
            onChange={(e) => updateMarks(record.id, 'remarks', e.target.value)}
            placeholder="Optional remarks"
          />
        );
      },
    },
  ], [marksData, selectedScheduleItem, updateMarks, calculateGrade]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Marks Entry</h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Academic Year</label>
              <Select
                value={selectedAcademicYear}
                onChange={setSelectedAcademicYear}
                style={{ width: '100%' }}
              >
                <Option value="2024-25">2024-25</Option>
                <Option value="2025-26">2025-26</Option>
                <Option value="2026-27">2026-27</Option>
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Exam Series</label>
              <Select
                value={selectedSeriesId}
                onChange={(value) => {
                  setSelectedSeriesId(value);
                  setSelectedClassId(null);
                  setSelectedSubjectId(null);
                }}
                style={{ width: '100%' }}
                placeholder="Select exam series"
              >
                {examSeries?.map((series) => (
                  <Option key={series.id} value={series.id}>
                    {series.name} ({series.exam_type})
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Class</label>
              <Select
                value={selectedClassId}
                onChange={(value) => {
                  setSelectedClassId(value);
                  setSelectedSubjectId(null);
                }}
                style={{ width: '100%' }}
                placeholder="Select class"
                disabled={!selectedSeriesId}
              >
                {timetables?.map((tt) => (
                  <Option key={tt.class_id} value={tt.class_id}>
                    {tt.class_name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Subject</label>
              <Select
                value={selectedSubjectId}
                onChange={setSelectedSubjectId}
                style={{ width: '100%' }}
                placeholder="Select subject"
                disabled={!selectedClassId}
              >
                {selectedTimetable?.schedule_items.map((item) => (
                  <Option key={item.id} value={item.subject_id}>
                    {item.subject_name} - {moment(item.exam_date).format('DD MMM YYYY')} ({item.max_marks} marks)
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          {selectedScheduleItem && (
            <Card size="small" style={{ background: '#f0f2f5' }}>
              <Space direction="vertical" size="small">
                <div>
                  <strong>Subject:</strong> {selectedScheduleItem.subject_name}
                </div>
                <Space split="|">
                  <span><strong>Date:</strong> {moment(selectedScheduleItem.exam_date).format('DD MMM YYYY')}</span>
                  <span><strong>Time:</strong> {selectedScheduleItem.start_time}</span>
                  <span><strong>Duration:</strong> {selectedScheduleItem.duration_minutes} mins</span>
                  <span><strong>Max Marks:</strong> {selectedScheduleItem.max_marks}</span>
                  <span><strong>Passing:</strong> {selectedScheduleItem.passing_marks || '-'}</span>
                </Space>
              </Space>
            </Card>
          )}
        </Space>
      </Card>

      {selectedScheduleItem ? (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{classStudents.length}</strong> students in this class
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveMarks}
              loading={saving}
              size="large"
            >
              Save All Marks
            </Button>
          </div>

          <Table
            key={selectedScheduleItem?.id || 'marks-table'}
            dataSource={classStudents}
            columns={columns}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1000 }}
            bordered
          />
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div style={{ fontSize: 16 }}>Please select exam series, class, and subject to enter marks</div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MarksEntry;
