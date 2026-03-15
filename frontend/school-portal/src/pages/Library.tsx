import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Space, Popconfirm, Select, AutoComplete, message } from 'antd';
import { useSelector } from 'react-redux';
import { 
  useGetBooksQuery, useCreateBookMutation, useUpdateBookMutation, useDeleteBookMutation,
  useCheckoutBookMutation, useReturnBookMutation, useGetStudentBooksQuery
} from '../services/libraryApi';
import { useGetStudentsQuery } from '../services/studentsApi';
import type { RootState } from '../store/store';
import type { Book, BookTransaction } from '../schemas/library_schema';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;

const Books: React.FC = () => {
  const { data: books, isLoading } = useGetBooksQuery();
  const [createBook] = useCreateBookMutation();
  const [updateBook] = useUpdateBookMutation();
  const [deleteBook] = useDeleteBookMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const showModal = (book: Book | null = null) => {
    setEditingBook(book);
    form.setFieldsValue(book ? book : { total_copies: 1 });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      if (editingBook) {
        await updateBook({ id: editingBook.id, body: values });
      } else {
        await createBook({ ...values, school_id: schoolId });
      }
      handleCancel();
    });
  };

  const handleDelete = (id: string) => {
    deleteBook(id);
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Author', dataIndex: 'author', key: 'author' },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Total Copies', dataIndex: 'total_copies', key: 'total_copies' },
    { title: 'Available', dataIndex: 'available_copies', key: 'available_copies' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Book) => (
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
        Add Book
      </Button>
      <Table dataSource={books} columns={columns} loading={isLoading} rowKey="id" />
      <Modal 
        title={editingBook ? "Edit Book" : "Add Book"} 
        visible={isModalVisible} 
        onOk={handleOk} 
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="author" label="Author">
            <Input />
          </Form.Item>
          <Form.Item name="isbn" label="ISBN">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input />
          </Form.Item>
          <Form.Item name="publisher" label="Publisher">
            <Input />
          </Form.Item>
          <Form.Item name="publication_year" label="Publication Year">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="total_copies" label="Total Copies" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Transactions: React.FC = () => {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
  
  const { data: students, isLoading: studentsLoading } = useGetStudentsQuery({ search: studentSearch });
  const { data: borrowedBooks, refetch: refetchBorrowed } = useGetStudentBooksQuery(selectedStudent?.id, { skip: !selectedStudent });
  const { data: allBooks, isLoading: booksLoading } = useGetBooksQuery();

  const [checkoutBook] = useCheckoutBookMutation();
  const [returnBook] = useReturnBookMutation();
  const [checkoutForm] = Form.useForm();

  const { school_id: schoolId, id: userId } = useSelector((state: RootState) => state.auth.user || {});

  const studentOptions = students?.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name} (${s.admission_number})` }));

  const handleStudentSelect = (value: string, option: any) => {
    setSelectedStudent({ id: value, name: option.label });
  };

  const handleReturn = async (transactionId: string) => {
    try {
      await returnBook(transactionId).unwrap();
      message.success('Book returned successfully!');
      refetchBorrowed();
    } catch {
      message.error('Failed to return book.');
    }
  };

  const handleCheckoutOk = () => {
    checkoutForm.validateFields().then(async (values) => {
      await checkoutBook({ 
        ...values, 
        student_id: selectedStudent.id,
        school_id: schoolId,
        issued_by_user_id: userId,
        status: 'ISSUED',
        checkout_date: values.checkout_date.format('YYYY-MM-DD'),
        due_date: values.due_date.format('YYYY-MM-DD'),
      });
      setIsCheckoutModalVisible(false);
      refetchBorrowed();
    });
  };

  const borrowedColumns = [
    { title: 'Book Title', dataIndex: ['book', 'title'], key: 'book_title' }, // Assuming book is populated
    { title: 'Checkout Date', dataIndex: 'checkout_date', key: 'checkout_date' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: BookTransaction) => (
        <Popconfirm title="Sure to return?" onConfirm={() => handleReturn(record.id)}>
          <a>Return</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <AutoComplete
          style={{ width: 300 }}
          options={studentOptions}
          onSelect={handleStudentSelect}
          onSearch={setStudentSearch}
          placeholder="Search for a student..."
          loading={studentsLoading}
        />
        {selectedStudent && (
          <div>
            <h3>{selectedStudent.name}</h3>
            <Button onClick={() => setIsCheckoutModalVisible(true)} type="primary" style={{ marginBottom: 16 }}>
              Issue New Book
            </Button>
            <Table 
              columns={borrowedColumns} 
              dataSource={borrowedBooks} 
              rowKey="id" 
              title={() => 'Borrowed Books'}
            />
          </div>
        )}
      </Space>
      <Modal title="Checkout Book" visible={isCheckoutModalVisible} onOk={handleCheckoutOk} onCancel={() => setIsCheckoutModalVisible(false)}>
        <Form form={checkoutForm} layout="vertical">
          <Form.Item name="book_id" label="Book" rules={[{ required: true }]}>
            <Select loading={booksLoading} placeholder="Select a book to issue">
              {allBooks?.filter(b => b.available_copies > 0).map(book => (
                <Option key={book.id} value={book.id}>{book.title}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="checkout_date" label="Checkout Date" rules={[{ required: true }]} initialValue={moment()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]} initialValue={moment().add(14, 'days')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Library: React.FC = () => {
  return (
    <div>
      <h2>Library Management</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Book Catalog" key="1">
          <Books />
        </TabPane>
        <TabPane tab="Issue/Return" key="2">
          <Transactions />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Library;
