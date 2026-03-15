import React, { useState } from 'react';
import { Card, Col, Row, Spin, Typography, Table, Select, Tag, Alert, Statistic } from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useGetChildFeesQuery } from '../services/financeApi';
import type { RootState } from '../store/store';
import moment from 'moment';

const { Text, Title } = Typography;
const { Option } = Select;

const Fees: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${String(currentYear + 1).slice(-2)}`);

  const children = useSelector((state: RootState) => state.auth.user?.children || []);
  const childId = selectedChild || children[0]?.id;

  const { data: feeData, isLoading, error } = useGetChildFeesQuery(
    { child_id: childId, academic_year: academicYear },
    { skip: !childId }
  );

  // Calculate totals
  const totalExpected = feeData?.fee_structures?.reduce((sum: number, fs: any) => sum + parseFloat(fs.final_amount || 0), 0) || 0;
  const totalPaid = feeData?.fee_structures?.reduce((sum: number, fs: any) => sum + parseFloat(fs.amount_paid || 0), 0) || 0;
  const totalOutstanding = feeData?.fee_structures?.reduce((sum: number, fs: any) => sum + parseFloat(fs.outstanding_amount || 0), 0) || 0;
  const overdueCount = feeData?.installments?.filter((inst: any) =>
    inst.status === 'pending' && moment(inst.due_date).isBefore(moment())
  ).length || 0;

  // Fee Structures Table Columns
  const feeColumns = [
    {
      title: 'Fee Name',
      dataIndex: 'fee_name',
      key: 'fee_name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `₹${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      render: (amount: number) => amount > 0 ? (
        <Text type="success">-₹{parseFloat(amount).toLocaleString()}</Text>
      ) : '-',
    },
    {
      title: 'Final Amount',
      dataIndex: 'final_amount',
      key: 'final_amount',
      render: (amount: number) => <Text strong>₹{parseFloat(amount).toLocaleString()}</Text>,
    },
    {
      title: 'Paid',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      render: (amount: number) => (
        <Text style={{ color: '#52c41a' }}>₹{parseFloat(amount).toLocaleString()}</Text>
      ),
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding_amount',
      key: 'outstanding_amount',
      render: (amount: number) => (
        <Text style={{ color: amount > 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>
          ₹{parseFloat(amount).toLocaleString()}
        </Text>
      ),
    },
  ];

  // Installments Table Columns
  const installmentColumns = [
    {
      title: 'Installment',
      dataIndex: 'installment_number',
      key: 'installment_number',
      render: (num: number, record: any) => (
        <div>
          <Text strong>Installment #{num}</Text>
          {record.fee_name && <div><Text type="secondary" style={{ fontSize: '0.85rem' }}>{record.fee_name}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => moment(date).format('DD MMM YYYY'),
      sorter: (a: any, b: any) => moment(a.due_date).unix() - moment(b.due_date).unix(),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${parseFloat(amount).toLocaleString()}`,
    },
    {
      title: 'Paid',
      dataIndex: 'amount_paid',
      key: 'amount_paid',
      render: (amount: number) => amount > 0 ? (
        <Text style={{ color: '#52c41a' }}>₹{parseFloat(amount).toLocaleString()}</Text>
      ) : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        const isOverdue = status === 'pending' && moment(record.due_date).isBefore(moment());

        if (status === 'paid') {
          return <Tag icon={<CheckCircleOutlined />} color="success">Paid</Tag>;
        } else if (isOverdue) {
          return <Tag icon={<WarningOutlined />} color="error">Overdue</Tag>;
        } else {
          return <Tag icon={<ClockCircleOutlined />} color="warning">Pending</Tag>;
        }
      },
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Pending', value: 'pending' },
        { text: 'Partially Paid', value: 'partially_paid' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
  ];

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
        <Text style={styles.loadingText}>Loading fee details...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Alert
          message="Error Loading Fees"
          description="Unable to load fee information. Please try again later."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerBanner}>
        <div style={styles.headerContent}>
          <Title level={2} style={styles.headerTitle}>
            Fee Details
          </Title>
          <Text style={styles.headerSubtitle}>
            View detailed fee breakdown and payment schedules for your child
          </Text>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ ...styles.card, marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          {children.length > 1 && (
            <>
              <Col>
                <Text strong>Select Child:</Text>
              </Col>
              <Col>
                <Select
                  value={selectedChild || children[0]?.id}
                  onChange={setSelectedChild}
                  style={{ width: 200 }}
                >
                  {children.map((child: any) => (
                    <Option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </>
          )}
          <Col>
            <Text strong>Academic Year:</Text>
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

      {/* Summary Statistics */}
      {overdueCount > 0 && (
        <Alert
          message="Overdue Payments"
          description={`You have ${overdueCount} overdue installment${overdueCount > 1 ? 's' : ''}. Please make payment as soon as possible.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: '24px' }}
        />
      )}

      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card style={styles.statCard}>
            <Statistic
              title="Total Fee Amount"
              value={totalExpected}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={styles.statCard}>
            <Statistic
              title="Amount Paid"
              value={totalPaid}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={styles.statCard}>
            <Statistic
              title="Outstanding Amount"
              value={totalOutstanding}
              precision={2}
              prefix="₹"
              valueStyle={{ color: totalOutstanding > 0 ? '#f5222d' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Fee Structure Table */}
      <Card
        style={{ ...styles.card, marginBottom: '24px' }}
        title={
          <div style={styles.cardHeader}>
            <DollarOutlined style={styles.cardHeaderIcon} />
            <span>Fee Breakdown</span>
          </div>
        }
      >
        <Table
          dataSource={feeData?.fee_structures || []}
          columns={feeColumns}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Installment Schedule */}
      {feeData?.installments && feeData.installments.length > 0 && (
        <Card
          style={styles.card}
          title={
            <div style={styles.cardHeader}>
              <ClockCircleOutlined style={styles.cardHeaderIcon} />
              <span>Installment Schedule</span>
            </div>
          }
        >
          <Table
            dataSource={feeData.installments}
            columns={installmentColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
            rowClassName={(record: any) => {
              const isOverdue = record.status === 'pending' && moment(record.due_date).isBefore(moment());
              return isOverdue ? 'overdue-row' : '';
            }}
          />
        </Card>
      )}

      {/* No Data Message */}
      {(!feeData?.fee_structures || feeData.fee_structures.length === 0) && (
        <Card style={styles.card}>
          <div style={styles.noDataContainer}>
            <DollarOutlined style={styles.noDataIcon} />
            <Text style={styles.noDataText}>No fee information available for the selected academic year.</Text>
          </div>
        </Card>
      )}
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '1rem',
  },
  headerBanner: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
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
  statCard: {
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
    color: '#10b981',
    fontSize: '18px',
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

export default Fees;
