import React, { useState, useEffect } from 'react';
import { getCurrentAcademicYear, getAcademicYearOptions } from '../utils/academicYear';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Space, Popconfirm, message, Card, Tag, Descriptions, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, EyeOutlined, CalendarOutlined, BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useGetExamSeriesQuery,
  useCreateExamSeriesMutation,
  useUpdateExamSeriesMutation,
  useDeleteExamSeriesMutation,
  useGetTimetablesForSeriesQuery,
  useLazyGetTimetablesForSeriesQuery,
  useCreateTimetableMutation,
  useDeleteTimetableMutation,
  useLazyGetClassHallTicketsQuery,
  useLazyDownloadAdmitCardQuery,
  useLazyDownloadClassAdmitCardsQuery,
  useLazyDownloadReportCardQuery,
  useLazyDownloadClassReportCardsQuery,
  useLazyGetStudentMarksSheetQuery,
  ExamType,
  type ExamSeries,
  type ExamSeriesCreate,
  type ExamTimetableCreate,
  type ExamScheduleItemCreate,
} from '../services/examApi';
import { useGetClassesQuery } from '../services/classesApi';
import { useGetSubjectsQuery } from '../services/subjectsApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import type { RootState } from '../store/store';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Exams: React.FC = () => {
  const [activeTab, setActiveTab] = useState('series');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentAcademicYear());
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  // Results viewing state
  const [resultsSeriesId, setResultsSeriesId] = useState<string | null>(null);
  const [resultsClassId, setResultsClassId] = useState<string | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Auth state
  const { school_id: schoolId, id: userId } = useSelector((state: RootState) => state.auth.user || {});

  // API hooks
  const { data: examSeries, isLoading: seriesLoading } = useGetExamSeriesQuery({ academic_year: selectedAcademicYear });
  const [createExamSeries] = useCreateExamSeriesMutation();
  const [updateExamSeries] = useUpdateExamSeriesMutation();
  const [deleteExamSeries] = useDeleteExamSeriesMutation();

  const { data: classes } = useGetClassesQuery();
  const { data: subjects } = useGetSubjectsQuery();
  const { data: allStudents } = useGetStudentsQuery();
  const [getStudentMarksSheet] = useLazyGetStudentMarksSheetQuery();

  // Exam Series Modal
  const [isSeriesModalVisible, setIsSeriesModalVisible] = useState(false);
  const [editingSeries, setEditingSeries] = useState<ExamSeries | null>(null);
  const [seriesForm] = Form.useForm();

  // Timetable Modal
  const [isTimetableModalVisible, setIsTimetableModalVisible] = useState(false);
  const [timetableForm] = Form.useForm();
  const [scheduleItems, setScheduleItems] = useState<ExamScheduleItemCreate[]>([]);

  // Hall Tickets
  const [isHallTicketModalVisible, setIsHallTicketModalVisible] = useState(false);
  const [hallTickets, setHallTickets] = useState<any[]>([]);
  const [getClassHallTickets] = useLazyGetClassHallTicketsQuery();

  // Admit Card & Report Card Downloads
  const [downloadAdmitCard] = useLazyDownloadAdmitCardQuery();
  const [downloadClassAdmitCards] = useLazyDownloadClassAdmitCardsQuery();
  const [downloadReportCard] = useLazyDownloadReportCardQuery();
  const [downloadClassReportCards] = useLazyDownloadClassReportCardsQuery();
  const [bulkReportCardLoading, setBulkReportCardLoading] = useState(false);

  // View Timetables
  const [isTimetablesViewModalVisible, setIsTimetablesViewModalVisible] = useState(false);
  const [viewingSeriesId, setViewingSeriesId] = useState<string | null>(null);
  const [getTimetablesForSeries] = useLazyGetTimetablesForSeriesQuery();

  // Exam Series Functions
  const showSeriesModal = (series: ExamSeries | null = null) => {
    setEditingSeries(series);
    if (series) {
      seriesForm.setFieldsValue({
        name: series.name,
        exam_type: series.exam_type,
        academic_year: series.academic_year,
        description: series.description,
        dates: [moment(series.start_date), moment(series.end_date)],
        is_published: series.is_published,
      });
    } else {
      seriesForm.resetFields();
      seriesForm.setFieldsValue({ academic_year: selectedAcademicYear });
    }
    setIsSeriesModalVisible(true);
  };

  const handleSeriesOk = async () => {
    try {
      const values = await seriesForm.validateFields();
      const seriesData: ExamSeriesCreate = {
        name: values.name,
        exam_type: values.exam_type,
        academic_year: values.academic_year,
        school_id: schoolId,
        description: values.description,
        start_date: values.dates[0].format('YYYY-MM-DD'),
        end_date: values.dates[1].format('YYYY-MM-DD'),
        is_published: values.is_published || false,
      };

      if (editingSeries) {
        await updateExamSeries({ id: editingSeries.id, body: seriesData }).unwrap();
        message.success('Exam series updated successfully!');
      } else {
        await createExamSeries(seriesData).unwrap();
        message.success('Exam series created successfully!');
      }
      setIsSeriesModalVisible(false);
      seriesForm.resetFields();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to save exam series');
    }
  };

  const handleDeleteSeries = async (id: string) => {
    try {
      await deleteExamSeries(id).unwrap();
      message.success('Exam series deleted successfully!');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to delete exam series');
    }
  };

  // Timetable Functions
  const showTimetableModal = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    timetableForm.resetFields();
    setScheduleItems([]);
    setIsTimetableModalVisible(true);
  };

  const addScheduleItem = () => {
    const item: any = {
      subject_id: '',
      exam_date: '',
      start_time: '',
      duration_minutes: 0,
      max_marks: 0,
      passing_marks: 0,
      room_number: '',
      instructions: '',
    };
    setScheduleItems([...scheduleItems, item]);
  };

  const updateScheduleItem = (index: number, field: string, value: any) => {
    const newItems = [...scheduleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setScheduleItems(newItems);
  };

  const removeScheduleItem = (index: number) => {
    setScheduleItems(scheduleItems.filter((_, i) => i !== index));
  };

  const [createTimetable] = useCreateTimetableMutation();

  const handleTimetableOk = async () => {
    try {
      const values = await timetableForm.validateFields();

      if (scheduleItems.length === 0) {
        message.error('Please add at least one subject to the timetable');
        return;
      }

      const timetableData: ExamTimetableCreate = {
        exam_series_id: selectedSeriesId!,
        class_id: values.class_id,
        school_id: schoolId,
        instructions: values.instructions,
        schedule_items: scheduleItems,
      };

      await createTimetable(timetableData).unwrap();
      message.success('Timetable created successfully!');
      setIsTimetableModalVisible(false);
      timetableForm.resetFields();
      setScheduleItems([]);
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to create timetable');
    }
  };

  // Hall Tickets
  const handleGenerateHallTickets = async (seriesId: string, classId: string) => {
    try {
      const tickets = await getClassHallTickets({ exam_series_id: seriesId, class_id: classId }).unwrap();
      setHallTickets(tickets);
      setIsHallTicketModalVisible(true);
      message.success('Hall tickets generated successfully!');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to generate hall tickets');
    }
  };

  // Download Admit Cards for Class
  const handleDownloadClassAdmitCards = async (seriesId: string, classId: string, seriesName: string, className: string) => {
    try {
      const pdfBlob = await downloadClassAdmitCards({ exam_series_id: seriesId, class_id: classId }).unwrap();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admit_cards_${className}_${seriesName.replace(/ /g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Class admit cards downloaded successfully!');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to download admit cards');
    }
  };

  // View Timetables
  const handleViewTimetables = (seriesId: string) => {
    setViewingSeriesId(seriesId);
    setIsTimetablesViewModalVisible(true);
  };

  // Get timetables when modal opens
  const { data: timetablesData, isLoading: timetablesLoading } = useGetTimetablesForSeriesQuery(
    viewingSeriesId!,
    { skip: !viewingSeriesId }
  );

  // Load results when series and class are selected
  useEffect(() => {
    const loadResults = async () => {
      if (!resultsSeriesId || !resultsClassId) {
        setStudentResults([]);
        return;
      }

      setLoadingResults(true);
      try {
        // Get students in the selected class
        const classStudents = allStudents?.filter((s: any) => s.class_id === resultsClassId) || [];

        // Fetch marks for each student
        const resultsPromises = classStudents.map(async (student: any) => {
          try {
            const marksSheet = await getStudentMarksSheet({
              student_id: student.id,
              exam_series_id: resultsSeriesId
            }).unwrap();
            return {
              student_id: student.id,
              roll_number: student.roll_number,
              admission_number: student.admission_number,
              student_name: `${student.first_name} ${student.last_name}`,
              marks: marksSheet.marks || [],
              total_marks_obtained: marksSheet.total_marks_obtained || 0,
              total_max_marks: marksSheet.total_max_marks || 0,
              percentage: marksSheet.percentage || 0,
              overall_grade: marksSheet.overall_grade || '-',
            };
          } catch (error) {
            return {
              student_id: student.id,
              roll_number: student.roll_number,
              admission_number: student.admission_number,
              student_name: `${student.first_name} ${student.last_name}`,
              marks: [],
              total_marks_obtained: 0,
              total_max_marks: 0,
              percentage: 0,
              overall_grade: '-',
            };
          }
        });

        const results = await Promise.all(resultsPromises);
        setStudentResults(results);
      } catch (error: any) {
        message.error('Failed to load results');
      } finally {
        setLoadingResults(false);
      }
    };

    loadResults();
  }, [resultsSeriesId, resultsClassId, allStudents, getStudentMarksSheet]);

  // Columns for Exam Series Table
  const seriesColumns = [
    {
      title: 'Exam Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Type',
      dataIndex: 'exam_type',
      key: 'exam_type',
      render: (type: ExamType) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
    },
    {
      title: 'Start Date',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (date: string) => moment(date).format('DD MMM YYYY'),
    },
    {
      title: 'End Date',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (date: string) => moment(date).format('DD MMM YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'is_published',
      key: 'is_published',
      render: (published: boolean) => (
        <Tag color={published ? 'green' : 'orange'}>{published ? 'Published' : 'Draft'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ExamSeries) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewTimetables(record.id)}
          >
            View Timetables
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showSeriesModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => showTimetableModal(record.id)}
          >
            Add Timetable
          </Button>
          <Popconfirm
            title="Delete this exam series?"
            onConfirm={() => handleDeleteSeries(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Get unique subjects from first student's marks to build dynamic columns
  const getResultsColumns = () => {
    const baseColumns: any[] = [
      {
        title: 'Roll No',
        dataIndex: 'roll_number',
        key: 'roll_number',
        fixed: 'left',
        width: 80,
        render: (text: string) => <strong>{text || '-'}</strong>,
      },
      {
        title: 'Student Name',
        dataIndex: 'student_name',
        key: 'student_name',
        fixed: 'left',
        width: 200,
        render: (text: string, record: any) => (
          <div>
            <div><strong>{text}</strong></div>
            <div style={{ fontSize: '12px', color: '#888' }}>{record.admission_number}</div>
          </div>
        ),
      },
    ];

    // Add subject columns dynamically
    if (studentResults.length > 0 && studentResults[0].marks.length > 0) {
      // Get unique subjects from timetable
      const selectedTimetable = timetablesData?.find((t: any) => t.class_id === resultsClassId);
      if (selectedTimetable) {
        selectedTimetable.schedule_items.forEach((item: any) => {
          baseColumns.push({
            title: item.subject_name,
            key: `subject_${item.subject_id}`,
            width: 120,
            render: (_: any, record: any) => {
              const subjectMark = record.marks.find((m: any) =>
                m.exam_schedule_item_id === item.id
              );
              if (!subjectMark) return <span style={{ color: '#999' }}>-</span>;
              if (subjectMark.is_absent) return <Tag color="red">Absent</Tag>;
              return (
                <div>
                  <div><strong>{subjectMark.marks_obtained || '-'}</strong> / {item.max_marks}</div>
                  {subjectMark.grade_letter && (
                    <Tag color={
                      subjectMark.grade_letter.startsWith('A') ? 'green' :
                      subjectMark.grade_letter.startsWith('B') ? 'blue' :
                      subjectMark.grade_letter.startsWith('C') ? 'cyan' :
                      subjectMark.grade_letter === 'D' ? 'orange' : 'red'
                    }>{subjectMark.grade_letter}</Tag>
                  )}
                </div>
              );
            },
          });
        });
      }
    }

    // Add summary columns
    baseColumns.push(
      {
        title: 'Total Marks',
        key: 'total_marks',
        width: 120,
        render: (_: any, record: any) => (
          <strong>{record.total_marks_obtained} / {record.total_max_marks}</strong>
        ),
      },
      {
        title: 'Percentage',
        dataIndex: 'percentage',
        key: 'percentage',
        width: 100,
        render: (percentage: number) => (
          <strong style={{ color: percentage >= 90 ? 'green' : percentage >= 60 ? 'blue' : percentage >= 40 ? 'orange' : 'red' }}>
            {percentage.toFixed(2)}%
          </strong>
        ),
      },
      {
        title: 'Grade',
        dataIndex: 'overall_grade',
        key: 'overall_grade',
        width: 80,
        render: (grade: string) => (
          <Tag color={
            grade.startsWith('A') ? 'green' :
            grade.startsWith('B') ? 'blue' :
            grade.startsWith('C') ? 'cyan' :
            grade === 'D' ? 'orange' : 'red'
          }>{grade}</Tag>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_: any, record: any) => (
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const pdfBlob = await downloadReportCard({
                  student_id: record.student_id,
                  exam_series_id: resultsSeriesId!
                }).unwrap();
                const url = window.URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report_card_${record.admission_number}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                message.success('Report card downloaded!');
              } catch (error: any) {
                message.error('Failed to download report card');
              }
            }}
          >
            Report Card
          </Button>
        ),
      }
    );

    return baseColumns;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Exam Management ⚡</h2>
        <Space>
          <Select
            value={selectedAcademicYear}
            onChange={setSelectedAcademicYear}
            style={{ width: 150 }}
          >
            {getAcademicYearOptions(2, 1).map(y => <Option key={y} value={y}>{y}</Option>)}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showSeriesModal()}
          >
            Create Exam Series
          </Button>
        </Space>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Exam Series" key="series">
            <Table
              dataSource={examSeries}
              columns={seriesColumns}
              loading={seriesLoading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab={<span><BarChartOutlined /> Results & Marks</span>} key="results">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Exam Series</label>
                  <Select
                    value={resultsSeriesId}
                    onChange={(value) => {
                      setResultsSeriesId(value);
                      setResultsClassId(null);
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
                    value={resultsClassId}
                    onChange={setResultsClassId}
                    style={{ width: '100%' }}
                    placeholder="Select class"
                    disabled={!resultsSeriesId}
                  >
                    {classes?.map((cls: any) => (
                      <Option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>

              {loadingResults ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin size="large" />
                  <p style={{ marginTop: 16 }}>Loading results...</p>
                </div>
              ) : resultsSeriesId && resultsClassId && studentResults.length > 0 ? (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{studentResults.length}</strong> students
                    </div>
                    <Space>
                      <Tag color="blue">
                        {examSeries?.find(s => s.id === resultsSeriesId)?.name}
                      </Tag>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        loading={bulkReportCardLoading}
                        onClick={async () => {
                          if (!resultsSeriesId || !resultsClassId) return;
                          setBulkReportCardLoading(true);
                          try {
                            const pdfBlob = await downloadClassReportCards({
                              exam_series_id: resultsSeriesId,
                              class_id: resultsClassId,
                            }).unwrap();
                            const url = window.URL.createObjectURL(pdfBlob);
                            const a = document.createElement('a');
                            a.href = url;
                            const seriesName = examSeries?.find(s => s.id === resultsSeriesId)?.name || 'exam';
                            const className = classes?.find((c: any) => c.id === resultsClassId)?.name || 'class';
                            a.download = `report_cards_${className}_${seriesName}.pdf`.replace(/\s+/g, '_');
                            a.click();
                            window.URL.revokeObjectURL(url);
                            message.success('All report cards downloaded!');
                          } catch (error: any) {
                            message.error('Failed to download report cards');
                          } finally {
                            setBulkReportCardLoading(false);
                          }
                        }}
                      >
                        Download All Report Cards
                      </Button>
                    </Space>
                  </div>
                  <Table
                    dataSource={studentResults}
                    columns={getResultsColumns()}
                    rowKey="student_id"
                    pagination={false}
                    scroll={{ x: 1400 }}
                    bordered
                  />
                </div>
              ) : resultsSeriesId && resultsClassId ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div style={{ fontSize: 16 }}>No marks found for this class</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div style={{ fontSize: 16 }}>Please select exam series and class to view results</div>
                </div>
              )}
            </Space>
          </TabPane>
        </Tabs>
      </Card>

      {/* Exam Series Modal */}
      <Modal
        title={editingSeries ? 'Edit Exam Series' : 'Create Exam Series'}
        open={isSeriesModalVisible}
        onOk={handleSeriesOk}
        onCancel={() => setIsSeriesModalVisible(false)}
        width={600}
        okText={editingSeries ? 'Update' : 'Create'}
      >
        <Form form={seriesForm} layout="vertical">
          <Form.Item
            name="name"
            label="Exam Name"
            rules={[{ required: true, message: 'Please enter exam name' }]}
          >
            <Input placeholder="e.g., Midterm Examination 2025-26" />
          </Form.Item>

          <Form.Item
            name="exam_type"
            label="Exam Type"
            rules={[{ required: true, message: 'Please select exam type' }]}
          >
            <Select placeholder="Select exam type">
              {Object.values(ExamType).filter(v => isNaN(Number(v))).map((type) => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="academic_year"
            label="Academic Year"
            rules={[{ required: true, message: 'Please enter academic year' }]}
          >
            <Input placeholder="e.g., 2025-26" />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Exam Period"
            rules={[{ required: true, message: 'Please select exam dates' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Enter exam description or instructions" />
          </Form.Item>

          <Form.Item name="is_published" valuePropName="checked">
            <Select placeholder="Publication Status">
              <Option value={false}>Draft</Option>
              <Option value={true}>Published</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Timetable Modal */}
      <Modal
        title="Create Exam Timetable"
        open={isTimetableModalVisible}
        onOk={handleTimetableOk}
        onCancel={() => setIsTimetableModalVisible(false)}
        width={900}
        okText="Create Timetable"
      >
        <Form form={timetableForm} layout="vertical">
          <Form.Item
            name="class_id"
            label="Class"
            rules={[{ required: true, message: 'Please select a class' }]}
          >
            <Select placeholder="Select class">
              {classes?.map((cls: any) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.section}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="instructions" label="General Instructions">
            <Input.TextArea rows={2} placeholder="Enter general exam instructions" />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <Button type="dashed" onClick={addScheduleItem} block icon={<PlusOutlined />}>
              Add Subject
            </Button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {scheduleItems.map((item, index) => (
              <Card key={index} size="small" style={{ marginBottom: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ width: '100%' }}>
                    <Select
                      placeholder="Subject"
                      style={{ width: 200 }}
                      value={item.subject_id || undefined}
                      onChange={(value) => updateScheduleItem(index, 'subject_id', value)}
                    >
                      {subjects?.map((sub: any) => (
                        <Option key={sub.id} value={sub.id}>
                          {sub.name}
                        </Option>
                      ))}
                    </Select>
                    <DatePicker
                      placeholder="Exam Date"
                      value={item.exam_date ? moment(item.exam_date) : null}
                      onChange={(date) =>
                        updateScheduleItem(index, 'exam_date', date ? date.format('YYYY-MM-DD') : '')
                      }
                    />
                    <Input
                      placeholder="Time (e.g., 09:00 AM)"
                      style={{ width: 150 }}
                      value={item.start_time}
                      onChange={(e) => updateScheduleItem(index, 'start_time', e.target.value)}
                    />
                    <Button danger onClick={() => removeScheduleItem(index)}>
                      Remove
                    </Button>
                  </Space>
                  <Space style={{ width: '100%' }}>
                    <InputNumber
                      placeholder="Duration (mins)"
                      style={{ width: 120 }}
                      min={1}
                      value={item.duration_minutes}
                      onChange={(value) => updateScheduleItem(index, 'duration_minutes', value || 0)}
                    />
                    <InputNumber
                      placeholder="Max Marks"
                      style={{ width: 120 }}
                      min={0}
                      step={0.5}
                      value={item.max_marks}
                      onChange={(value) => updateScheduleItem(index, 'max_marks', value || 0)}
                    />
                    <InputNumber
                      placeholder="Passing Marks"
                      style={{ width: 120 }}
                      min={0}
                      step={0.5}
                      value={item.passing_marks}
                      onChange={(value) => updateScheduleItem(index, 'passing_marks', value || 0)}
                    />
                    <Input
                      placeholder="Room"
                      style={{ width: 100 }}
                      value={item.room_number}
                      onChange={(e) => updateScheduleItem(index, 'room_number', e.target.value)}
                    />
                  </Space>
                </Space>
              </Card>
            ))}
          </div>
        </Form>
      </Modal>

      {/* Hall Tickets Modal */}
      <Modal
        title="Hall Tickets"
        open={isHallTicketModalVisible}
        onCancel={() => setIsHallTicketModalVisible(false)}
        footer={[
          <Button key="print" type="primary" onClick={() => window.print()}>
            Print All
          </Button>,
          <Button key="close" onClick={() => setIsHallTicketModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={900}
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {hallTickets.map((ticket, index) => (
            <Card key={index} style={{ marginBottom: 16, pageBreakAfter: 'always' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>HALL TICKET</h3>
                <p style={{ color: '#666', margin: 0 }}>{ticket.exam_series_name}</p>
              </div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Student Name">{ticket.student_name}</Descriptions.Item>
                <Descriptions.Item label="Admission No">{ticket.admission_number}</Descriptions.Item>
                <Descriptions.Item label="Class">{ticket.class_name}</Descriptions.Item>
                <Descriptions.Item label="Father's Name">{ticket.father_name || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Exam Period" span={2}>
                  {moment(ticket.start_date).format('DD MMM YYYY')} - {moment(ticket.end_date).format('DD MMM YYYY')}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 16 }}>
                <strong>Exam Schedule:</strong>
                <Table
                  dataSource={ticket.schedule}
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Subject', dataIndex: 'subject_name', key: 'subject' },
                    { title: 'Date', dataIndex: 'exam_date', key: 'date', render: (d: string) => moment(d).format('DD MMM') },
                    { title: 'Time', dataIndex: 'start_time', key: 'time' },
                    { title: 'Duration', dataIndex: 'duration_minutes', key: 'duration', render: (d: string) => `${d} mins` },
                    { title: 'Max Marks', dataIndex: 'max_marks', key: 'marks' },
                  ]}
                />
              </div>

              {ticket.instructions && (
                <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5' }}>
                  <strong>Instructions:</strong>
                  <p style={{ margin: '4px 0 0' }}>{ticket.instructions}</p>
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', gap: '8px' }} className="no-print">
                <Button
                  size="small"
                  type="primary"
                  onClick={async () => {
                    try {
                      const pdfBlob = await downloadAdmitCard({
                        exam_series_id: viewingSeriesId!,
                        student_id: ticket.student_id
                      }).unwrap();
                      const url = window.URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `admit_card_${ticket.admission_number}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      message.success('Admit card downloaded!');
                    } catch (error: any) {
                      message.error('Failed to download admit card');
                    }
                  }}
                >
                  Download Admit Card
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      const pdfBlob = await downloadReportCard({
                        student_id: ticket.student_id,
                        exam_series_id: viewingSeriesId!
                      }).unwrap();
                      const url = window.URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `report_card_${ticket.admission_number}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      message.success('Report card downloaded!');
                    } catch (error: any) {
                      message.error('Failed to download report card');
                    }
                  }}
                >
                  Download Report Card
                </Button>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', width: 150, marginTop: 40 }} />
                  <p style={{ margin: 0 }}>Student Signature</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', width: 150, marginTop: 40 }} />
                  <p style={{ margin: 0 }}>Principal Signature</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* View Timetables Modal */}
      <Modal
        title="Exam Timetables"
        open={isTimetablesViewModalVisible}
        onCancel={() => {
          setIsTimetablesViewModalVisible(false);
          setViewingSeriesId(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsTimetablesViewModalVisible(false);
            setViewingSeriesId(null);
          }}>
            Close
          </Button>,
        ]}
        width={1000}
      >
        {timetablesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading timetables...</div>
        ) : !timetablesData || timetablesData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <CalendarOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
            <p style={{ color: '#999' }}>No timetables created yet for this exam series.</p>
            <Button type="primary" onClick={() => {
              setIsTimetablesViewModalVisible(false);
              showTimetableModal(viewingSeriesId!);
            }}>
              Create Timetable
            </Button>
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            {timetablesData.map((timetable: any) => (
              <Card
                key={timetable.id}
                title={<span><strong>Class:</strong> {timetable.class_name}</span>}
                style={{ marginBottom: 16 }}
                extra={
                  <Space>
                    <Button
                      size="small"
                      onClick={() => handleGenerateHallTickets(viewingSeriesId!, timetable.class_id)}
                    >
                      View Hall Tickets
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        const seriesName = examSeries?.find(s => s.id === viewingSeriesId)?.name || 'Exam';
                        handleDownloadClassAdmitCards(viewingSeriesId!, timetable.class_id, seriesName, timetable.class_name);
                      }}
                    >
                      Download Admit Cards
                    </Button>
                  </Space>
                }
              >
                {timetable.instructions && (
                  <p style={{ marginBottom: 16, color: '#666' }}>
                    <strong>Instructions:</strong> {timetable.instructions}
                  </p>
                )}
                <Table
                  dataSource={timetable.schedule_items}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'exam_date',
                      key: 'exam_date',
                      render: (date: string) => moment(date).format('DD MMM YYYY'),
                      width: 120,
                    },
                    {
                      title: 'Subject',
                      dataIndex: 'subject_name',
                      key: 'subject_name',
                      render: (text: string, record: any) => (
                        <div>
                          <div>{text}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{record.subject_code}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Time',
                      dataIndex: 'start_time',
                      key: 'start_time',
                      width: 100,
                    },
                    {
                      title: 'Duration',
                      dataIndex: 'duration_minutes',
                      key: 'duration_minutes',
                      render: (mins: number) => `${mins} mins`,
                      width: 100,
                    },
                    {
                      title: 'Max Marks',
                      dataIndex: 'max_marks',
                      key: 'max_marks',
                      width: 100,
                    },
                    {
                      title: 'Passing Marks',
                      dataIndex: 'passing_marks',
                      key: 'passing_marks',
                      width: 120,
                    },
                    {
                      title: 'Room',
                      dataIndex: 'room_number',
                      key: 'room_number',
                      width: 80,
                    },
                  ]}
                />
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Exams;
