import React, { useState } from 'react';
import { Tabs, Card, Table, DatePicker, Select, Button, Row, Col, Statistic, Tag, Space, Modal, Descriptions } from 'antd';
import { DollarOutlined, UserOutlined, BarChartOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  useGetCollectionSummaryQuery,
  useGetDefaultersReportQuery,
  useGetClassWiseCollectionQuery,
  useGetDailyCollectionQuery,
  useGetDailyExpenditureQuery,
  useGetFundsQuery,
  useLazyGetStudentLedgerQuery,
} from '../services/financeApi';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

const CollectionSummaryReport: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${String(currentYear + 1).slice(-2)}`);

  const { data, isLoading } = useGetCollectionSummaryQuery({ academic_year: academicYear });

  const fundColumns = [
    {
      title: 'Fund',
      dataIndex: 'fund_name',
      key: 'fund_name',
    },
    {
      title: 'Expected',
      dataIndex: 'expected_amount',
      key: 'expected_amount',
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Collected',
      dataIndex: 'collected_amount',
      key: 'collected_amount',
      render: (amount: number) => <span style={{ color: '#52c41a' }}>₹{amount.toLocaleString()}</span>,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding_amount',
      key: 'outstanding_amount',
      render: (amount: number) => <span style={{ color: '#f5222d' }}>₹{amount.toLocaleString()}</span>,
    },
    {
      title: 'Collection %',
      dataIndex: 'collection_percentage',
      key: 'collection_percentage',
      render: (percentage: number) => (
        <Tag color={percentage >= 80 ? 'green' : percentage >= 50 ? 'orange' : 'red'}>
          {percentage.toFixed(2)}%
        </Tag>
      ),
    },
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
        </Row>
      </Card>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Expected"
                  value={data.total_expected}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Collected"
                  value={data.total_collected}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Outstanding"
                  value={data.total_outstanding}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>

          <Card>
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: '16px' }}>Overall Collection: </strong>
              <Tag color={data.overall_percentage >= 80 ? 'green' : data.overall_percentage >= 50 ? 'orange' : 'red'} style={{ fontSize: '14px' }}>
                {data.overall_percentage.toFixed(2)}%
              </Tag>
            </div>
            <Table
              dataSource={data.by_fund}
              columns={fundColumns}
              loading={isLoading}
              pagination={false}
              rowKey="fund_name"
            />
          </Card>
        </>
      )}
    </div>
  );
};

const DefaultersReport: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${String(currentYear + 1).slice(-2)}`);
  const [minOutstanding, setMinOutstanding] = useState(0);
  const [includeOverdueOnly, setIncludeOverdueOnly] = useState(true);
  const [includeTransportFees, setIncludeTransportFees] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { data, isLoading } = useGetDefaultersReportQuery({
    academic_year: academicYear,
    min_outstanding: minOutstanding,
    include_overdue_only: includeOverdueOnly,
    include_transport_fees: includeTransportFees,
  });

  const [fetchStudentLedger, { data: ledgerData, isLoading: ledgerLoading }] = useLazyGetStudentLedgerQuery();

  const handleRowClick = (record: any) => {
    setSelectedStudent(record);
    setIsModalVisible(true);
    fetchStudentLedger({ student_id: record.student_id, academic_year: academicYear });
  };

  const handlePayFee = () => {
    setIsModalVisible(false);
    navigate(`/fee-collection?student_id=${selectedStudent.student_id}`);
  };

  const columns = [
    {
      title: 'Admission No.',
      dataIndex: 'admission_number',
      key: 'admission_number',
    },
    {
      title: 'Student Name',
      dataIndex: 'student_name',
      key: 'student_name',
    },
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: 'Paid',
      dataIndex: 'total_paid',
      key: 'total_paid',
      render: (amount: number) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>₹{(amount || 0).toLocaleString()}</span>,
      sorter: (a: any, b: any) => (a.total_paid || 0) - (b.total_paid || 0),
    },
    {
      title: 'Outstanding',
      dataIndex: 'total_outstanding',
      key: 'total_outstanding',
      render: (amount: number) => <span style={{ color: '#f5222d', fontWeight: 'bold' }}>₹{amount.toLocaleString()}</span>,
      sorter: (a: any, b: any) => a.total_outstanding - b.total_outstanding,
    },
    {
      title: 'Overdue',
      dataIndex: 'overdue_installments',
      key: 'overdue_installments',
      render: (count: number) => count > 0 ? <Tag color="red">{count} overdue</Tag> : '-',
    },
    {
      title: 'Oldest Due',
      dataIndex: 'oldest_due_date',
      key: 'oldest_due_date',
      render: (date: string) => date ? moment(date).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Contact',
      dataIndex: 'parent_phone',
      key: 'parent_phone',
      render: (phone: string) => phone || '-',
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Select value={academicYear} onChange={setAcademicYear} style={{ width: '100%' }}>
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
          <Col xs={24} sm={6}>
            <Select
              value={minOutstanding}
              onChange={setMinOutstanding}
              style={{ width: '100%' }}
              placeholder="Min. Outstanding"
            >
              <Option value={0}>All Amounts</Option>
              <Option value={1000}>Above ₹1,000</Option>
              <Option value={5000}>Above ₹5,000</Option>
              <Option value={10000}>Above ₹10,000</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              value={includeOverdueOnly}
              onChange={setIncludeOverdueOnly}
              style={{ width: '100%' }}
            >
              <Option value={true}>Overdue Only</Option>
              <Option value={false}>All Outstanding</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              value={includeTransportFees}
              onChange={setIncludeTransportFees}
              style={{ width: '100%' }}
            >
              <Option value={true}>Include Transport Fees</Option>
              <Option value={false}>School Fees Only</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Total Students with Fee Dues"
                  value={data.total_defaulters}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Total Outstanding"
                  value={data.total_outstanding}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>

          <Card>
            <Table
              dataSource={data.students}
              columns={columns}
              loading={isLoading}
              rowKey="student_id"
              pagination={{ pageSize: 20 }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>
        </>
      )}

      <Modal
        title="Fee Due Details"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>,
          <Button key="pay" type="primary" onClick={handlePayFee}>
            Pay Fee
          </Button>,
        ]}
      >
        {selectedStudent && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Student Name">{selectedStudent.student_name}</Descriptions.Item>
              <Descriptions.Item label="Admission No.">{selectedStudent.admission_number}</Descriptions.Item>
              <Descriptions.Item label="Class">{selectedStudent.class_name}</Descriptions.Item>
              <Descriptions.Item label="Contact">{selectedStudent.parent_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Total Fees">
                <span style={{ fontWeight: 'bold' }}>
                  ₹{(ledgerData?.total_expected ?? selectedStudent.total_outstanding)?.toLocaleString()}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Amount Paid">
                <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '16px' }}>
                  ₹{(ledgerData?.total_paid ?? 0)?.toLocaleString()}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Balance Outstanding" span={2}>
                <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: '16px' }}>
                  ₹{(ledgerData?.total_outstanding ?? selectedStudent.total_outstanding)?.toLocaleString()}
                </span>
              </Descriptions.Item>
            </Descriptions>

            {ledgerLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading fee details...</div>
            ) : ledgerData ? (
              <>
                <h4>Fee Breakdown:</h4>
                <Table
                  dataSource={ledgerData.fee_structures}
                  columns={[
                    {
                      title: 'Fee Name',
                      dataIndex: 'fee_name',
                      key: 'fee_name',
                    },
                    {
                      title: 'Total Amount',
                      dataIndex: 'total_amount',
                      key: 'total_amount',
                      render: (amount: number) => `₹${amount.toLocaleString()}`,
                    },
                    {
                      title: 'Paid',
                      dataIndex: 'amount_paid',
                      key: 'amount_paid',
                      render: (amount: number) => (
                        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                          ₹{amount.toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      title: 'Outstanding',
                      dataIndex: 'outstanding_amount',
                      key: 'outstanding_amount',
                      render: (amount: number) => (
                        <span style={{ color: amount > 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>
                          ₹{amount.toLocaleString()}
                        </span>
                      ),
                    },
                  ]}
                  pagination={false}
                  rowKey="id"
                  size="small"
                />
              </>
            ) : null}
          </>
        )}
      </Modal>
    </div>
  );
};

const ClassWiseReport: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${String(currentYear + 1).slice(-2)}`);

  const { data, isLoading } = useGetClassWiseCollectionQuery({ academic_year: academicYear });

  const columns = [
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: 'Students',
      dataIndex: 'total_students',
      key: 'total_students',
    },
    {
      title: 'Expected',
      dataIndex: 'expected_amount',
      key: 'expected_amount',
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Collected',
      dataIndex: 'collected_amount',
      key: 'collected_amount',
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding_amount',
      key: 'outstanding_amount',
      render: (amount: number) => <span style={{ color: '#f5222d' }}>₹{amount.toLocaleString()}</span>,
    },
    {
      title: 'Collection %',
      dataIndex: 'collection_percentage',
      key: 'collection_percentage',
      render: (percentage: number) => (
        <Tag color={percentage >= 80 ? 'green' : percentage >= 50 ? 'orange' : 'red'}>
          {percentage.toFixed(2)}%
        </Tag>
      ),
      sorter: (a: any, b: any) => a.collection_percentage - b.collection_percentage,
    },
    {
      title: 'With Dues',
      dataIndex: 'students_with_dues',
      key: 'students_with_dues',
      render: (count: number, record: any) => `${count}/${record.total_students}`,
    },
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
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={data?.classes}
          columns={columns}
          loading={isLoading}
          rowKey="class_id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

const DailyCollectionReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(moment());

  const { data, isLoading } = useGetDailyCollectionQuery({
    collection_date: selectedDate.format('YYYY-MM-DD'),
  });

  const fundColumns = [
    {
      title: 'Fund',
      dataIndex: 'fund_name',
      key: 'fund_name',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Payments',
      dataIndex: 'payment_count',
      key: 'payment_count',
    },
  ];

  const modeData = data?.by_mode ? Object.entries(data.by_mode).map(([mode, amount]) => ({
    mode,
    amount: amount as number,
  })) : [];

  const modeColumns = [
    {
      title: 'Payment Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: string) => <Tag>{mode}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <strong>Select Date:</strong>
          </Col>
          <Col>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              style={{ width: 200 }}
            />
          </Col>
        </Row>
      </Card>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Total Collection"
                  value={data.total_amount}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Total Payments"
                  value={data.total_payments}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card title="By Fund" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={data.by_fund}
                  columns={fundColumns}
                  pagination={false}
                  rowKey="fund_name"
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="By Payment Mode">
                <Table
                  dataSource={modeData}
                  columns={modeColumns}
                  pagination={false}
                  rowKey="mode"
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

const DailyExpenditureReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(moment());

  const { data, isLoading } = useGetDailyExpenditureQuery({
    expenditure_date: selectedDate.format('YYYY-MM-DD'),
  });

  const salaryColumns = [
    {
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
      render: (id: string) => id || '-',
    },
    {
      title: 'Teacher Name',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <span style={{ fontWeight: 'bold' }}>₹{amount.toLocaleString()}</span>,
    },
    {
      title: 'Payment Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => <Tag>{mode}</Tag>,
    },
  ];

  const modeData = data?.by_mode ? Object.entries(data.by_mode).map(([mode, amount]) => ({
    mode,
    amount: amount as number,
  })) : [];

  const modeColumns = [
    {
      title: 'Payment Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: string) => <Tag color="red">{mode}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <strong>Select Date:</strong>
          </Col>
          <Col>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              style={{ width: 200 }}
            />
          </Col>
        </Row>
      </Card>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Total Expenditure"
                  value={data.total_amount}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Total Payments"
                  value={data.total_payments}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Card title="Salary Payments" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={data.salaries}
                  columns={salaryColumns}
                  pagination={{ pageSize: 10 }}
                  rowKey={(record) => `${record.teacher_name}-${record.month}`}
                  size="small"
                  loading={isLoading}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="By Payment Mode">
                <Table
                  dataSource={modeData}
                  columns={modeColumns}
                  pagination={false}
                  rowKey="mode"
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {!data && !isLoading && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            No expenditure records for this date.
          </div>
        </Card>
      )}
    </div>
  );
};

const FinancialReports: React.FC = () => {
  return (
    <div>
      <h2>Financial Reports</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Collection Summary" key="1" icon={<BarChartOutlined />}>
          <CollectionSummaryReport />
        </TabPane>
        <TabPane tab="Fee Dues" key="2" icon={<UserOutlined />}>
          <DefaultersReport />
        </TabPane>
        <TabPane tab="Class-wise Collection" key="3">
          <ClassWiseReport />
        </TabPane>
        <TabPane tab="Daily Collection" key="4" icon={<CalendarOutlined />}>
          <DailyCollectionReport />
        </TabPane>
        <TabPane tab="Daily Expenditure" key="5" icon={<DollarOutlined />}>
          <DailyExpenditureReport />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default FinancialReports;
