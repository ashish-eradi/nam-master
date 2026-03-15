import React, { useState } from 'react';
import { Card, Table, Button, Typography, Select, DatePicker, Row, Col, Tag, Alert, Space, message } from 'antd';
import {
  DownloadOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useGetChildPaymentsQuery, useLazyDownloadReceiptQuery } from '../services/financeApi';
import type { RootState } from '../store/store';
import moment from 'moment';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PaymentHistory: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | undefined>(`${currentYear}-${String(currentYear + 1).slice(-2)}`);
  const [dateRange, setDateRange] = useState<[moment.Moment | null, moment.Moment | null] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const children = useSelector((state: RootState) => state.auth.user?.children || []);
  const childId = selectedChild || children[0]?.id;

  const { data: paymentsData, isLoading, error } = useGetChildPaymentsQuery(
    {
      child_id: childId,
      academic_year: academicYear === 'all' ? undefined : academicYear,
      limit: pagination.pageSize,
      offset: (pagination.current - 1) * pagination.pageSize,
    },
    { skip: !childId }
  );

  const [downloadReceipt, { isLoading: downloadingReceipt }] = useLazyDownloadReceiptQuery();

  const handleDownloadReceipt = async (paymentId: string, receiptNumber: string) => {
    try {
      const pdfBlob = await downloadReceipt(paymentId).unwrap();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('Receipt downloaded successfully');
    } catch (error) {
      message.error('Failed to download receipt');
    }
  };

  // Filter payments by date range
  const filteredPayments = React.useMemo(() => {
    if (!paymentsData?.payments || !dateRange || !dateRange[0] || !dateRange[1]) {
      return paymentsData?.payments || [];
    }

    return paymentsData.payments.filter((payment: any) => {
      const paymentDate = moment(payment.payment_date);
      return paymentDate.isSameOrAfter(dateRange[0], 'day') && paymentDate.isSameOrBefore(dateRange[1], 'day');
    });
  }, [paymentsData, dateRange]);

  const columns = [
    {
      title: 'Receipt No.',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => moment(date).format('DD MMM YYYY'),
      sorter: (a: any, b: any) => moment(a.payment_date).unix() - moment(b.payment_date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Amount',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a', fontSize: '1rem' }}>
          ₹{parseFloat(amount).toLocaleString()}
        </Text>
      ),
      sorter: (a: any, b: any) => parseFloat(a.amount_paid) - parseFloat(b.amount_paid),
    },
    {
      title: 'Payment Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => {
        const modeColors: { [key: string]: string } = {
          cash: 'blue',
          cheque: 'cyan',
          online: 'green',
          card: 'purple',
          upi: 'orange',
        };
        return (
          <Tag color={modeColors[mode] || 'default'}>
            {mode.toUpperCase()}
          </Tag>
        );
      },
      filters: [
        { text: 'Cash', value: 'cash' },
        { text: 'Cheque', value: 'cheque' },
        { text: 'Online', value: 'online' },
        { text: 'Card', value: 'card' },
        { text: 'UPI', value: 'upi' },
      ],
      onFilter: (value: any, record: any) => record.payment_mode === value,
    },
    {
      title: 'Fund',
      dataIndex: 'fund_name',
      key: 'fund_name',
      render: (text: string) => text || '-',
    },
    {
      title: 'Transaction Ref.',
      dataIndex: 'transaction_reference',
      key: 'transaction_reference',
      render: (text: string) => text ? <Text type="secondary">{text}</Text> : '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          size="small"
          onClick={() => handleDownloadReceipt(record.id, record.receipt_number)}
          loading={downloadingReceipt}
        >
          Download Receipt
        </Button>
      ),
    },
  ];

  // Calculate totals
  const totalAmount = filteredPayments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount_paid || 0), 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerBanner}>
        <div style={styles.headerContent}>
          <Title level={2} style={styles.headerTitle}>
            Payment History
          </Title>
          <Text style={styles.headerSubtitle}>
            View all fee payments and download receipts
          </Text>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ ...styles.card, marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {children.length > 1 && (
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>Select Child</Text>
                <Select
                  value={selectedChild || children[0]?.id}
                  onChange={setSelectedChild}
                  style={{ width: '100%' }}
                >
                  {children.map((child: any) => (
                    <Option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          )}
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Academic Year</Text>
              <Select
                value={academicYear}
                onChange={setAcademicYear}
                style={{ width: '100%' }}
              >
                <Option value="all">All Years</Option>
                {[0, 1, 2, 3, 4].map(offset => {
                  const year = currentYear - offset;
                  return (
                    <Option key={year} value={`${year}-${String(year + 1).slice(-2)}`}>
                      {year}-{String(year + 1).slice(-2)}
                    </Option>
                  );
                })}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Date Range</Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [moment.Moment | null, moment.Moment | null])}
                style={{ width: '100%' }}
                format="DD MMM YYYY"
              />
            </div>
          </Col>
          {dateRange && (
            <Col xs={24} sm={12} md={4}>
              <div style={{ paddingTop: '28px' }}>
                <Button
                  onClick={() => setDateRange(null)}
                  style={{ width: '100%' }}
                >
                  Clear Dates
                </Button>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {error && (
        <Alert
          message="Error Loading Payments"
          description="Unable to load payment history. Please try again later."
          type="error"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Summary Card */}
      {filteredPayments.length > 0 && (
        <Card style={{ ...styles.card, marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <div style={styles.summaryItem}>
                <CalendarOutlined style={styles.summaryIcon} />
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Total Payments</Text>
                  <Text strong style={{ fontSize: '1.5rem' }}>{filteredPayments.length}</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={styles.summaryItem}>
                <DollarOutlined style={{ ...styles.summaryIcon, color: '#52c41a' }} />
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Total Amount</Text>
                  <Text strong style={{ fontSize: '1.5rem', color: '#52c41a' }}>
                    ₹{totalAmount.toLocaleString()}
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={styles.summaryItem}>
                <FileTextOutlined style={{ ...styles.summaryIcon, color: '#1890ff' }} />
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>Receipts Available</Text>
                  <Text strong style={{ fontSize: '1.5rem', color: '#1890ff' }}>{filteredPayments.length}</Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Payments Table */}
      <Card
        style={styles.card}
        title={
          <div style={styles.cardHeader}>
            <FileTextOutlined style={styles.cardHeaderIcon} />
            <span>Payment Records</span>
          </div>
        }
      >
        <Table
          dataSource={filteredPayments}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: paymentsData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payments`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={(newPagination) => {
            setPagination({
              current: newPagination.current || 1,
              pageSize: newPagination.pageSize || 20,
            });
          }}
          size="middle"
        />

        {filteredPayments.length === 0 && !isLoading && (
          <div style={styles.noDataContainer}>
            <FileTextOutlined style={styles.noDataIcon} />
            <Text style={styles.noDataText}>
              {dateRange ? 'No payments found in the selected date range.' : 'No payment history available.'}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    marginLeft: '260px',
    minHeight: 'calc(100vh - 72px)',
    background: '#f8fafc',
  },
  headerBanner: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    borderRadius: '20px',
    padding: '32px 40px',
    marginBottom: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  headerTitle: {
    color: 'white',
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '8px',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1rem',
    margin: 0,
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  cardHeaderIcon: {
    color: '#3b82f6',
    fontSize: '18px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px',
  },
  summaryIcon: {
    fontSize: '32px',
    color: '#1890ff',
  },
  noDataContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  noDataIcon: {
    fontSize: '64px',
    color: '#d1d5db',
  },
  noDataText: {
    fontSize: '1rem',
    color: '#64748b',
  },
};

export default PaymentHistory;
