import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Space, Popconfirm, Select, Card, Row, Col, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  useGetExpendituresQuery, useCreateExpenditureMutation, useUpdateExpenditureMutation, useDeleteExpenditureMutation
} from '../services/financeApi';
import { EXPENDITURE_CATEGORIES } from '../schemas/finance_schema';
import type { RootState } from '../store/store';
import type { Expenditure } from '../schemas/finance_schema';
import moment from 'moment';

const { Option } = Select;

const DailyExpenditurePage: React.FC = () => {
  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});
  const [selectedDate, setSelectedDate] = useState(moment());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Expenditure | null>(null);
  const [form] = Form.useForm();

  const dateStr = selectedDate.format('YYYY-MM-DD');
  const { data: expenditures, isLoading } = useGetExpendituresQuery({
    start_date: dateStr,
    end_date: dateStr,
  });
  const [createExpenditure] = useCreateExpenditureMutation();
  const [updateExpenditure] = useUpdateExpenditureMutation();
  const [deleteExpenditure] = useDeleteExpenditureMutation();

  const totalAmount = expenditures?.reduce((sum, e) => sum + e.amount, 0) || 0;

  const showModal = (record: Expenditure | null = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({ ...record, date: moment(record.date) });
    } else {
      form.resetFields();
      form.setFieldValue('date', selectedDate);
      form.setFieldValue('payment_mode', 'Cash');
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingRecord(null);
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const payload = {
          ...values,
          date: values.date.format('YYYY-MM-DD'),
          school_id: schoolId,
        };
        if (editingRecord) {
          await updateExpenditure({ id: editingRecord.id, body: payload }).unwrap();
          message.success('Expenditure updated');
        } else {
          await createExpenditure(payload).unwrap();
          message.success('Expenditure recorded');
        }
        handleCancel();
      } catch (err: any) {
        message.error(err?.data?.detail || 'Failed to save expenditure');
      }
    });
  };

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <span style={{ fontWeight: 'bold' }}>{cat}</span>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => <span style={{ color: '#f5222d', fontWeight: 'bold' }}>₹{amt.toLocaleString()}</span>,
    },
    {
      title: 'Payment Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => <span style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>{mode}</span>,
    },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (n: string) => n || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Expenditure) => (
        <Space>
          <a onClick={() => showModal(record)}>Edit</a>
          <Popconfirm title="Delete this record?" onConfirm={() => deleteExpenditure(record.id)}>
            <a style={{ color: '#f5222d' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>Daily Expenditure</h2>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col>
            <Space>
              <strong>Date:</strong>
              <DatePicker
                value={selectedDate}
                onChange={(d) => d && setSelectedDate(d)}
                style={{ width: 180 }}
              />
            </Space>
          </Col>
          <Col>
            <Button type="primary" onClick={() => showModal()}>+ Add Expenditure</Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Total Expenditure ({selectedDate.format('DD MMM YYYY')})</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>₹{totalAmount.toLocaleString()}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Records</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{expenditures?.length || 0}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={expenditures || []}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No expenditures recorded for this date' }}
      />

      <Modal
        title={editingRecord ? 'Edit Expenditure' : 'Add Expenditure'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select category">
              {EXPENDITURE_CATEGORIES.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter a description' }]}>
            <Input placeholder="Brief description of the expense" />
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Please enter the amount' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="payment_mode" label="Payment Mode" rules={[{ required: true }]}>
            <Select>
              <Option value="Cash">Cash</Option>
              <Option value="Online">Online</Option>
              <Option value="Cheque">Cheque</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DailyExpenditurePage;
