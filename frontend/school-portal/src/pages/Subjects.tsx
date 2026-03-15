import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import { useGetSubjectsQuery, useCreateSubjectMutation, useUpdateSubjectMutation, useDeleteSubjectMutation } from '../services/subjectsApi';
import type { Subject } from '../services/subjectsApi';

const Subjects: React.FC = () => {
  const { data: subjects, isLoading } = useGetSubjectsQuery();
  const [createSubject] = useCreateSubjectMutation();
  const [updateSubject] = useUpdateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form] = Form.useForm();

  const showModal = (subject: Subject | null = null) => {
    setEditingSubject(subject);
    setIsEdit(!!subject);
    setIsModalOpen(true);
    if (subject) {
      form.setFieldsValue(subject);
    }
    else {
      form.resetFields();
    }
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (isEdit) {
          await updateSubject({ id: editingSubject!.id, body: values }).unwrap();
          message.success('Subject updated successfully');
        } else {
          await createSubject(values).unwrap();
          message.success('Subject created successfully');
        }
        setIsModalOpen(false);
      } catch (error) {
        message.error(`Failed to ${isEdit ? 'update' : 'create'} subject`);
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id).unwrap();
      message.success('Subject deleted successfully');
    } catch (error) {
      message.error('Failed to delete subject');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Code', dataIndex: 'code', key: 'code' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Subject) => (
        <Space>
          <Button onClick={() => showModal(record)}>Edit</Button>
          <Popconfirm
            title="Delete Subject"
            description="Are you sure you want to delete this subject?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={() => showModal()}>
        Add Subject
      </Button>
      <Table dataSource={subjects} columns={columns} loading={isLoading} rowKey="id" />
      <Modal
        title={isEdit ? 'Edit Subject' : 'Add Subject'}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Subject Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Subject Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Subjects;
