import React, { useMemo, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Space, Popconfirm, Select, Card, Row, Col, message, AutoComplete } from 'antd';
import { useSelector } from 'react-redux';
import {
  useGetFundsQuery, useCreateFundMutation, useUpdateFundMutation, useDeleteFundMutation,
  useGetFeesQuery, useCreateFeeMutation, useUpdateFeeMutation, useDeleteFeeMutation,
  useGetPaymentsQuery, useCreatePaymentMutation, useDeletePaymentMutation,
  useGetConcessionsQuery, useCreateConcessionMutation, useDeleteConcessionMutation,
  useGetSalariesQuery, useCreateSalaryMutation, useDeleteSalaryMutation,
  useGetClassFeesQuery, useCreateClassFeeMutation, useUpdateClassFeeMutation, useDeleteClassFeeMutation, useBulkCreateClassFeesMutation,
  useSearchStudentsQuery, useAssignFeesToStudentMutation, useBulkAssignFeesToClassMutation, useGetStudentLedgerQuery, useGetAllStudentOutstandingQuery,
  useLazySearchStudentsQuery, useLazySearchTeachersQuery
} from '../services/financeApi';
import { useGetClassesQuery } from '../services/classApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import { useGetTeachersQuery } from '../services/teachersApi';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import type { RootState } from '../store/store';
import type { Fund, Fee, Payment, Concession, Salary, ClassFee } from '../schemas/finance_schema';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;

const Funds: React.FC = () => {
  const { data: funds, isLoading } = useGetFundsQuery();
  const [createFund] = useCreateFundMutation();
  const [updateFund] = useUpdateFundMutation();
  const [deleteFund] = useDeleteFundMutation();
  
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [editingFund, setEditingFund] = React.useState<Fund | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const showModal = (fund: Fund | null = null) => {
    setEditingFund(fund);
    form.setFieldsValue(fund ? fund : { receipt_number_start: 1 });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      if (editingFund) {
        await updateFund({ id: editingFund.id, body: values });
      } else {
        await createFund({ ...values, school_id: schoolId });
      }
      handleCancel();
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFund(id).unwrap();
      message.success('Fund deleted successfully');
    } catch (err: any) {
      message.error(err?.data?.detail || 'Failed to delete fund');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Short Name', dataIndex: 'short_name', key: 'short_name' },
    { title: 'Prefix', dataIndex: 'receipt_series_prefix', key: 'receipt_series_prefix' },
    { title: 'Current Number', dataIndex: 'current_receipt_number', key: 'current_receipt_number' },
    {
      title: 'Installment Type',
      dataIndex: 'installment_type',
      key: 'installment_type',
      render: (type: string) => type ? type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Fund) => (
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
        Create Fund
      </Button>
      <Table dataSource={funds} columns={columns} loading={isLoading} rowKey="id" />
      <Modal 
        title={editingFund ? "Edit Fund" : "Create Fund"} 
        visible={isModalVisible} 
        onOk={handleOk} 
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="short_name" label="Short Name">
            <Input />
          </Form.Item>
          <Form.Item name="receipt_series_prefix" label="Receipt Prefix">
            <Input />
          </Form.Item>
          <Form.Item name="receipt_number_start" label="Starting Number">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="installment_type" label="Installment Type">
            <Select placeholder="Select installment type" allowClear>
              <Option value="monthly">Monthly</Option>
              <Option value="quarterly">Quarterly</Option>
              <Option value="half_yearly">Half Yearly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Fees: React.FC = () => {
  const { data: fees, isLoading: feesLoading } = useGetFeesQuery();
  const { data: funds, isLoading: fundsLoading } = useGetFundsQuery();
  const [createFee] = useCreateFeeMutation();
  const [updateFee] = useUpdateFeeMutation();
  const [deleteFee] = useDeleteFeeMutation();

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [editingFee, setEditingFee] = React.useState<Fee | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const showModal = (fee: Fee | null = null) => {
    setEditingFee(fee);
    form.setFieldsValue(fee);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      if (editingFee) {
        await updateFee({ id: editingFee.id, body: values });
      } else {
        await createFee({ ...values, school_id: schoolId });
      }
      handleCancel();
    });
  };

  const handleDelete = (id: string) => {
    deleteFee(id);
  };

  const columns = [
    { title: 'Name', dataIndex: 'fee_name', key: 'fee_name' },
    { title: 'Short Name', dataIndex: 'fee_short_name', key: 'fee_short_name' },
    { 
      title: 'Fund', 
      dataIndex: 'fund_id', 
      key: 'fund_id', 
      render: (fundId: string) => funds?.find(f => f.id === fundId)?.name || 'N/A' 
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Fee) => (
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
        Create Fee
      </Button>
      <Table dataSource={fees} columns={columns} loading={feesLoading} rowKey="id" />
      <Modal 
        title={editingFee ? "Edit Fee" : "Create Fee"} 
        visible={isModalVisible} 
        onOk={handleOk} 
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="fee_name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="fee_short_name" label="Short Name">
            <Input />
          </Form.Item>
          <Form.Item name="fund_id" label="Fund" rules={[{ required: true }]}>
            <Select loading={fundsLoading} placeholder="Select a fund">
              {funds?.map(fund => (
                <Option key={fund.id} value={fund.id}>{fund.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Payments: React.FC = () => {
  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery();
  const { data: funds, isLoading: fundsLoading } = useGetFundsQuery();
  const { data: allStudents } = useGetStudentsQuery();
  const [createPayment] = useCreatePaymentMutation();
  const [deletePayment] = useDeletePaymentMutation();

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [form] = Form.useForm();

  // Search states
  const [searchText, setSearchText] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState<string | null>(null);
  const [filterFund, setFilterFund] = useState<string | null>(null);

  // Student lookup
  const [studentSearchText, setStudentSearchText] = useState('');
  const [searchStudents, { data: studentOptions = [] }] = useLazySearchStudentsQuery();

  const { school_id: schoolId, id: userId } = useSelector((state: RootState) => state.auth.user || {});

  // Filtered payments
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter((payment) => {
      const matchesSearch = searchText === '' ||
        payment.receipt_number?.toLowerCase().includes(searchText.toLowerCase()) ||
        payment.student_id?.toLowerCase().includes(searchText.toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchText.toLowerCase());

      const matchesPaymentMode = !filterPaymentMode || payment.payment_mode === filterPaymentMode;
      const matchesFund = !filterFund || payment.fund_id === filterFund;

      return matchesSearch && matchesPaymentMode && matchesFund;
    });
  }, [payments, searchText, filterPaymentMode, filterFund]);

  const clearFilters = () => {
    setSearchText('');
    setFilterPaymentMode(null);
    setFilterFund(null);
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const paymentData = {
          ...values,
          payment_date: values.payment_date.format('YYYY-MM-DD'),
          school_id: schoolId,
          received_by_user_id: userId,
        };
        await createPayment(paymentData).unwrap();
        message.success('Payment recorded successfully!');
        handleCancel();
      } catch (error: unknown) {
        const apiErr = error as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to record payment. Please check all fields.');
      }
    });
  };

  const handleDelete = (id: string) => {
    deletePayment(id);
  };

  const columns = [
    { title: 'Receipt No.', dataIndex: 'receipt_number', key: 'receipt_number' },
    {
      title: 'Student',
      dataIndex: 'student_id',
      key: 'student_id',
      render: (studentId: string) => {
        const s = allStudents?.find((st: any) => st.id === studentId);
        return s ? `${s.first_name} ${s.last_name} (${s.admission_number})` : studentId;
      },
    },
    {
      title: 'Fund',
      dataIndex: 'fund_id',
      key: 'fund_id',
      render: (fundId: string) => funds?.find(f => f.id === fundId)?.name || 'N/A'
    },
    { title: 'Amount Paid', dataIndex: 'amount_paid', key: 'amount_paid' },
    { title: 'Payment Date', dataIndex: 'payment_date', key: 'payment_date' },
    { title: 'Payment Mode', dataIndex: 'payment_mode', key: 'payment_mode' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Payment) => (
        <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
          <a>Delete</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {/* Search and Filter Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search receipt, student ID, txn ID..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Payment Mode"
              allowClear
              style={{ width: '100%' }}
              value={filterPaymentMode}
              onChange={setFilterPaymentMode}
            >
              <Option value="Cash">Cash</Option>
              <Option value="Card">Card</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Fund"
              allowClear
              style={{ width: '100%' }}
              value={filterFund}
              onChange={setFilterFund}
              loading={fundsLoading}
            >
              {funds?.map(fund => (
                <Option key={fund.id} value={fund.id}>{fund.name}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear
            </Button>
          </Col>
        </Row>
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Button onClick={showModal} type="primary">
          Record Payment
        </Button>
      </Space>

      <div style={{ marginBottom: 8 }}>
        Showing {filteredPayments.length} of {payments?.length || 0} payments
      </div>

      <Table dataSource={filteredPayments} columns={columns} loading={paymentsLoading} rowKey="id" />
      <Modal title="Record Payment" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Form form={form} layout="vertical">
          <Form.Item name="student_id" label="Student" rules={[{ required: true, message: 'Please select a student' }]}>
            <AutoComplete
              placeholder="Search by admission number or name"
              onSearch={(value) => {
                setStudentSearchText(value);
                if (value.length >= 2) {
                  searchStudents(value);
                }
              }}
              options={studentOptions.map((student: any) => ({
                value: student.id,
                label: `${student.admission_number} - ${student.full_name} (${student.class_name})`
              }))}
              filterOption={false}
            />
          </Form.Item>
          <Form.Item name="fund_id" label="Fund" rules={[{ required: true }]}>
            <Select loading={fundsLoading} placeholder="Select a fund">
              {funds?.map(fund => (
                <Option key={fund.id} value={fund.id}>{fund.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount_paid" label="Amount Paid" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_mode" label="Payment Mode" rules={[{ required: true }]}>
            <Select placeholder="Select a mode">
              <Option value="Cash">Cash</Option>
              <Option value="Card">Card</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
            </Select>
          </Form.Item>
          <Form.Item name="transaction_id" label="Transaction ID">
            <Input />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Concessions: React.FC = () => {
  const { data: concessions, isLoading: concessionsLoading } = useGetConcessionsQuery();
  const { data: fees, isLoading: feesLoading } = useGetFeesQuery(); // Need fees for the form
  const { data: allStudents } = useGetStudentsQuery();
  const [createConcession] = useCreateConcessionMutation();
  const [deleteConcession] = useDeleteConcessionMutation();

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [form] = Form.useForm();

  // Student lookup
  const [studentSearchText, setStudentSearchText] = useState('');
  const [searchStudents, { data: studentOptions = [] }] = useLazySearchStudentsQuery();

  const { school_id: schoolId, id: userId } = useSelector((state: RootState) => state.auth.user || {});

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const concessionData = {
          ...values,
          school_id: schoolId,
          approved_by_user_id: userId,
        };
        await createConcession(concessionData).unwrap();
        message.success('Concession created successfully!');
        handleCancel();
      } catch (error: unknown) {
        const apiErr = error as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to create concession. Please check all fields.');
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteConcession(id);
  };

  const columns = [
    {
      title: 'Student',
      dataIndex: 'student_id',
      key: 'student_id',
      render: (studentId: string) => {
        const s = allStudents?.find((st: any) => st.id === studentId);
        return s ? `${s.first_name} ${s.last_name} (${s.admission_number})` : studentId;
      },
    },
    {
      title: 'Fee',
      dataIndex: 'fee_id',
      key: 'fee_id',
      render: (feeId: string) => fees?.find(f => f.id === feeId)?.fee_name || 'N/A'
    },
    { title: 'Discount Amount', dataIndex: 'discount_amount', key: 'discount_amount' },
    { title: 'Discount %', dataIndex: 'discount_percentage', key: 'discount_percentage' },
    { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Concession) => (
        <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
          <a>Delete</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={showModal} type="primary" style={{ marginBottom: 16 }}>
        Add Concession
      </Button>
      <Table dataSource={concessions} columns={columns} loading={concessionsLoading} rowKey="id" />
      <Modal title="Add Concession" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Form form={form} layout="vertical">
          <Form.Item name="student_id" label="Student" rules={[{ required: true, message: 'Please select a student' }]}>
            <AutoComplete
              placeholder="Search by admission number or name"
              onSearch={(value) => {
                setStudentSearchText(value);
                if (value.length >= 2) {
                  searchStudents(value);
                }
              }}
              options={studentOptions.map((student: any) => ({
                value: student.id,
                label: `${student.admission_number} - ${student.full_name} (${student.class_name})`
              }))}
              filterOption={false}
            />
          </Form.Item>
          <Form.Item name="fee_id" label="Fee" rules={[{ required: true }]}>
            <Select loading={feesLoading} placeholder="Select a fee">
              {fees?.map(fee => (
                <Option key={fee.id} value={fee.id}>{fee.fee_name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="discount_amount" label="Discount Amount">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="discount_percentage" label="Discount Percentage">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
            <Input placeholder="e.g., 2024-25" />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Salaries: React.FC = () => {
  const { data: salaries, isLoading: salariesLoading } = useGetSalariesQuery();
  const { data: allTeachers } = useGetTeachersQuery();
  const [createSalary] = useCreateSalaryMutation();
  const [deleteSalary] = useDeleteSalaryMutation();

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [form] = Form.useForm();

  // Teacher lookup
  const [teacherSearchText, setTeacherSearchText] = useState('');
  const [searchTeachers, { data: teacherOptions = [] }] = useLazySearchTeachersQuery();

  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const net_salary = (values.basic_salary || 0) + (values.allowances || 0) - (values.deductions || 0);
        const salaryData = {
          ...values,
          net_salary,
          school_id: schoolId,
        };
        await createSalary(salaryData).unwrap();
        message.success('Salary processed successfully!');
        handleCancel();
      } catch (error: unknown) {
        const apiErr = error as { data?: { detail?: string } };
        message.error(apiErr?.data?.detail || 'Failed to process salary. Please check all fields.');
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteSalary(id);
  };

  const columns = [
    {
      title: 'Teacher',
      dataIndex: 'teacher_id',
      key: 'teacher_id',
      render: (teacherId: string) => {
        const t = allTeachers?.find((tc: any) => tc.id === teacherId);
        return t ? `${t.full_name || t.employee_id} (${t.employee_id})` : teacherId;
      },
    },
    { title: 'Month', dataIndex: 'month', key: 'month' },
    { title: 'Basic Salary', dataIndex: 'basic_salary', key: 'basic_salary' },
    { title: 'Allowances', dataIndex: 'allowances', key: 'allowances' },
    { title: 'Deductions', dataIndex: 'deductions', key: 'deductions' },
    { title: 'Net Salary', dataIndex: 'net_salary', key: 'net_salary' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Salary) => (
        <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
          <a>Delete</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={showModal} type="primary" style={{ marginBottom: 16 }}>
        Process Salary
      </Button>
      <Table dataSource={salaries} columns={columns} loading={salariesLoading} rowKey="id" />
      <Modal title="Process Salary" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Form form={form} layout="vertical">
          <Form.Item name="teacher_id" label="Teacher" rules={[{ required: true, message: 'Please select a teacher' }]}>
            <AutoComplete
              placeholder="Search by employee ID or name"
              onSearch={(value) => {
                setTeacherSearchText(value);
                if (value.length >= 2) {
                  searchTeachers(value);
                }
              }}
              options={teacherOptions.map((teacher: any) => ({
                value: teacher.id,
                label: `${teacher.employee_id} - ${teacher.full_name} (${teacher.department})`
              }))}
              filterOption={false}
            />
          </Form.Item>
          <Form.Item name="month" label="Month" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM" />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="allowances" label="Allowances">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="deductions" label="Deductions">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const ClassFees: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${String(currentYear + 1).slice(-2)}`);

  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { data: fees, isLoading: feesLoading } = useGetFeesQuery();
  const { data: classFees, isLoading: classFeesLoading } = useGetClassFeesQuery({ academic_year: academicYear });
  const [createClassFee] = useCreateClassFeeMutation();
  const [updateClassFee] = useUpdateClassFeeMutation();
  const [deleteClassFee] = useDeleteClassFeeMutation();
  const [bulkCreateClassFees] = useBulkCreateClassFeesMutation();

  const [editingCell, setEditingCell] = useState<{ classId: string; feeId: string } | null>(null);
  const [editValue, setEditValue] = useState<number | null>(null);
  const [editInstallmentType, setEditInstallmentType] = useState<string>('Annually');
  const [editFeeApplicability, setEditFeeApplicability] = useState<string>('All');

  // Build matrix data structure
  const matrixData = useMemo(() => {
    if (!classes || !fees) return [];

    return classes.map((cls: any) => {
      const row: any = {
        class_id: cls.id,
        class_name: cls.name,
      };

      fees.forEach((fee: Fee) => {
        const classFee = classFees?.find(
          (cf: ClassFee) => cf.class_id === cls.id && cf.fee_id === fee.id && cf.academic_year === academicYear
        );
        row[fee.id] = classFee ? {
          amount: classFee.amount,
          id: classFee.id,
          installment_type: classFee.installment_type || 'Annually',
          fee_applicability: classFee.fee_applicability || 'All'
        } : null;
      });

      return row;
    });
  }, [classes, fees, classFees, academicYear]);

  const handleCellClick = (classId: string, feeId: string, currentClassFee: any) => {
    setEditingCell({ classId, feeId });
    setEditValue(currentClassFee?.amount || null);
    setEditInstallmentType(currentClassFee?.installment_type || 'Annually');
    setEditFeeApplicability(currentClassFee?.fee_applicability || 'All');
  };

  const handleCellSave = async (classId: string, feeId: string, currentClassFee: any) => {
    if (editValue === null || editValue < 0) {
      message.error('Please enter a valid amount');
      return;
    }

    try {
      if (currentClassFee) {
        // Update existing
        await updateClassFee({
          id: currentClassFee.id,
          body: {
            amount: editValue,
            installment_type: editInstallmentType,
            fee_applicability: editFeeApplicability
          }
        }).unwrap();
        message.success('Fee updated successfully');
      } else {
        // Create new
        await createClassFee({
          class_id: classId,
          fee_id: feeId,
          amount: editValue,
          installment_type: editInstallmentType,
          fee_applicability: editFeeApplicability,
          academic_year: academicYear
        }).unwrap();
        message.success('Fee created successfully');
      }
    } catch (error) {
      message.error('Failed to save fee');
    }

    setEditingCell(null);
    setEditValue(null);
  };

  const handleCellDelete = async (classFeeId: string) => {
    try {
      await deleteClassFee(classFeeId).unwrap();
      message.success('Fee deleted successfully');
    } catch (error) {
      message.error('Failed to delete fee');
    }
  };

  const columns = [
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name',
      fixed: 'left' as const,
      width: 120,
    },
    ...(fees || []).map((fee: Fee) => ({
      title: fee.fee_name,
      dataIndex: fee.id,
      key: fee.id,
      width: 150,
      render: (value: any, record: any) => {
        const isEditing = editingCell?.classId === record.class_id && editingCell?.feeId === fee.id;

        if (isEditing) {
          return (
            <div style={{
              padding: '12px',
              background: '#f0f2f5',
              borderRadius: '8px',
              minWidth: '280px'
            }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <div style={{ marginBottom: '6px', fontWeight: 500, fontSize: '12px', color: '#595959' }}>
                    Amount (₹)
                  </div>
                  <InputNumber
                    value={editValue}
                    onChange={setEditValue}
                    min={0}
                    size="large"
                    style={{ width: '100%' }}
                    autoFocus
                    placeholder="Enter amount"
                    onPressEnter={() => handleCellSave(record.class_id, fee.id, value)}
                    prefix="₹"
                  />
                </div>
                <div>
                  <div style={{ marginBottom: '6px', fontWeight: 500, fontSize: '12px', color: '#595959' }}>
                    Installment Type
                  </div>
                  <Select
                    value={editInstallmentType}
                    onChange={setEditInstallmentType}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    <Option value="Monthly">📅 Monthly</Option>
                    <Option value="Quarterly">📅 Quarterly</Option>
                    <Option value="Half Yearly">📅 Half Yearly</Option>
                    <Option value="Annually">📅 Annually</Option>
                  </Select>
                </div>
                <div>
                  <div style={{ marginBottom: '6px', fontWeight: 500, fontSize: '12px', color: '#595959' }}>
                    Fee Applicability
                  </div>
                  <Select
                    value={editFeeApplicability}
                    onChange={setEditFeeApplicability}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    <Option value="All">👥 All Students</Option>
                    <Option value="Hostellers">🏠 Hostellers Only</Option>
                    <Option value="Day Scholars">🎒 Day Scholars Only</Option>
                  </Select>
                </div>
                <Space style={{ marginTop: '8px' }}>
                  <Button
                    type="primary"
                    size="middle"
                    onClick={() => handleCellSave(record.class_id, fee.id, value)}
                    style={{ borderRadius: '6px' }}
                  >
                    ✓ Save
                  </Button>
                  <Button
                    size="middle"
                    onClick={() => setEditingCell(null)}
                    style={{ borderRadius: '6px' }}
                  >
                    × Cancel
                  </Button>
                </Space>
              </Space>
            </div>
          );
        }

        return (
          <div
            onClick={() => handleCellClick(record.class_id, fee.id, value)}
            style={{
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '6px',
              border: value ? '2px solid #1890ff' : '2px dashed #d9d9d9',
              background: value ? '#e6f7ff' : '#fafafa',
              transition: 'all 0.3s',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            title="Click to edit"
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 600,
                color: value ? '#1890ff' : '#999'
              }}>
                {value ? `₹${value.amount.toLocaleString()}` : '+ Add Fee'}
              </div>
              {value && (
                <Popconfirm title="Delete this fee?" onConfirm={(e) => {
                  e?.stopPropagation();
                  handleCellDelete(value.id);
                }}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: '2px 6px' }}
                  >
                    🗑️
                  </Button>
                </Popconfirm>
              )}
            </div>
            {value && (
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  fontSize: '11px',
                  color: '#595959',
                  background: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  display: 'inline-block'
                }}>
                  📅 {value.installment_type || 'Annually'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#595959',
                  background: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginLeft: '4px'
                }}>
                  👥 {value.fee_applicability || 'All'}
                </div>
              </div>
            )}
          </div>
        );
      },
    })),
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <strong>Academic Year:</strong>
          </Col>
          <Col>
            <Select value={academicYear} onChange={setAcademicYear} style={{ width: 120 }}>
              {[0, 1, 2].map(offset => {
                const year = currentYear - offset;
                return (
                  <Option key={year} value={`${year}-${String(year + 1).slice(-2)}`}>
                    {year}-{String(year + 1).slice(-2)}
                  </Option>
                );
              })}
            </Select>
          </Col>
          <Col>
            <span style={{ color: '#999', fontSize: '12px' }}>
              Click on any cell to edit fee amount. Click '×' to delete.
            </span>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={matrixData}
        columns={columns}
        loading={classesLoading || feesLoading || classFeesLoading}
        rowKey="class_id"
        scroll={{ x: 'max-content' }}
        pagination={false}
        bordered
      />
    </div>
  );
};

// Student Fee Assignment Component
const StudentFeeAssignment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedClassFees, setSelectedClassFees] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('2024-25');

  const { data: students } = useSearchStudentsQuery(searchTerm, { skip: !searchTerm });
  const { data: studentLedger, refetch } = useGetStudentLedgerQuery(
    { student_id: selectedStudent?.id, academic_year: academicYear },
    { skip: !selectedStudent }
  );
  const { data: classFees } = useGetClassFeesQuery({ academic_year: academicYear });
  const [assignFees] = useAssignFeesToStudentMutation();

  const handleAssign = async () => {
    if (!selectedStudent) {
      message.error('Please select a student');
      return;
    }

    try {
      await assignFees({
        student_id: selectedStudent.id,
        body: {
          academic_year: academicYear,
          create_installments: false
        }
      }).unwrap();
      message.success('Fees assigned successfully - All class fees have been assigned to the student');
      setSelectedClassFees([]);
      refetch();
    } catch (error: any) {
      const errorMsg = error?.data?.detail || 'Failed to assign fees';
      message.error(errorMsg);
    }
  };

  const studentClassFees = classFees?.filter((cf: any) => cf.class_id === selectedStudent?.class_id);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Search
            placeholder="Search student by name or admission number"
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            enterButton
          />
        </Col>
        <Col span={8}>
          <Select
            value={academicYear}
            onChange={setAcademicYear}
            style={{ width: '100%' }}
          >
            <Option value="2023-24">2023-24</Option>
            <Option value="2024-25">2024-25</Option>
            <Option value="2025-26">2025-26</Option>
          </Select>
        </Col>
      </Row>

      {students && students.length > 0 && (
        <Card title="Select Student" style={{ marginBottom: 20 }}>
          <Table
            dataSource={students}
            columns={[
              { title: 'Admission No', dataIndex: 'admission_number', key: 'admission_number' },
              { title: 'Name', key: 'name', render: (_, record: any) => `${record.first_name} ${record.last_name}` },
              { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
              {
                title: 'Action',
                key: 'action',
                render: (_, record: any) => (
                  <Button type="primary" onClick={() => setSelectedStudent(record)}>
                    Select
                  </Button>
                ),
              },
            ]}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </Card>
      )}

      {selectedStudent && (
        <>
          <Card title={`Assign Fees to ${selectedStudent.first_name} ${selectedStudent.last_name}`} style={{ marginBottom: 20 }}>
            <p><strong>Class:</strong> {selectedStudent.class_name}</p>
            <p><strong>Academic Year:</strong> {academicYear}</p>
            <p style={{ marginTop: 16, marginBottom: 16 }}>
              The following fees will be automatically assigned to this student:
            </p>
            {studentClassFees && studentClassFees.length > 0 ? (
              <Table
                dataSource={studentClassFees}
                columns={[
                  { title: 'Fee Name', dataIndex: 'fee_name', key: 'fee_name' },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val: number) => `₹${val}` },
                  { title: 'Installment Type', dataIndex: 'installment_type', key: 'installment_type' },
                ]}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginBottom: 16 }}
              />
            ) : (
              <p style={{ color: 'red' }}>No fees defined for this class in {academicYear}. Please set up class fees first.</p>
            )}
            <Button
              type="primary"
              onClick={handleAssign}
              disabled={!studentClassFees || studentClassFees.length === 0}
            >
              Assign All Class Fees to Student
            </Button>
          </Card>

          {studentLedger && studentLedger.fee_structures?.length > 0 && (
            <Card title="Currently Assigned Fees">
              <Table
                dataSource={studentLedger.fee_structures}
                columns={[
                  { title: 'Fee Name', dataIndex: 'fee_name', key: 'fee_name' },
                  { title: 'Total Amount', dataIndex: 'total_amount', key: 'total_amount', render: (val: number) => `₹${val}` },
                  { title: 'Discount', dataIndex: 'discount_amount', key: 'discount_amount', render: (val: number) => `₹${val}` },
                  { title: 'Final Amount', dataIndex: 'final_amount', key: 'final_amount', render: (val: number) => `₹${val}` },
                  { title: 'Paid', dataIndex: 'amount_paid', key: 'amount_paid', render: (val: number) => `₹${val}` },
                  { title: 'Outstanding', dataIndex: 'outstanding_amount', key: 'outstanding_amount', render: (val: number) => <span style={{ color: val > 0 ? 'red' : 'green' }}>₹{val}</span> },
                ]}
                rowKey="id"
                pagination={false}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// Bulk Class Fee Assignment Component
const BulkClassFeeAssignment: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [academicYear, setAcademicYear] = useState('2024-25');

  const { data: classes } = useGetClassesQuery();
  const { data: classFees } = useGetClassFeesQuery({ academic_year: academicYear });
  const [bulkAssign, { isLoading }] = useBulkAssignFeesToClassMutation();

  const selectedClassFees = classFees?.filter((cf: any) => cf.class_id === selectedClass);
  const selectedClassName = classes?.find((c: any) => c.id === selectedClass)?.name;

  const handleBulkAssign = async () => {
    if (!selectedClass) {
      message.error('Please select a class');
      return;
    }

    try {
      const result = await bulkAssign({
        class_id: selectedClass,
        body: {
          academic_year: academicYear
        }
      }).unwrap();

      message.success(result.message);

      // Show additional details
      if (result.skipped_students && result.skipped_students.length > 0) {
        message.warning(`${result.skipped_students.length} students were skipped (fees already assigned)`);
      }
    } catch (error: any) {
      const errorMsg = error?.data?.detail || 'Failed to assign fees';
      message.error(errorMsg);
    }
  };

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            <span>Bulk Assign Class Fees</span>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        <div style={{
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, color: '#0050b3' }}>
            ℹ️ This will assign all class fees to every active student in the selected class.
            Installment types and fee applicability are automatically applied from the class fee settings.
          </p>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              📚 Select Class
            </label>
            <Select
              value={selectedClass}
              onChange={setSelectedClass}
              placeholder="Choose a class"
              size="large"
              style={{ width: '100%' }}
            >
              {classes?.map((cls: any) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={12}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              📅 Academic Year
            </label>
            <Select
              value={academicYear}
              onChange={setAcademicYear}
              size="large"
              style={{ width: '100%' }}
            >
              <Option value="2023-24">2023-24</Option>
              <Option value="2024-25">2024-25</Option>
              <Option value="2025-26">2025-26</Option>
            </Select>
          </Col>
        </Row>

        {selectedClass && selectedClassFees && selectedClassFees.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 16, fontSize: '16px', fontWeight: 600 }}>
              💰 Fees to be assigned to all students in {selectedClassName}:
            </h4>
            <Table
              dataSource={selectedClassFees}
              columns={[
                {
                  title: 'Fee Name',
                  dataIndex: 'fee_name',
                  key: 'fee_name',
                  render: (text: string) => <strong>{text}</strong>
                },
                {
                  title: 'Amount',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (val: number) => (
                    <span style={{ color: '#52c41a', fontWeight: 600 }}>₹{val.toLocaleString()}</span>
                  )
                },
                {
                  title: 'Installment Type',
                  dataIndex: 'installment_type',
                  key: 'installment_type',
                  render: (text: string) => (
                    <span style={{
                      padding: '4px 12px',
                      background: '#e6f7ff',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      📅 {text || 'Annually'}
                    </span>
                  )
                },
                {
                  title: 'Applicability',
                  dataIndex: 'fee_applicability',
                  key: 'fee_applicability',
                  render: (text: string) => (
                    <span style={{
                      padding: '4px 12px',
                      background: '#f6ffed',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      👥 {text || 'All'}
                    </span>
                  )
                },
              ]}
              rowKey="id"
              pagination={false}
              style={{ marginBottom: 16 }}
              bordered
            />
          </div>
        )}

        {selectedClass && (!selectedClassFees || selectedClassFees.length === 0) && (
          <div style={{
            background: '#fff2e8',
            border: '1px solid #ffbb96',
            borderRadius: '8px',
            padding: '12px 16px',
            marginTop: 16,
            color: '#d4380d'
          }}>
            ⚠️ No fees defined for {selectedClassName} in {academicYear}. Please set up class fees first.
          </div>
        )}

        <Button
          type="primary"
          size="large"
          onClick={handleBulkAssign}
          disabled={!selectedClass || !selectedClassFees || selectedClassFees.length === 0}
          loading={isLoading}
          icon={<span>✓</span>}
          style={{
            marginTop: 24,
            height: '48px',
            fontSize: '16px',
            borderRadius: '8px',
            fontWeight: 600
          }}
        >
          {isLoading ? 'Assigning Fees...' : `Assign Fees to All Students in ${selectedClassName || 'Selected Class'}`}
        </Button>
      </Card>
    </div>
  );
};

// Student Fee Ledger Component
const StudentFeeLedger: React.FC = () => {
  const [classFilter, setClassFilter] = useState<string | undefined>(undefined);
  const { data: classes } = useGetClassesQuery();
  const { data: outstandingData } = useGetAllStudentOutstandingQuery({ class_id: classFilter });

  const columns = [
    { title: 'Admission No', dataIndex: 'admission_number', key: 'admission_number' },
    { title: 'Student Name', dataIndex: 'student_name', key: 'student_name' },
    { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
    { title: 'Total Expected', dataIndex: 'total_expected', key: 'total_expected', render: (val: number) => `₹${val.toLocaleString()}` },
    { title: 'Total Paid', dataIndex: 'total_paid', key: 'total_paid', render: (val: number) => <span style={{ color: 'green' }}>₹{val.toLocaleString()}</span> },
    { title: 'Outstanding', dataIndex: 'total_outstanding', key: 'total_outstanding', render: (val: number) => <span style={{ color: val > 0 ? 'red' : 'green', fontWeight: 'bold' }}>₹{val.toLocaleString()}</span> },
    { title: 'Payment %', key: 'percentage', render: (_: any, record: any) => {
      const percentage = record.total_expected > 0 ? (record.total_paid / record.total_expected * 100).toFixed(1) : 0;
      return `${percentage}%`;
    }},
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Select
            placeholder="Filter by Class"
            onChange={setClassFilter}
            value={classFilter}
            allowClear
            style={{ width: '100%' }}
          >
            {classes?.map((cls: any) => (
              <Option key={cls.id} value={cls.id}>{cls.name}</Option>
            ))}
          </Select>
        </Col>
      </Row>

      <Table
        dataSource={outstandingData || []}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

const Finance: React.FC = () => {
  return (
    <div>
      <h2>Accounts Management</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Funds" key="1">
          <Funds />
        </TabPane>
        <TabPane tab="Fees" key="2">
          <Fees />
        </TabPane>
        <TabPane tab="Class Fees" key="3">
          <ClassFees />
        </TabPane>
        <TabPane tab="Bulk Assign Class Fees" key="9">
          <BulkClassFeeAssignment />
        </TabPane>
        <TabPane tab="Assign Student Fees" key="7">
          <StudentFeeAssignment />
        </TabPane>
        <TabPane tab="Student Fee Ledger" key="8">
          <StudentFeeLedger />
        </TabPane>
        <TabPane tab="Payments" key="4">
          <Payments />
        </TabPane>
        <TabPane tab="Concessions" key="5">
          <Concessions />
        </TabPane>
        <TabPane tab="Salaries" key="6">
          <Salaries />
        </TabPane>
      </Tabs>
    </div>
  );
};


export default Finance;