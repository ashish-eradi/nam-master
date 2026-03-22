import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentAcademicYear, getAcademicYearOptions } from '../utils/academicYear';
import { Card, Select, Table, Button, Input, Checkbox, message, Space, Tag, Tabs } from 'antd';
import { SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useGetExamSeriesQuery,
  useLazyGetTimetablesForSeriesQuery,
  useLazyGetMarksByScheduleItemQuery,
  useBulkCreateMarksMutation,
  type SubjectMarksEntry,
  type ExamTimetableWithSchedule,
  type ExamScheduleItemWithSubject,
} from '../services/examApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import { useGetClassesQuery } from '../services/classesApi';
import type { RootState } from '../store/store';
import moment from 'moment';

const { Option } = Select;

const MarksEntry: React.FC = () => {
  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});

  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentAcademicYear());
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);
  // marksData: keyed by scheduleItemId → studentId → entry
  const [allMarksData, setAllMarksData] = useState<Record<string, Record<string, SubjectMarksEntry>>>({});

  const { data: examSeries } = useGetExamSeriesQuery({ academic_year: selectedAcademicYear });
  const [getTimetables, { data: timetables }] = useLazyGetTimetablesForSeriesQuery();
  const { data: students } = useGetStudentsQuery();
  const { data: classes } = useGetClassesQuery();
  const [getMarks, { data: existingMarks }] = useLazyGetMarksByScheduleItemQuery();
  const [bulkSaveMarks, { isLoading: saving }] = useBulkCreateMarksMutation();

  const selectedTimetable = useMemo(
    () => timetables?.find((t) => t.class_id === selectedClassId),
    [timetables, selectedClassId]
  );

  const classStudents = useMemo(
    () => students?.filter((s: any) => s.class_id === selectedClassId) || [],
    [students, selectedClassId]
  );

  // Unique sections from the timetable classes
  const availableSections = useMemo(() => {
    if (!timetables || !classes) return [];
    const classMap = new Map(classes.map((c: any) => [c.id, c]));
    const sections = new Set<string>();
    timetables.forEach((tt) => {
      const cls = classMap.get(tt.class_id);
      if (cls?.section) sections.add(cls.section);
    });
    return Array.from(sections).sort();
  }, [timetables, classes]);

  // Timetables filtered by selected section
  const filteredTimetables = useMemo(() => {
    if (!timetables || !classes) return timetables || [];
    if (!selectedSection) return timetables;
    const classMap = new Map(classes.map((c: any) => [c.id, c]));
    return timetables.filter((tt) => {
      const cls = classMap.get(tt.class_id);
      return cls?.section === selectedSection;
    });
  }, [timetables, classes, selectedSection]);

  const scheduleItems: ExamScheduleItemWithSubject[] = useMemo(
    () => selectedTimetable?.schedule_items || [],
    [selectedTimetable]
  );

  const activeScheduleItem = useMemo(
    () => scheduleItems.find((item) => item.id === activeSubjectTab),
    [scheduleItems, activeSubjectTab]
  );

  // Load timetables when series changes
  useEffect(() => {
    if (selectedSeriesId) {
      getTimetables(selectedSeriesId);
    }
  }, [selectedSeriesId, getTimetables]);

  // Set first tab when class changes
  useEffect(() => {
    if (scheduleItems.length > 0) {
      setActiveSubjectTab(scheduleItems[0].id);
    } else {
      setActiveSubjectTab(null);
    }
  }, [selectedClassId, scheduleItems.length]);

  // Load existing marks when active tab changes
  useEffect(() => {
    if (activeScheduleItem?.id) {
      getMarks(activeScheduleItem.id);
    }
  }, [activeScheduleItem?.id, getMarks]);

  // Populate marks for active tab when existing marks load
  useEffect(() => {
    if (!activeScheduleItem?.id || classStudents.length === 0) return;
    const itemId = activeScheduleItem.id;
    if (allMarksData[itemId]) return; // already have data for this tab
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
    setAllMarksData((prev) => ({ ...prev, [itemId]: marksMap }));
  }, [activeScheduleItem?.id, existingMarks]);

  const updateMarks = (scheduleItemId: string, studentId: string, field: keyof SubjectMarksEntry, value: any) => {
    setAllMarksData((prev) => {
      const tabData = prev[scheduleItemId] || {};
      const current = tabData[studentId] || { student_id: studentId, marks_obtained: '', grade_letter: '', is_absent: false, remarks: '' };
      return { ...prev, [scheduleItemId]: { ...tabData, [studentId]: { ...current, [field]: value } } };
    });
  };

  const calculateGrade = (marks: string, maxMarks: string): string => {
    if (!marks || !maxMarks) return '';
    const pct = (parseFloat(marks) / parseFloat(maxMarks)) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  };

  const handleSaveCurrentSubject = async () => {
    if (!activeScheduleItem) { message.error('No subject selected'); return; }
    const marksArray = Object.values(allMarksData[activeScheduleItem.id] || {}).filter(
      (m) => m.marks_obtained || m.is_absent || m.remarks
    );
    await bulkSaveMarks({ exam_schedule_item_id: activeScheduleItem.id, marks: marksArray }).unwrap();
    message.success(`Marks saved for ${activeScheduleItem.subject_name}!`);
  };

  const handleSaveAllSubjects = async () => {
    if (!scheduleItems.length) { message.error('No subjects available'); return; }
    let saved = 0;
    for (const item of scheduleItems) {
      const marksArray = Object.values(allMarksData[item.id] || {}).filter(
        (m) => m.marks_obtained || m.is_absent || m.remarks
      );
      if (marksArray.length > 0) {
        await bulkSaveMarks({ exam_schedule_item_id: item.id, marks: marksArray }).unwrap();
        saved++;
      }
    }
    message.success(`Marks saved for ${saved} subject(s)!`);
  };

  const buildColumns = (scheduleItem: ExamScheduleItemWithSubject) => [
    {
      title: 'Roll No',
      dataIndex: 'roll_number',
      key: 'roll_number',
      width: 80,
      render: (roll: string) => <strong>{roll || '-'}</strong>,
    },
    {
      title: 'Student Name',
      key: 'name',
      width: 220,
      render: (_: any, record: any) => (
        <div>
          <div><strong>{record.first_name} {record.last_name}</strong></div>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.admission_number}</div>
        </div>
      ),
    },
    {
      title: `Marks (Max: ${scheduleItem.max_marks})`,
      key: 'marks',
      width: 160,
      render: (_: any, record: any) => {
        const currentValue = allMarksData[scheduleItem.id]?.[record.id]?.marks_obtained || '';
        const isDisabled = allMarksData[scheduleItem.id]?.[record.id]?.is_absent || false;
        return (
          <Input
            value={currentValue}
            disabled={isDisabled}
            onChange={(e) => {
              const val = e.target.value;
              updateMarks(scheduleItem.id, record.id, 'marks_obtained', val);
              const grade = val ? calculateGrade(val, String(scheduleItem.max_marks)) : '';
              updateMarks(scheduleItem.id, record.id, 'grade_letter', grade);
            }}
            placeholder="Enter marks"
          />
        );
      },
    },
    {
      title: 'Grade',
      key: 'grade',
      width: 80,
      render: (_: any, record: any) => {
        const grade = allMarksData[scheduleItem.id]?.[record.id]?.grade_letter;
        if (!grade) return '-';
        const color = grade.startsWith('A') ? 'green' : grade.startsWith('B') ? 'blue' : grade.startsWith('C') ? 'cyan' : grade === 'D' ? 'orange' : 'red';
        return <Tag color={color}>{grade}</Tag>;
      },
    },
    {
      title: 'Absent',
      key: 'absent',
      width: 80,
      render: (_: any, record: any) => (
        <Checkbox
          checked={allMarksData[scheduleItem.id]?.[record.id]?.is_absent || false}
          onChange={(e) => {
            const checked = e.target.checked;
            updateMarks(scheduleItem.id, record.id, 'is_absent', checked);
            if (checked) {
              updateMarks(scheduleItem.id, record.id, 'marks_obtained', '');
              updateMarks(scheduleItem.id, record.id, 'grade_letter', '');
            }
          }}
        />
      ),
    },
    {
      title: 'Remarks',
      key: 'remarks',
      width: 180,
      render: (_: any, record: any) => (
        <Input
          value={allMarksData[scheduleItem.id]?.[record.id]?.remarks || ''}
          onChange={(e) => updateMarks(scheduleItem.id, record.id, 'remarks', e.target.value)}
          placeholder="Optional"
        />
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Marks Entry</h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Academic Year</label>
            <Select value={selectedAcademicYear} onChange={setSelectedAcademicYear} style={{ width: '100%' }}>
              {getAcademicYearOptions(2, 1).map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Exam Series</label>
            <Select
              value={selectedSeriesId}
              onChange={(value) => { setSelectedSeriesId(value); setSelectedSection(null); setSelectedClassId(null); setAllMarksData({}); }}
              style={{ width: '100%' }}
              placeholder="Select exam series"
            >
              {examSeries?.map((series) => (
                <Option key={series.id} value={series.id}>{series.name} ({series.exam_type})</Option>
              ))}
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Section</label>
            <Select
              value={selectedSection}
              onChange={(value) => { setSelectedSection(value); setSelectedClassId(null); setAllMarksData({}); }}
              style={{ width: '100%' }}
              placeholder="Filter by section (optional)"
              disabled={!selectedSeriesId}
              allowClear
            >
              {availableSections.map((sec) => (
                <Option key={sec} value={sec}>Section {sec}</Option>
              ))}
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Class</label>
            <Select
              value={selectedClassId}
              onChange={(value) => { setSelectedClassId(value); setAllMarksData({}); }}
              style={{ width: '100%' }}
              placeholder="Select class"
              disabled={!selectedSeriesId}
            >
              {filteredTimetables?.map((tt) => (
                <Option key={tt.class_id} value={tt.class_id}>{tt.class_name}</Option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {selectedClassId && scheduleItems.length > 0 ? (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><strong>{classStudents.length}</strong> students · <strong>{scheduleItems.length}</strong> subjects</div>
            <Space>
              <Button icon={<SaveOutlined />} onClick={handleSaveCurrentSubject} loading={saving}>
                Save This Subject
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAllSubjects} loading={saving}>
                Save All Subjects
              </Button>
            </Space>
          </div>

          <Tabs
            activeKey={activeSubjectTab || undefined}
            onChange={(key) => setActiveSubjectTab(key)}
            items={scheduleItems.map((item) => ({
              key: item.id,
              label: (
                <span>
                  {item.subject_name}
                  <span style={{ fontSize: '11px', color: '#888', marginLeft: 4 }}>
                    ({moment(item.exam_date).format('DD MMM')} · {item.max_marks}m)
                  </span>
                </span>
              ),
              children: (
                <Table
                  key={item.id}
                  dataSource={classStudents}
                  columns={buildColumns(item)}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 900 }}
                  bordered
                  size="small"
                />
              ),
            }))}
          />
        </Card>
      ) : selectedClassId ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div style={{ fontSize: 16 }}>No exam schedule found for this class</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div style={{ fontSize: 16 }}>Please select exam series and class to enter marks</div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MarksEntry;
