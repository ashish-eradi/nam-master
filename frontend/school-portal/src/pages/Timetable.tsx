import React, { useState, useMemo } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, TimePicker, Space, Popconfirm, Select, message, InputNumber } from 'antd';
import { useSelector } from 'react-redux';
import { 
  useGetPeriodsQuery, useCreatePeriodMutation, useUpdatePeriodMutation, useDeletePeriodMutation,
  useGetClassTimetableQuery, useCreateTimetableEntryMutation, useUpdateTimetableEntryMutation, useDeleteTimetableEntryMutation
} from '../services/timetableApi';
import { useGetClassesQuery } from '../services/classesApi';
import { useGetSubjectsQuery } from '../services/subjectsApi';
import { useGetTeachersQuery } from '../services/teachersApi';
import type { RootState } from '../store/store';
import type { Period, TimetableEntry } from '../schemas/timetable_schema';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;

const PeriodsManager: React.FC = () => {
  const { data: periods, isLoading } = useGetPeriodsQuery();
  const [createPeriod] = useCreatePeriodMutation();
  const [updatePeriod] = useUpdatePeriodMutation();
  const [deletePeriod] = useDeletePeriodMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const showModal = (period: Period | null = null) => {
    setEditingPeriod(period);
    form.setFieldsValue(period ? { 
      ...period, 
      start_time: moment(period.start_time, 'HH:mm:ss'), 
      end_time: moment(period.end_time, 'HH:mm:ss') 
    } : {});
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      const periodData = {
        ...values,
        start_time: values.start_time.format('HH:mm:ss'),
        end_time: values.end_time.format('HH:mm:ss'),
      };
      if (editingPeriod) {
        await updatePeriod({ id: editingPeriod.id, body: periodData });
      } else {
        await createPeriod({ ...periodData, school_id: schoolId });
      }
      handleCancel();
    });
  };

  const handleDelete = (id: string) => {
    deletePeriod(id);
  };

  const columns = [
    { title: 'Period Number', dataIndex: 'period_number', key: 'period_number', sorter: (a: Period, b: Period) => a.period_number - b.period_number },
    { title: 'Start Time', dataIndex: 'start_time', key: 'start_time' },
    { title: 'End Time', dataIndex: 'end_time', key: 'end_time' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Period) => (
        <Space size="middle">
          <a onClick={() => showModal(record)}>Edit</a>
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
            <a>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={() => showModal()} type="primary" style={{ marginBottom: 16 }}>
        Define Period
      </Button>
      <Table dataSource={periods?.slice().sort((a, b) => a.period_number - b.period_number)} columns={columns} loading={isLoading} rowKey="id" />
      <Modal 
        title={editingPeriod ? "Edit Period" : "Define Period"} 
        visible={isModalVisible} 
        onOk={handleOk} 
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="period_number" label="Period Number" rules={[{ required: true, type: 'integer', min: 1 }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="start_time" label="Start Time" rules={[{ required: true }]}>
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>
          <Form.Item name="end_time" label="End Time" rules={[{ required: true }]}>
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const TimetableBuilder: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContext, setModalContext] = useState<any>(null); // { period, day, entry }
  const [form] = Form.useForm();

  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { data: periods, isLoading: periodsLoading } = useGetPeriodsQuery();
  const { data: subjects, isLoading: subjectsLoading } = useGetSubjectsQuery();
  const { data: teachers, isLoading: teachersLoading } = useGetTeachersQuery();
  const { data: timetable, isLoading: timetableLoading } = useGetClassTimetableQuery(selectedClass!, { skip: !selectedClass });

  const [createEntry] = useCreateTimetableEntryMutation();
  const [updateEntry] = useUpdateTimetableEntryMutation();
  const [deleteEntry] = useDeleteTimetableEntryMutation();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const sortedPeriods = useMemo(() => periods?.slice().sort((a, b) => a.period_number - b.period_number), [periods]);

  const showModal = (period: Period, day: number, entry: TimetableEntry | null) => {
    setModalContext({ period, day, entry });
    form.setFieldsValue(entry ? { subject_id: entry.subject_id, teacher_id: entry.teacher_id } : {});
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (modalContext.entry) {
          await updateEntry({ id: modalContext.entry.id, body: values });
        } else {
          await createEntry({ 
            ...values, 
            class_id: selectedClass,
            period_id: modalContext.period.id,
            day_of_week: modalContext.day,
            school_id: schoolId,
            academic_year: '2024-25' // Placeholder
          });
        }
        message.success('Timetable updated!');
        handleCancel();
      } catch (err: any) {
        message.error(err.data?.detail || 'Failed to update timetable');
      }
    });
  };

  const handleDelete = async () => {
    if (modalContext.entry) {
      await deleteEntry(modalContext.entry.id);
      message.success('Entry deleted!');
      handleCancel();
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const columns = [
    { title: 'Period', dataIndex: 'period_number', key: 'period', render: (text: number, record: Period) => `${text} (${moment(record.start_time, 'HH:mm:ss').format('h:mm A')})` },
    ...days.map((day, index) => ({
      title: day,
      key: day,
      render: (_: any, record: Period) => {
        const entry = timetable?.find(e => e.period_id === record.id && e.day_of_week === index + 1);
        const subject = subjects?.find(s => s.id === entry?.subject_id);
        const teacher = teachers?.find(t => t.id === entry?.teacher_id);
        return (
          <div onClick={() => showModal(record, index + 1, entry || null)} style={{ cursor: 'pointer', minHeight: 50 }}>
            <div>{subject?.name}</div>
            <small>{teacher?.full_name || ''}</small>
          </div>
        );
      },
    })),
  ];

  return (
    <div>
      <Select
        placeholder="Select Class to View Timetable"
        style={{ width: 300, marginBottom: 16 }}
        onChange={setSelectedClass}
        loading={classesLoading}
      >
        {classes?.map((c: any) => <Option key={c.id} value={c.id}>{c.name} - {c.section}</Option>)}
      </Select>

      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          disabled={!selectedClass || !timetable}
          onClick={() => {
            const className = classes?.find((c: any) => c.id === selectedClass);
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            const table = document.getElementById('timetable-grid');
            printWin.document.write(`<!DOCTYPE html><html><head><title>Timetable</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { margin-bottom: 12px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; font-size: 13px; }
                th { background: #f0f0f0; }
                small { color: #555; }
              </style></head><body>
              <h2>Timetable — ${className ? `${className.name} ${className.section}` : ''}</h2>
              ${table?.outerHTML || ''}
              </body></html>`);
            printWin.document.close();
            printWin.print();
          }}
        >
          Download / Print
        </Button>
      </div>
      <Table
        id="timetable-grid"
        dataSource={sortedPeriods}
        columns={columns}
        loading={periodsLoading || timetableLoading}
        rowKey="id"
        bordered
        pagination={false}
      />

      <Modal 
        title={`Set Timetable for Period ${modalContext?.period.period_number} on ${days[modalContext?.day - 1]}`}
        visible={isModalVisible} 
        onOk={handleOk} 
        onCancel={handleCancel}
        footer={[
          <Button key="delete" danger onClick={handleDelete} disabled={!modalContext?.entry}>Delete</Button>,
          <Button key="back" onClick={handleCancel}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleOk}>Save</Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
            <Select loading={subjectsLoading} placeholder="Select a subject">
              {subjects?.map((s: any) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="teacher_id" label="Teacher" rules={[{ required: true }]}>
            <Select loading={teachersLoading} placeholder="Select a teacher">
              {teachers?.map((t: any) => <Option key={t.id} value={t.id}>{t.full_name || t.email}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const TimetablePage: React.FC = () => {
  return (
    <div>
      <h2>Timetable Management</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Manage Periods" key="1">
          <PeriodsManager />
        </TabPane>
        <TabPane tab="Class Timetable" key="2">
          <TimetableBuilder />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TimetablePage;
