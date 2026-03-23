import React, { useState } from 'react';
import { Tabs, Card, Table, DatePicker, Select, Button, Row, Col, Statistic, Tag, Space, Modal, Descriptions } from 'antd';
import { DollarOutlined, UserOutlined, BarChartOutlined, CalendarOutlined, PrinterOutlined, DownloadOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  useGetCollectionSummaryQuery,
  useGetDefaultersReportQuery,
  useGetClassWiseCollectionQuery,
  useGetDailyCollectionQuery,
  useGetDailyExpenditureQuery,
  useGetFundsQuery,
  useLazyGetStudentLedgerQuery,
  useLazyDownloadDailyCollectionQuery,
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

  const baseColumns = [
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
      title: 'Father Name',
      dataIndex: 'father_name',
      key: 'father_name',
      render: (name: string) => name || '-',
    },
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: 'Section',
      dataIndex: 'section',
      key: 'section',
      render: (s: string) => s || '-',
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

  const routeColumn = {
    title: 'Bus Route',
    dataIndex: 'route_name',
    key: 'route_name',
    render: (route: string) => route
      ? <Tag color="blue" icon={<CarOutlined />}>{route}</Tag>
      : '-',
  };

  const busOutstandingColumn = {
    title: 'Bus Due',
    dataIndex: 'transport_outstanding',
    key: 'transport_outstanding',
    render: (amount: number) => amount > 0
      ? <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>₹{amount.toLocaleString()}</span>
      : '-',
    sorter: (a: any, b: any) => (a.transport_outstanding || 0) - (b.transport_outstanding || 0),
  };

  const allStudents = data?.students || [];
  const busStudents = allStudents.filter((s: any) => s.route_name);
  const schoolOnlyStudents = allStudents.filter((s: any) => !s.route_name || s.school_outstanding > 0);

  const columnsAll = [...baseColumns, routeColumn];
  const columnsBus = [
    baseColumns[0], baseColumns[1], baseColumns[2], baseColumns[3], baseColumns[4],
    routeColumn,
    busOutstandingColumn,
    baseColumns[6], // outstanding (total)
    baseColumns[9], // contact
  ];

  const [duesTab, setDuesTab] = useState('all');

  const activeStudents = duesTab === 'bus' ? busStudents : duesTab === 'school' ? schoolOnlyStudents : allStudents;
  const activeColumns = duesTab === 'bus' ? columnsBus : columnsAll;

  const handleDownloadCSV = () => {
    if (!activeStudents.length) return;
    const isBus = duesTab === 'bus';
    const headers = isBus
      ? ['Admission No.', 'Student Name', 'Father Name', 'Class', 'Section', 'Bus Route', 'Bus Due', 'Total Outstanding', 'Contact']
      : ['Admission No.', 'Student Name', 'Father Name', 'Class', 'Section', 'Bus Route', 'Total Paid', 'Outstanding', 'Overdue Installments', 'Oldest Due Date', 'Contact'];
    const rows = activeStudents.map((s: any) => isBus
      ? [s.admission_number, s.student_name, s.father_name || '', s.class_name, s.section || '', s.route_name || '', s.transport_outstanding || 0, s.total_outstanding, s.parent_phone || '']
      : [s.admission_number, s.student_name, s.father_name || '', s.class_name, s.section || '', s.route_name || '', s.total_paid || 0, s.total_outstanding, s.overdue_installments, s.oldest_due_date || '', s.parent_phone || '']
    );
    const csv = [headers, ...rows].map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee-dues-${duesTab}-${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!activeStudents.length) return;
    const isBus = duesTab === 'bus';
    const tableRows = activeStudents.map((s: any) => isBus
      ? `<tr><td>${s.admission_number}</td><td>${s.student_name}</td><td>${s.father_name || '-'}</td><td>${s.class_name}</td><td>${s.section || '-'}</td><td>${s.route_name || '-'}</td><td>₹${(s.transport_outstanding || 0).toLocaleString()}</td><td>₹${s.total_outstanding.toLocaleString()}</td><td>${s.parent_phone || '-'}</td></tr>`
      : `<tr><td>${s.admission_number}</td><td>${s.student_name}</td><td>${s.father_name || '-'}</td><td>${s.class_name}</td><td>${s.section || '-'}</td><td>${s.route_name || '-'}</td><td>₹${(s.total_paid || 0).toLocaleString()}</td><td>₹${s.total_outstanding.toLocaleString()}</td><td>${s.overdue_installments}</td><td>${s.oldest_due_date || '-'}</td><td>${s.parent_phone || '-'}</td></tr>`
    ).join('');
    const headers = isBus
      ? '<th>Adm No.</th><th>Student Name</th><th>Father Name</th><th>Class</th><th>Section</th><th>Bus Route</th><th>Bus Due</th><th>Total Outstanding</th><th>Contact</th>'
      : '<th>Adm No.</th><th>Student Name</th><th>Father Name</th><th>Class</th><th>Section</th><th>Bus Route</th><th>Paid</th><th>Outstanding</th><th>Overdue</th><th>Oldest Due</th><th>Contact</th>';
    const title = duesTab === 'bus' ? 'Bus Fee Dues' : duesTab === 'school' ? 'School Fee Dues' : 'All Fee Dues';
    const html = `<html><head><title>${title} - ${academicYear}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0;font-weight:bold}</style>
      </head><body>
      <h2>${title} — ${academicYear}</h2>
      <p>Total Students: ${activeStudents.length} &nbsp;|&nbsp; Total Outstanding: ₹${activeStudents.reduce((s: number, r: any) => s + (r.total_outstanding || 0), 0).toLocaleString()}</p>
      <table><thead><tr>${headers}</tr></thead><tbody>${tableRows}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Tabs
                activeKey={duesTab}
                onChange={setDuesTab}
                size="small"
                style={{ marginBottom: 0 }}
                items={[
                  { key: 'all', label: `All (${allStudents.length})` },
                  { key: 'school', label: `School Fees (${schoolOnlyStudents.length})` },
                  { key: 'bus', label: <span><CarOutlined /> Bus Students ({busStudents.length})</span> },
                ]}
              />
              <Space>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                <Button icon={<DownloadOutlined />} type="primary" onClick={handleDownloadCSV}>Download CSV</Button>
              </Space>
            </div>
            <Table
              dataSource={activeStudents}
              columns={activeColumns}
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
                {ledgerData.previous_year_arrears?.length > 0 && (
                  <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffa940', borderRadius: 4 }}>
                    <strong style={{ color: '#d46b08' }}>⚠ Old Dues from Previous Year(s): </strong>
                    {ledgerData.previous_year_arrears.map((a: any) => (
                      <Tag key={`${a.academic_year}-${a.fee_name}`} color="orange" style={{ marginBottom: 4 }}>
                        {a.academic_year} — {a.fee_name}: ₹{a.outstanding_amount.toFixed(2)}
                      </Tag>
                    ))}
                    <div style={{ marginTop: 4 }}><strong>Total Old Dues: ₹{(ledgerData.total_arrears || 0).toFixed(2)}</strong></div>
                  </div>
                )}
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
  const [downloadPdf] = useLazyDownloadDailyCollectionQuery();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useGetDailyCollectionQuery({
    collection_date: selectedDate.format('YYYY-MM-DD'),
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadPdf(selectedDate.format('YYYY-MM-DD')).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily_collection_${selectedDate.format('YYYY-MM-DD')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — backend error already logged
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setDownloading(true);
    try {
      const blob = await downloadPdf(selectedDate.format('YYYY-MM-DD')).unwrap();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => { win.print(); };
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      // silent
    } finally {
      setDownloading(false);
    }
  };

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
        <Row gutter={16} align="middle" justify="space-between">
          <Col>
            <Space>
              <strong>Select Date:</strong>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                style={{ width: 200 }}
              />
            </Space>
          </Col>
          {data && (
            <Col>
              <Space>
                <Button icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}>
                  Download PDF
                </Button>
                <Button icon={<PrinterOutlined />} loading={downloading} onClick={handlePrint}>
                  Print
                </Button>
              </Space>
            </Col>
          )}
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
