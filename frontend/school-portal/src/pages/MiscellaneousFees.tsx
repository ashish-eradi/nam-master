import React, { useState } from 'react';
import { getCurrentAcademicYear, getAcademicYearOptions } from '../utils/academicYear';
import { Tabs, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, InputNumber, message, AutoComplete } from 'antd';
import {
  useGetMiscCategoriesQuery,
  useCreateMiscCategoryMutation,
  useUpdateMiscCategoryMutation,
  useDeleteMiscCategoryMutation,
  useGetMiscFeesQuery,
  useCreateMiscFeeMutation,
  useUpdateMiscFeeMutation,
  useDeleteMiscFeeMutation,
  useAssignMiscFeeToStudentMutation,
} from '../services/miscellaneousApi';
import { useGetFundsQuery } from '../services/financeApi';
import { useGetStudentsQuery } from '../services/studentsApi';

const { TabPane } = Tabs;
const { Option } = Select;


// --- Categories Manager ---

const CategoriesManager: React.FC = () => {
  const { data: categories, isLoading } = useGetMiscCategoriesQuery();
  const [createCategory] = useCreateMiscCategoryMutation();
  const [updateCategory] = useUpdateMiscCategoryMutation();
  const [deleteCategory] = useDeleteMiscCategoryMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [form] = Form.useForm();

  const showModal = (category: any | null = null) => {
    setEditingCategory(category);
    form.setFieldsValue(category || {});
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingCategory) {
          await updateCategory({ id: editingCategory.id, body: values }).unwrap();
          message.success('Category updated');
        } else {
          await createCategory(values).unwrap();
          message.success('Category created');
        }
        handleCancel();
      } catch {
        message.error('Failed to save category');
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id).unwrap();
      message.success('Category deleted');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete category');
    }
  };

  const columns = [
    { title: 'Category Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => showModal(record)}>Edit</a>
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: 'red' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={() => showModal()} type="primary" style={{ marginBottom: 16 }}>
        Add Category
      </Button>
      <Table dataSource={categories} columns={columns} loading={isLoading} rowKey="id" />
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Medical, Canteen, Sports" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};


// --- Fees Manager ---

const FeesManager: React.FC = () => {
  const { data: fees, isLoading } = useGetMiscFeesQuery();
  const { data: categories } = useGetMiscCategoriesQuery();
  const { data: funds } = useGetFundsQuery();
  const [createFee] = useCreateMiscFeeMutation();
  const [updateFee] = useUpdateMiscFeeMutation();
  const [deleteFee] = useDeleteMiscFeeMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [form] = Form.useForm();

  const showModal = (fee: any | null = null) => {
    setEditingFee(fee);
    form.setFieldsValue(fee || { academic_year: getCurrentAcademicYear() });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingFee) {
          await updateFee({ id: editingFee.id, body: values }).unwrap();
          message.success('Fee updated');
        } else {
          await createFee(values).unwrap();
          message.success('Fee created');
        }
        handleCancel();
      } catch {
        message.error('Failed to save fee');
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFee(id).unwrap();
      message.success('Fee deleted');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete fee');
    }
  };

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${Number(amount).toFixed(2)}`,
    },
    {
      title: 'Fund',
      dataIndex: 'fund_id',
      key: 'fund_id',
      render: (fundId: string) => funds?.find((f: any) => f.id === fundId)?.name || 'N/A',
    },
    { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => showModal(record)}>Edit</a>
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: 'red' }}>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={() => showModal()} type="primary" style={{ marginBottom: 16 }}>
        Add Miscellaneous Fee
      </Button>
      <Table dataSource={fees} columns={columns} loading={isLoading} rowKey="id" />
      <Modal
        title={editingFee ? 'Edit Miscellaneous Fee' : 'Add Miscellaneous Fee'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select a category">
              {categories?.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="₹" />
          </Form.Item>
          <Form.Item name="fund_id" label="Fund">
            <Select placeholder="Select a fund (optional)" allowClear>
              {funds?.map((f: any) => <Option key={f.id} value={f.id}>{f.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
            <Select style={{ width: '100%' }}>
              {getAcademicYearOptions(2, 1).map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};


// --- Assign Fee to Student ---

const AssignToStudent: React.FC = () => {
  const { data: fees } = useGetMiscFeesQuery();
  const { data: students } = useGetStudentsQuery();
  const [assignFee] = useAssignMiscFeeToStudentMutation();

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const filteredStudents = students?.filter((s: any) =>
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  const studentOptions = filteredStudents.slice(0, 20).map((s: any) => ({
    value: `${s.first_name} ${s.last_name} (${s.admission_number})`,
    label: `${s.first_name} ${s.last_name} (${s.admission_number})`,
    id: s.id,
  }));

  const handleAssign = () => {
    form.validateFields().then(async (values) => {
      if (!selectedStudentId) {
        message.error('Please select a student');
        return;
      }
      try {
        await assignFee({
          studentId: selectedStudentId,
          body: {
            miscellaneous_fee_id: values.miscellaneous_fee_id,
            academic_year: values.academic_year,
          },
        }).unwrap();
        message.success('Fee assigned successfully');
        form.resetFields();
        setSelectedStudentId(null);
        setStudentSearch('');
      } catch (err: any) {
        message.error(err?.data?.detail || 'Failed to assign fee');
      }
    });
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical">
        <Form.Item label="Student">
          <AutoComplete
            options={studentOptions}
            value={studentSearch}
            onChange={(value) => {
              setStudentSearch(value);
              if (!value) setSelectedStudentId(null);
            }}
            onSelect={(_: string, option: any) => {
              setSelectedStudentId(option.id);
              setStudentSearch(option.value);
            }}
            placeholder="Search student by name or admission number"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="miscellaneous_fee_id" label="Miscellaneous Fee" rules={[{ required: true }]}>
          <Select placeholder="Select a fee">
            {fees?.map((f: any) => (
              <Option key={f.id} value={f.id}>
                {f.category_name} — ₹{Number(f.amount).toFixed(2)} ({f.academic_year})
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
          <Select style={{ width: '100%' }} defaultValue={getCurrentAcademicYear()}>
            {getAcademicYearOptions(2, 1).map(y => <Option key={y} value={y}>{y}</Option>)}
          </Select>
        </Form.Item>
        <Button type="primary" onClick={handleAssign}>
          Assign Fee to Student
        </Button>
      </Form>
    </div>
  );
};


// --- Main Page ---

const MiscellaneousFeesPage: React.FC = () => {
  return (
    <div>
      <h2>Miscellaneous Fees</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Categories" key="1">
          <CategoriesManager />
        </TabPane>
        <TabPane tab="Fee Configuration" key="2">
          <FeesManager />
        </TabPane>
        <TabPane tab="Assign to Student" key="3">
          <AssignToStudent />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default MiscellaneousFeesPage;
