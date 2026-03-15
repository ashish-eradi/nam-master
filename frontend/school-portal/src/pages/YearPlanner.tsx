import React, { useState } from 'react';
import { Calendar, Badge, Button, Modal, Form, Input, DatePicker, Select, Card, Tag, Space, Popconfirm, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  useGetCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  type CalendarEvent,
  type CalendarEventCreate,
  type CalendarEventUpdate
} from '../services/calendarApi';
import type { RootState } from '../store/store';

const { Option } = Select;
const { TextArea } = Input;

const eventTypeColors: Record<string, string> = {
  holiday: '#ff4d4f',
  exam: '#faad14',
  event: '#1890ff',
  meeting: '#52c41a',
  workshop: '#722ed1',
  sports: '#13c2c2',
  other: '#8c8c8c',
};

const eventTypeLabels: Record<string, string> = {
  holiday: 'Holiday',
  exam: 'Exam',
  event: 'School Event',
  meeting: 'Meeting',
  workshop: 'Workshop',
  sports: 'Sports',
  other: 'Other',
};

const YearPlanner: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);
  const currentAcademicYear = '2025-2026'; // This should come from settings

  const { data: events, isLoading } = useGetCalendarEventsQuery({
    academic_year: currentAcademicYear,
  });

  const [createEvent] = useCreateCalendarEventMutation();
  const [updateEvent] = useUpdateCalendarEventMutation();
  const [deleteEvent] = useDeleteCalendarEventMutation();

  const showModal = (event: CalendarEvent | null = null, date?: Dayjs) => {
    setEditingEvent(event);
    if (event) {
      form.setFieldsValue({
        ...event,
        start_date: dayjs(event.start_date),
        end_date: dayjs(event.end_date),
      });
    } else if (date) {
      form.setFieldsValue({
        start_date: date,
        end_date: date,
        event_type: 'event',
        is_school_closed: 'no',
        color: '#1890ff',
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingEvent(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const eventData = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
        academic_year: currentAcademicYear,
        school_id: schoolId!,
      };

      if (editingEvent) {
        await updateEvent({ id: editingEvent.id, body: eventData }).unwrap();
        message.success('Event updated successfully');
      } else {
        await createEvent(eventData).unwrap();
        message.success('Event created successfully');
      }
      handleCancel();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to save event');
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId).unwrap();
      message.success('Event deleted successfully');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to delete event');
    }
  };

  const getEventsForDate = (date: Dayjs) => {
    if (!events) return [];
    return events.filter(event => {
      const eventStart = dayjs(event.start_date);
      const eventEnd = dayjs(event.end_date);
      return date.isBetween(eventStart, eventEnd, 'day', '[]');
    });
  };

  const dateCellRender = (value: Dayjs) => {
    const dayEvents = getEventsForDate(value);
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayEvents.map(event => (
          <li key={event.id} style={{ marginBottom: 2 }}>
            <Badge
              color={event.color || eventTypeColors[event.event_type]}
              text={
                <span style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => showModal(event)}>
                  {event.title}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    );
  };

  const onSelect = (date: Dayjs) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) {
      showModal(null, date);
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <h2>Year Planner - Academic Year {currentAcademicYear}</h2>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                Add Event
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={18}>
          <Card loading={isLoading}>
            <Calendar
              value={selectedDate}
              onSelect={onSelect}
              cellRender={dateCellRender}
            />
          </Card>
        </Col>

        <Col xs={24} lg={6}>
          <Card title={`Events on ${selectedDate.format('MMM DD, YYYY')}`}>
            {selectedDateEvents.length === 0 ? (
              <p style={{ color: '#999' }}>No events on this date</p>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedDateEvents.map(event => (
                  <Card
                    key={event.id}
                    size="small"
                    style={{ borderLeft: `4px solid ${event.color || eventTypeColors[event.event_type]}` }}
                    actions={[
                      <EditOutlined key="edit" onClick={() => showModal(event)} />,
                      <Popconfirm
                        key="delete"
                        title="Are you sure?"
                        onConfirm={() => handleDelete(event.id)}
                      >
                        <DeleteOutlined />
                      </Popconfirm>,
                    ]}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{event.title}</div>
                    <Tag color={eventTypeColors[event.event_type]}>
                      {eventTypeLabels[event.event_type]}
                    </Tag>
                    {event.is_school_closed === 'yes' && (
                      <Tag color="red">School Closed</Tag>
                    )}
                    {event.description && (
                      <p style={{ fontSize: '12px', marginTop: 8, color: '#666' }}>
                        {event.description}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                      {dayjs(event.start_date).format('MMM DD')} - {dayjs(event.end_date).format('MMM DD, YYYY')}
                    </p>
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          <Card title="Legend" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(eventTypeLabels).map(([key, label]) => (
                <div key={key}>
                  <Badge color={eventTypeColors[key]} text={label} />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingEvent ? 'Edit Event' : 'Add Event'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="Event title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Event description" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="start_date"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="end_date"
                label="End Date"
                rules={[{ required: true, message: 'Please select end date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="event_type"
                label="Event Type"
                rules={[{ required: true, message: 'Please select event type' }]}
              >
                <Select placeholder="Select event type">
                  {Object.entries(eventTypeLabels).map(([key, label]) => (
                    <Option key={key} value={key}>
                      <Badge color={eventTypeColors[key]} text={label} />
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_school_closed"
                label="School Closed?"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="yes">Yes (Holiday)</Option>
                  <Option value="no">No</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="color" label="Custom Color (Optional)">
            <Input type="color" style={{ width: '100px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default YearPlanner;
