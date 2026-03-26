import React, { useState, useRef } from 'react';
import { Card, Row, Col, Button, Table, Descriptions, Tag, Form, InputNumber, Select, DatePicker, Input, Modal, message, Space, Divider, AutoComplete, Tooltip, Typography } from 'antd';
import { SearchOutlined, DollarOutlined, DownloadOutlined, AlertOutlined, TeamOutlined, PrinterOutlined, EditOutlined, UserOutlined, HistoryOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useLazySearchStudentsQuery,
  useLazyGetStudentLedgerQuery,
  useGetStudentOutstandingQuery,
  useCreatePaymentWithAllocationMutation,
  useUpdatePaymentMutation,
  useLazyDownloadReceiptQuery,
  useLazyDownloadFeeDueSlipQuery,
  useGetFundsQuery,
} from '../services/financeApi';
import { useGetStudentsByClassIdQuery } from '../services/studentsApi';
import { useGetClassesQuery } from '../services/classApi';
import type { RootState } from '../store/store';
import type { StudentLookup, PaymentDetailCreate } from '../schemas/finance_schema';
import moment from 'moment';

const { Option } = Select;

const FeeCollection: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<StudentLookup | null>(null);
  const [searchOptions, setSearchOptions] = useState<StudentLookup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<{ value: string; label: React.ReactNode; student: StudentLookup }[]>([]);
  const [isClassSearch, setIsClassSearch] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [filterClassName, setFilterClassName] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentDetailCreate[]>([]);

  const [searchStudents, { isLoading: isSearching }] = useLazySearchStudentsQuery();
  const [getStudentLedger, { data: ledgerData, isLoading: isLoadingLedger }] = useLazyGetStudentLedgerQuery();
  const { data: outstandingData } = useGetStudentOutstandingQuery(selectedStudent?.id || '', {
    skip: !selectedStudent?.id,
  });
  const { data: funds } = useGetFundsQuery();
  const { data: classes } = useGetClassesQuery();
  const { data: classStudents, isLoading: isLoadingClassStudents } = useGetStudentsByClassIdQuery(selectedClassId, {
    skip: !selectedClassId,
  });
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentWithAllocationMutation();
  const [updatePayment, { isLoading: isUpdatingPayment }] = useUpdatePaymentMutation();
  const [downloadReceipt] = useLazyDownloadReceiptQuery();
  const [downloadFeeDueSlip] = useLazyDownloadFeeDueSlipQuery();

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { school_id: schoolId } = useSelector((state: RootState) => state.auth.user || {});

  // Convert classStudents to StudentLookup format when class is selected
  React.useEffect(() => {
    if (classStudents && classStudents.length > 0) {
      const formattedStudents: StudentLookup[] = classStudents.map((student: any) => ({
        id: student.id,
        admission_number: student.admission_number,
        full_name: `${student.first_name} ${student.last_name}`,
        class_name: student.class_?.name || 'N/A',
        outstanding_balance: 0, // Will be fetched on selection
      }));
      setSearchOptions(formattedStudents);
      setIsClassSearch(true);
      setSelectedStudent(null);
    }
  }, [classStudents]);

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setSearchQuery('');
    setSelectedStudent(null);
    setIsClassSearch(true);
    setAutoCompleteOptions([]);
  };

  // Derived options for two-step class+section picker
  const classNameOptions = Array.from(
    new Set((classes || []).map((c: any) => c.name).filter(Boolean))
  ).sort((a: any, b: any) => {
    const na = parseInt(a), nb = parseInt(b);
    return isNaN(na) || isNaN(nb) ? String(a).localeCompare(String(b)) : na - nb;
  }) as string[];

  const sectionOptions = (classes || [])
    .filter((c: any) => c.name === filterClassName && c.section)
    .map((c: any) => c.section as string)
    .sort();

  const handleClassNameChange = (name: string) => {
    setFilterClassName(name);
    setFilterSection('');
    setSelectedClassId('');
    setSearchOptions([]);
    setSelectedStudent(null);
  };

  const handleSectionChange = (section: string) => {
    setFilterSection(section);
    const matched = (classes || []).find((c: any) => c.name === filterClassName && c.section === section);
    if (matched) handleClassSelect(matched.id);
  };

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      message.warning('Please enter at least 2 characters to search');
      return;
    }

    // Clear class selection when doing text search
    setSelectedClassId('');
    setIsClassSearch(false);

    try {
      const results = await searchStudents(searchQuery).unwrap();
      if (results.length === 0) {
        message.info('No students found');
        setSearchOptions([]);
        setSelectedStudent(null);
      } else if (results.length === 1) {
        // Automatically select if only one result
        handleSelectStudent(results[0]);
      } else {
        setSearchOptions(results);
        setSelectedStudent(null);
      }
    } catch (error) {
      message.error('Search failed. Please try again.');
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSelectedClassId('');
    setIsClassSearch(false);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.length < 2) {
      setAutoCompleteOptions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchStudents(value).unwrap();
        const options = results.map(student => ({
          value: student.id,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong>{student.full_name}</strong>{' '}
                <Tag color="blue" style={{ marginLeft: 4 }}>{student.admission_number}</Tag>
                <span style={{ color: '#888', fontSize: '12px', marginLeft: 4 }}>{student.class_name}</span>
              </span>
              <Tag color={student.outstanding_balance > 0 ? 'red' : 'green'} style={{ marginLeft: 8 }}>
                ₹{student.outstanding_balance.toFixed(2)}
              </Tag>
            </div>
          ),
          student,
        }));
        setAutoCompleteOptions(options);
      } catch {
        // silent fail for autocomplete suggestions
      }
    }, 300);
  };

  const handleAutoCompleteSelect = (_value: string, option: any) => {
    handleSelectStudent(option.student);
    setAutoCompleteOptions([]);
    setSearchQuery('');
  };

  const handleSelectStudent = async (student: StudentLookup) => {
    setSelectedStudent(student);
    setSearchOptions([]);
    setSearchQuery('');

    // Fetch ledger data
    await getStudentLedger({
      student_id: student.id,
      academic_year: student.academic_year ?? undefined,
    });
  };

  const showPaymentModal = () => {
    if (!selectedStudent) {
      message.error('Please select a student first');
      return;
    }

    if (!outstandingData || outstandingData.total_outstanding <= 0) {
      message.info('This student has no outstanding fees');
      return;
    }

    // Pre-fill allocations with outstanding fees
    const initialAllocations: PaymentDetailCreate[] = outstandingData.by_fee.map((fee: any) => ({
      fee_id: fee.fee_id,
      student_fee_structure_id: fee.fee_structure_id,
      amount: 0, // User will enter amounts
    }));

    setPaymentAllocations(initialAllocations);
    form.setFieldsValue({
      payment_date: moment(),
      payment_mode: 'Cash',
    });
    setIsPaymentModalVisible(true);
  };

  const handlePaymentModalCancel = () => {
    setIsPaymentModalVisible(false);
    form.resetFields();
    setPaymentAllocations([]);
  };

  const handleAllocationChange = (index: number, amount: number) => {
    const newAllocations = [...paymentAllocations];
    newAllocations[index].amount = amount;
    setPaymentAllocations(newAllocations);
  };

  const handleDownloadFeeDueSlip = async () => {
    if (!selectedStudent) {
      message.error('Please select a student first');
      return;
    }

    if (!outstandingData || outstandingData.total_outstanding <= 0) {
      message.info('This student has no outstanding fees');
      return;
    }

    try {
      const pdfBlob = await downloadFeeDueSlip({
        student_id: selectedStudent.id,
        academic_year: selectedStudent?.academic_year ?? undefined,
      }).unwrap();

      const url = window.URL.createObjectURL(pdfBlob);

      // Download the PDF
      const a = document.createElement('a');
      a.href = url;
      a.download = `fee_due_slip_${selectedStudent.admission_number}_${moment().format('YYYYMMDD')}.pdf`;
      a.click();

      // Open print dialog
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      message.success('Fee due slip generated successfully!');
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to generate fee due slip');
    }
  };

  const calculateTotalAllocation = () => {
    return paymentAllocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedStudent) return;

    try {
      const values = await form.validateFields();
      const totalAllocation = calculateTotalAllocation();

      if (totalAllocation <= 0) {
        message.error('Please allocate payment to at least one fee');
        return;
      }

      // Filter out zero allocations
      const nonZeroAllocations = paymentAllocations.filter(alloc => alloc.amount > 0);

      const paymentData = {
        student_id: selectedStudent.id,
        fund_id: values.fund_id,
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount_paid: totalAllocation,
        payment_mode: values.payment_mode,
        transaction_id: values.transaction_id,
        remarks: values.remarks,
        school_id: schoolId!,
        payment_details: nonZeroAllocations,
      };

      const result = await createPayment(paymentData).unwrap();
      message.success('Payment recorded successfully!');

      // Download receipt automatically
      if (result.id) {
        const pdfBlob = await downloadReceipt(result.id).unwrap();
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${result.receipt_number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      // Refresh ledger data
      await getStudentLedger({
        student_id: selectedStudent.id,
        academic_year: selectedStudent?.academic_year ?? undefined,
      });

      handlePaymentModalCancel();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to record payment');
    }
  };

  const showEditModal = (payment: any) => {
    setEditingPayment(payment);
    editForm.setFieldsValue({
      payment_date: moment(payment.payment_date),
      amount_paid: payment.amount_paid,
      payment_mode: payment.payment_mode,
      transaction_id: payment.transaction_id,
      remarks: payment.remarks,
      edit_reason: '',
    });
    setIsEditModalVisible(true);
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setEditingPayment(null);
  };

  const handleEditSubmit = async () => {
    if (!editingPayment || !selectedStudent) return;

    try {
      const values = await editForm.validateFields();

      const updateData = {
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount_paid: values.amount_paid,
        payment_mode: values.payment_mode,
        transaction_id: values.transaction_id,
        remarks: values.remarks,
        edit_reason: values.edit_reason,
      };

      await updatePayment({
        payment_id: editingPayment.payment_id,
        body: updateData,
      }).unwrap();

      message.success('Payment updated successfully!');

      // Refresh ledger data
      await getStudentLedger({
        student_id: selectedStudent.id,
        academic_year: selectedStudent?.academic_year ?? undefined,
      });

      handleEditModalCancel();
    } catch (error: any) {
      message.error(error?.data?.detail || 'Failed to update payment');
    }
  };

  const ledgerColumns = [
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
      render: (y: string) => y ? <Tag color="blue">{y}</Tag> : '-',
    },
    {
      title: 'Fee',
      dataIndex: 'fee_name',
      key: 'fee_name',
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Final Amount',
      dataIndex: 'final_amount',
      key: 'final_amount',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Paid',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      render: (amount: number) => <Tag color="green">₹{amount.toFixed(2)}</Tag>,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding_amount',
      key: 'outstanding_amount',
      render: (amount: number) => (
        <Tag color={amount > 0 ? 'red' : 'default'}>₹{amount.toFixed(2)}</Tag>
      ),
    },
  ];

  const paymentHistoryColumns = [
    {
      title: 'Receipt No.',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
    },
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => moment(date).format('DD MMM YYYY'),
    },
    {
      title: 'Amount',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => <Tag>{mode}</Tag>,
    },
    {
      title: 'Recorded By',
      dataIndex: 'received_by_name',
      key: 'received_by_name',
      render: (name: string, record: any) => (
        <Tooltip title={record.recorded_at ? `on ${moment(record.recorded_at).format('DD MMM YYYY, hh:mm A')}` : ''}>
          <Space size={4}>
            <UserOutlined style={{ color: '#1890ff' }} />
            <span>{name || 'Unknown'}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Edit
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const pdfBlob = await downloadReceipt(record.payment_id).unwrap();
                const url = window.URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt_${record.receipt_number}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                message.error('Failed to download receipt');
              }
            }}
          >
            Download
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={async () => {
              try {
                // Open window immediately (before async) to avoid popup blocker
                const printWindow = window.open('', '_blank');
                const pdfBlob = await downloadReceipt(record.payment_id).unwrap();
                const url = window.URL.createObjectURL(pdfBlob);
                if (printWindow) {
                  printWindow.location.href = url;
                  printWindow.onload = () => {
                    printWindow.print();
                    setTimeout(() => window.URL.revokeObjectURL(url), 3000);
                  };
                }
              } catch (error) {
                message.error('Failed to print receipt');
              }
            }}
          >
            Print
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>Fee Collection</h2>

      {/* Student Search */}
      <Card title="Search Student" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="top" style={{ marginBottom: 16 }}>
          <Col xs={24} md={5}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Class:</div>
            <Select
              size="large"
              style={{ width: '100%' }}
              placeholder="Select class"
              value={filterClassName || undefined}
              onChange={handleClassNameChange}
              disabled={isSearching || isLoadingClassStudents}
              allowClear
              onClear={() => {
                setFilterClassName('');
                setFilterSection('');
                setSelectedClassId('');
                setSearchOptions([]);
              }}
            >
              {classNameOptions.map((name: string) => (
                <Option key={name} value={name}>
                  <TeamOutlined /> {name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={5}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Section:</div>
            <Select
              size="large"
              style={{ width: '100%' }}
              placeholder="Select section"
              value={filterSection || undefined}
              onChange={handleSectionChange}
              disabled={!filterClassName || isSearching || isLoadingClassStudents}
              loading={isLoadingClassStudents}
              allowClear
              onClear={() => {
                setFilterSection('');
                setSelectedClassId('');
                setSearchOptions([]);
              }}
            >
              {sectionOptions.map((sec: string) => (
                <Option key={sec} value={sec}>Section {sec}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={14}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Or Search by Name/Admission Number:</div>
            <AutoComplete
              size="large"
              style={{ width: '100%' }}
              options={autoCompleteOptions}
              value={searchQuery}
              onChange={handleSearchInput}
              onSelect={handleAutoCompleteSelect}
              disabled={isSearching || isLoadingClassStudents}
              notFoundContent={searchQuery.length >= 2 && !isSearching ? 'No students found' : null}
              dropdownMatchSelectWidth={500}
            >
              <Input
                size="large"
                placeholder="Type name or admission number..."
                prefix={<SearchOutlined />}
                onPressEnter={handleSearch}
                addonAfter={
                  <Button
                    type="primary"
                    loading={isSearching}
                    onClick={handleSearch}
                    disabled={!searchQuery || searchQuery.length < 2}
                    style={{ border: 'none', height: '100%' }}
                  >
                    Search
                  </Button>
                }
              />
            </AutoComplete>
          </Col>
        </Row>

        {/* Search Results */}
        {searchOptions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Divider orientation="left">Search Results ({searchOptions.length})</Divider>
            <Row gutter={[16, 16]}>
              {searchOptions.map(student => (
                <Col xs={24} sm={12} md={8} key={student.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectStudent(student)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: '16px' }}>{student.full_name}</strong>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="blue">{student.admission_number}</Tag>
                    </div>
                    <div style={{ marginBottom: 4, color: '#666' }}>
                      Class: {student.class_name}
                    </div>
                    <div>
                      Outstanding:{' '}
                      {isClassSearch ? (
                        <Tag color="default">Click to view</Tag>
                      ) : (
                        <Tag color={student.outstanding_balance > 0 ? 'red' : 'green'}>
                          ₹{student.outstanding_balance.toFixed(2)}
                        </Tag>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Card>

      {/* Student Details & Outstanding */}
      {selectedStudent && (
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Card
              title="Student Information"
              extra={
                <Space>
                  <Button
                    type="default"
                    danger
                    icon={<AlertOutlined />}
                    onClick={handleDownloadFeeDueSlip}
                    disabled={!outstandingData || outstandingData.total_outstanding <= 0}
                  >
                    Generate Fee Due Slip
                  </Button>
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={showPaymentModal}
                    disabled={!outstandingData || outstandingData.total_outstanding <= 0}
                  >
                    Record Payment
                  </Button>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Name">{selectedStudent.full_name}</Descriptions.Item>
                <Descriptions.Item label="Admission No">{selectedStudent.admission_number}</Descriptions.Item>
                <Descriptions.Item label="Class">{selectedStudent.class_name}</Descriptions.Item>
                <Descriptions.Item label="Outstanding Balance">
                  <Tag color={(outstandingData?.total_outstanding ?? selectedStudent.outstanding_balance) > 0 ? 'red' : 'green'} style={{ fontSize: '14px' }}>
                    ₹{(outstandingData?.total_outstanding ?? selectedStudent.outstanding_balance).toFixed(2)}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              {outstandingData && outstandingData.has_overdue && (
                <div style={{ marginTop: 16 }}>
                  <Tag color="warning">⚠ {outstandingData.overdue_count} Overdue Installment(s)</Tag>
                </div>
              )}
            </Card>

            {/* Fee Ledger */}
            {ledgerData && (
              <>
                <Card title="Fee Ledger" style={{ marginBottom: 16 }}>
                  <Table
                    dataSource={ledgerData.fee_structures}
                    columns={ledgerColumns}
                    pagination={false}
                    size="small"
                    rowKey="id"
                    loading={isLoadingLedger}
                    summary={(data) => {
                      const totalExpected = data.reduce((sum, item) => sum + item.final_amount, 0);
                      const totalPaid = data.reduce((sum, item) => sum + item.amount_paid, 0);
                      const totalOutstanding = data.reduce((sum, item) => sum + item.outstanding_amount, 0);

                      return (
                        <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                          <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
                          <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                          <Table.Summary.Cell index={3}>₹{totalExpected.toFixed(2)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={4}>
                            <Tag color="green">₹{totalPaid.toFixed(2)}</Tag>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5}>
                            <Tag color={totalOutstanding > 0 ? 'red' : 'default'}>
                              ₹{totalOutstanding.toFixed(2)}
                            </Tag>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </Card>

                {/* Previous Year Arrears */}
                {ledgerData.previous_year_arrears?.length > 0 && (
                  <Card
                    title={<span style={{ color: '#d46b08' }}>⚠ Previous Year Arrears (Old Dues)</span>}
                    style={{ marginBottom: 16, border: '1px solid #ffa940' }}
                    headStyle={{ background: '#fff7e6' }}
                  >
                    <Table
                      dataSource={ledgerData.previous_year_arrears}
                      rowKey={(r: any) => `${r.academic_year}-${r.fee_name}`}
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year', render: (y: string) => <Tag color="orange">{y}</Tag> },
                        { title: 'Fee', dataIndex: 'fee_name', key: 'fee_name' },
                        {
                          title: 'Old Due Amount',
                          dataIndex: 'outstanding_amount',
                          key: 'outstanding_amount',
                          render: (a: number) => <span style={{ color: '#d46b08', fontWeight: 'bold' }}>₹{a.toFixed(2)}</span>,
                        },
                      ]}
                      summary={() => (
                        <Table.Summary.Row style={{ fontWeight: 'bold', background: '#fff7e6' }}>
                          <Table.Summary.Cell index={0} colSpan={2}>Total Old Dues</Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>
                            <span style={{ color: '#d46b08', fontWeight: 'bold' }}>₹{(ledgerData.total_arrears || 0).toFixed(2)}</span>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                    />
                  </Card>
                )}

                {/* Payment History */}
                <Card title="Payment History">
                  <Table
                    dataSource={ledgerData.payments}
                    columns={paymentHistoryColumns}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    rowKey="payment_id"
                    expandable={{
                      rowExpandable: (record: any) => record.edit_history && record.edit_history.length > 0,
                      expandedRowRender: (record: any) => {
                        const fieldLabel: Record<string, string> = {
                          amount_paid: 'Amount',
                          payment_mode: 'Payment Mode',
                          payment_date: 'Payment Date',
                          transaction_id: 'Transaction ID',
                          remarks: 'Remarks',
                        };
                        const formatVal = (key: string, val: any) => {
                          if (val === null || val === undefined || val === '') return '—';
                          if (key === 'amount_paid') return `₹${Number(val).toFixed(2)}`;
                          if (key === 'payment_date') return moment(val).format('DD MMM YYYY');
                          return String(val);
                        };
                        return (
                          <div style={{ padding: '8px 16px', background: '#fffbe6', borderRadius: 4 }}>
                            <Space style={{ marginBottom: 10 }}>
                              <HistoryOutlined style={{ color: '#faad14' }} />
                              <strong>Edit History ({record.edit_history.length} edit{record.edit_history.length > 1 ? 's' : ''})</strong>
                            </Space>
                            {record.edit_history.map((h: any, idx: number) => {
                              const changedFields = Object.keys(h.new_value || {}).filter(
                                k => String(h.old_value?.[k]) !== String(h.new_value?.[k])
                              );
                              return (
                                <div key={idx} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '3px solid #faad14' }}>
                                  <div style={{ marginBottom: 4 }}>
                                    <strong>{h.edited_by}</strong>
                                    <span style={{ color: '#666', marginLeft: 8 }}>
                                      {moment(h.edited_at).format('DD MMM YYYY, hh:mm A')}
                                    </span>
                                    <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                                      (Edit #{idx + 1})
                                    </span>
                                  </div>
                                  <div style={{ color: '#d46b08', marginBottom: 6 }}>
                                    <strong>Reason:</strong> {h.edit_reason}
                                  </div>
                                  {changedFields.length > 0 && (
                                    <div style={{ background: '#fff', borderRadius: 4, padding: '6px 10px', display: 'inline-block' }}>
                                      {changedFields.map(k => (
                                        <div key={k} style={{ fontSize: 13, marginBottom: 2 }}>
                                          <span style={{ color: '#666' }}>{fieldLabel[k] || k}:</span>{' '}
                                          <span style={{ color: '#cf1322', textDecoration: 'line-through' }}>
                                            {formatVal(k, h.old_value?.[k])}
                                          </span>
                                          {' → '}
                                          <span style={{ color: '#389e0d', fontWeight: 600 }}>
                                            {formatVal(k, h.new_value?.[k])}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      },
                    }}
                  />
                </Card>
              </>
            )}
          </Col>

          {/* Outstanding Summary */}
          <Col xs={24} md={8}>
            {outstandingData && (
              <Card title="Outstanding Summary" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5222d' }}>
                    ₹{outstandingData.total_outstanding.toFixed(2)}
                  </div>
                  <div style={{ color: '#999' }}>Total Outstanding</div>
                </div>

                <Divider />

                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>By Fee:</div>
                  {outstandingData.by_fee.map((fee: any, idx: number) => (
                    <div key={fee.fee_structure_id || fee.fee_id || idx} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{fee.fee_name}</span>
                        {fee.academic_year && (
                          <Tag color="blue" style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px' }}>{fee.academic_year}</Tag>
                        )}
                      </div>
                      <div style={{ color: '#f5222d', fontSize: '16px' }}>
                        ₹{fee.outstanding.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* Payment Modal */}
      <Modal
        title="Record Payment"
        visible={isPaymentModalVisible}
        onCancel={handlePaymentModalCancel}
        onOk={handlePaymentSubmit}
        width={800}
        confirmLoading={isCreatingPayment}
        okText="Record Payment"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fund_id" label="Fund" rules={[{ required: true, message: 'Please select a fund' }]}>
                <Select placeholder="Select fund">
                  {funds?.map(fund => (
                    <Option key={fund.id} value={fund.id}>
                      {fund.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="payment_mode" label="Payment Mode" rules={[{ required: true }]}>
                <Select>
                  <Option value="Cash">Cash</Option>
                  <Option value="Card">Card</Option>
                  <Option value="UPI">UPI</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option>
                  <Option value="Cheque">Cheque</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transaction_id" label="Transaction ID">
                <Input placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Payment Allocation</Divider>

          <div style={{ marginBottom: 16 }}>
            <strong>Allocate payment to fees:</strong>
          </div>

          {outstandingData?.by_fee.map((fee: any, index: number) => (
            <Row key={fee.fee_structure_id || fee.fee_id || index} gutter={16} style={{ marginBottom: 8 }} align="middle">
              <Col span={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{fee.fee_name}</span>
                  {fee.academic_year && (
                    <Tag color="blue" style={{ fontSize: 11, padding: '0 4px' }}>{fee.academic_year}</Tag>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Outstanding: ₹{fee.outstanding.toFixed(2)}
                </div>
              </Col>
              <Col span={12}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={fee.outstanding}
                  precision={2}
                  value={paymentAllocations[index]?.amount || 0}
                  onChange={(value) => handleAllocationChange(index, value || 0)}
                  placeholder="Amount"
                  prefix="₹"
                />
              </Col>
            </Row>
          ))}

          <Divider />

          <Row justify="space-between" style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <Col>Total Payment:</Col>
            <Col>₹{calculateTotalAllocation().toFixed(2)}</Col>
          </Row>
        </Form>
      </Modal>

      {/* Edit Payment Modal */}
      <Modal
        title="Edit Payment"
        visible={isEditModalVisible}
        onCancel={handleEditModalCancel}
        onOk={handleEditSubmit}
        width={600}
        confirmLoading={isUpdatingPayment}
        okText="Update Payment"
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payment_date"
                label="Payment Date"
                rules={[{ required: true, message: 'Please select payment date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount_paid"
                label="Amount Paid"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="₹"
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payment_mode"
                label="Payment Mode"
                rules={[{ required: true, message: 'Please select payment mode' }]}
              >
                <Select>
                  <Option value="Cash">Cash</Option>
                  <Option value="Card">Card</Option>
                  <Option value="UPI">UPI</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option>
                  <Option value="Cheque">Cheque</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transaction_id" label="Transaction ID">
                <Input placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} placeholder="Optional notes about this correction" />
          </Form.Item>

          <Form.Item
            name="edit_reason"
            label="Reason for Edit"
            rules={[{ required: true, message: 'Please provide a reason for editing this payment' }, { min: 3, message: 'Reason must be at least 3 characters' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="e.g. Incorrect amount entered, wrong payment mode, data entry error..."
              style={{ borderColor: '#faad14' }}
            />
          </Form.Item>

          <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: '4px', marginTop: '8px' }}>
            <strong>Note:</strong> Editing this payment will recalculate fee allocations proportionally. The reason and editor details will be saved in the audit log.
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FeeCollection;
