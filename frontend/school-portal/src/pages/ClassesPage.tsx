import React, { useState } from 'react';
import { Row, Col, List, Typography, Table, Spin, Alert, Button, Modal, Form, Input, message, InputNumber, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useGetClassesQuery, useCreateClassMutation } from '../services/classesApi';
import { useGetStudentsByClassIdQuery } from '../services/studentsApi';

const { Title, Text } = Typography;

const ClassesPage: React.FC = () => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { data: classes, error: classesError, isLoading: classesLoading } = useGetClassesQuery();
  const { data: students, error: studentsError, isLoading: studentsLoading } = useGetStudentsByClassIdQuery(selectedClassId!, { skip: !selectedClassId });
  const [createClass, { isLoading: isCreating }] = useCreateClassMutation();

  const handleClassSelect = (classItem: any) => {
    setSelectedClassId(classItem.id);
  };

  const handleAddClass = async () => {
    try {
      const values = await form.validateFields();
      await createClass(values).unwrap();
      message.success('Class created successfully');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create class');
    }
  };

  const studentColumns = [
    { title: 'Roll Number', dataIndex: 'roll_number', key: 'roll_number' },
    { title: 'First Name', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Last Name', dataIndex: 'last_name', key: 'last_name' },
  ];

  const error = classesError || studentsError;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>Classes Management</Title>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>Add Class</Button>
      </div>

      {error && <Alert message="Error" description={JSON.stringify(error)} type="error" showIcon />}
      <Row gutter={16}>
        <Col span={8}>
          <Title level={4}>Classes</Title>
          {classesLoading ? (
            <Spin />
          ) : (
            <List
              bordered
              dataSource={classes}
              renderItem={(item: any) => (
                <List.Item
                  onClick={() => handleClassSelect(item)}
                  style={{ cursor: 'pointer', backgroundColor: selectedClassId === item.id ? '#e6f7ff' : 'transparent' }}
                  actions={[
                    <Tooltip title="Copy Class ID (for bulk import)">
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.id);
                          message.success(`Copied ID for ${item.name} - ${item.section}`);
                        }}
                      />
                    </Tooltip>
                  ]}
                >
                  <Text strong>{item.name}</Text> - Section {item.section}
                </List.Item>
              )}
            />
          )}
        </Col>
        <Col span={16}>
          {selectedClassId ? (
            <div>
              <Title level={4}>Students</Title>
              {studentsLoading ? (
                <Spin />
              ) : (
                <Table dataSource={students} columns={studentColumns} rowKey="id" />
              )}
            </div>
          ) : (
            <Text>Select a class to view students.</Text>
          )}
        </Col>
      </Row>

      <Modal
        title="Add New Class"
        open={isModalVisible}
        onOk={handleAddClass}
        confirmLoading={isCreating}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Class Name" rules={[{ required: true, message: 'Please enter class name' }]}>
            <Input placeholder="e.g. Nursery, LKG, UKG, Class 1, Class 2, etc." />
          </Form.Item>
          <Form.Item name="section" label="Section" rules={[{ required: true, message: 'Please enter section' }]}>
            <Input placeholder="e.g. A" />
          </Form.Item>
          <Form.Item name="grade_level" label="Grade Level" rules={[{ required: true, message: 'Please enter grade level' }]}>
            <InputNumber min={0} max={12} placeholder="0 for pre-primary, 1-12 for classes" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true, message: 'Please enter academic year' }]}>
            <Input placeholder="e.g. 2024-2025" />
          </Form.Item>
          <Form.Item name="max_students" label="Max Students (Optional)">
            <InputNumber min={1} max={100} placeholder="Default: 40" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassesPage;
