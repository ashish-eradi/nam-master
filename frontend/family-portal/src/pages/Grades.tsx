import React from 'react';
import { Table, Typography, Spin, Card, Row, Col, Tag, Empty, Select } from 'antd';
import {
  TrophyOutlined,
  RiseOutlined,
  BookOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useGetMyGradesQuery } from '../services/familyApi';

const { Text, Title } = Typography;

interface Grade {
  id: string;
  score_achieved: number;
  grade_letter?: string;
  subject?: {
    name: string;
    code?: string;
  };
  assessment?: {
    name: string;
    max_marks?: number;
  };
}

const Grades: React.FC = () => {
  const { data: grades, isLoading } = useGetMyGradesQuery();

  // Calculate statistics
  const calculateStats = () => {
    if (!grades || grades.length === 0) {
      return { average: 0, highest: 0, lowest: 0, total: 0 };
    }
    const scores = grades.map((g: Grade) => g.score_achieved || 0);
    return {
      average: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      total: grades.length,
    };
  };

  const stats = calculateStats();

  const getGradeColor = (grade: string | undefined) => {
    switch (grade?.toUpperCase()) {
      case 'A+':
      case 'A':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'B+':
      case 'B':
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'C+':
      case 'C':
        return { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' };
      case 'D':
        return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
      default:
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    }
  };

  const columns = [
    {
      title: 'Subject',
      dataIndex: ['subject', 'name'],
      key: 'subject',
      render: (text: string, record: Grade) => (
        <div style={styles.subjectCell}>
          <div style={styles.subjectIcon}>
            <BookOutlined />
          </div>
          <div>
            <Text style={styles.subjectName}>{text}</Text>
            {record.subject?.code && (
              <Text style={styles.subjectCode}>{record.subject.code}</Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Assessment',
      dataIndex: ['assessment', 'name'],
      key: 'assessment',
      render: (text: string) => (
        <Text style={styles.assessmentText}>{text}</Text>
      ),
    },
    {
      title: 'Score',
      dataIndex: 'score_achieved',
      key: 'score',
      render: (score: number, record: Grade) => (
        <div style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{score}</Text>
          {record.assessment?.max_marks && (
            <Text style={styles.maxMarks}>/ {record.assessment.max_marks}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Grade',
      dataIndex: 'grade_letter',
      key: 'grade',
      render: (grade: string) => {
        const colors = getGradeColor(grade);
        return (
          <div
            style={{
              ...styles.gradeBadge,
              background: colors.bg,
              color: colors.color,
              border: `1px solid ${colors.border}`,
            }}
          >
            {grade || 'N/A'}
          </div>
        );
      },
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (_: unknown, record: Grade) => {
        const percentage = record.assessment?.max_marks
          ? Math.round((record.score_achieved / record.assessment.max_marks) * 100)
          : 0;
        let color = '#ef4444';
        if (percentage >= 80) color = '#10b981';
        else if (percentage >= 60) color = '#3b82f6';
        else if (percentage >= 40) color = '#f59e0b';

        return (
          <div style={styles.performanceContainer}>
            <div style={styles.performanceBar}>
              <div
                style={{
                  ...styles.performanceFill,
                  width: `${percentage}%`,
                  background: color,
                }}
              />
            </div>
            <Text style={{ ...styles.performanceText, color }}>{percentage}%</Text>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <Spin size="large" />
          <Text style={styles.loadingText}>Loading grade information...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <Title level={2} style={styles.pageTitle}>Academic Grades</Title>
          <Text style={styles.pageSubtitle}>
            Track academic performance and progress
          </Text>
        </div>
        <Select
          defaultValue="2024-25"
          style={{ width: 150 }}
          options={[
            { value: '2024-25', label: '2024-25' },
            { value: '2023-24', label: '2023-24' },
          ]}
        />
      </div>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={styles.statsRow}>
        <Col xs={24} sm={12} md={6}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #4f46e5' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(79, 70, 229, 0.1)' }}>
              <TrophyOutlined style={{ fontSize: '24px', color: '#4f46e5' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{stats.average}%</Text>
              <Text style={styles.statLabel}>Average Score</Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #10b981' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(16, 185, 129, 0.1)' }}>
              <RiseOutlined style={{ fontSize: '24px', color: '#10b981' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{stats.highest}</Text>
              <Text style={styles.statLabel}>Highest Score</Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #f59e0b' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(245, 158, 11, 0.1)' }}>
              <StarOutlined style={{ fontSize: '24px', color: '#f59e0b' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{stats.lowest}</Text>
              <Text style={styles.statLabel}>Lowest Score</Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #3b82f6' }}>
            <div style={{ ...styles.statIconBox, background: 'rgba(59, 130, 246, 0.1)' }}>
              <BookOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
            </div>
            <div style={styles.statContent}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Assessments</Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* Grades Table */}
      <Card style={styles.tableCard}>
        {grades && grades.length > 0 ? (
          <Table
            dataSource={grades}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} grades`,
            }}
            style={styles.table}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text style={styles.emptyText}>No grades available yet</Text>
            }
          />
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
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
  },
  statsRow: {
    marginBottom: '24px',
  },
  statCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    border: '1px solid #f0f0f0',
  },
  statIconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 500,
    marginTop: '4px',
  },
  tableCard: {
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  table: {
    borderRadius: '12px',
    overflow: 'hidden',
  },
  subjectCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subjectIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(79, 70, 229, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4f46e5',
    fontSize: '18px',
  },
  subjectName: {
    fontWeight: 600,
    color: '#1e293b',
    display: 'block',
    fontSize: '0.95rem',
  },
  subjectCode: {
    fontSize: '0.8rem',
    color: '#64748b',
    display: 'block',
  },
  assessmentText: {
    color: '#374151',
    fontSize: '0.9rem',
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  scoreValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  maxMarks: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  gradeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.9rem',
    minWidth: '48px',
  },
  performanceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  performanceBar: {
    flex: 1,
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden',
    minWidth: '80px',
  },
  performanceFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  performanceText: {
    fontWeight: 600,
    fontSize: '0.85rem',
    minWidth: '40px',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '1rem',
  },
};

export default Grades;
