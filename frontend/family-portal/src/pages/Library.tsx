
import React from 'react';
import { Tabs, Table } from 'antd';
import { useGetBooksQuery, useGetMyTransactionsQuery } from '../services/libraryApi';

const Books: React.FC = () => {
  const { data: books, isLoading } = useGetBooksQuery();

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Author', dataIndex: 'author', key: 'author' },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    { title: 'Available Copies', dataIndex: 'available_copies', key: 'available_copies' },
  ];

  return (
    <Table dataSource={books} columns={columns} loading={isLoading} rowKey="id" />
  );
};

const MyTransactions: React.FC = () => {
  const { data: transactions, isLoading } = useGetMyTransactionsQuery();

  const columns = [
    { title: 'Book ID', dataIndex: 'book_id', key: 'book_id' },
    { title: 'Checkout Date', dataIndex: 'checkout_date', key: 'checkout_date' },
    { title: 'Return Date', dataIndex: 'return_date', key: 'return_date' },
    { title: 'Fine', dataIndex: 'fine_amount', key: 'fine_amount' },
  ];

  return (
    <Table dataSource={transactions} columns={columns} loading={isLoading} rowKey="id" />
  );
};

const Library: React.FC = () => {
  return (
    <div>
      <h2>Library</h2>
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            label: 'Books',
            key: '1',
            children: <Books />,
          },
          {
            label: 'My Transactions',
            key: '2',
            children: <MyTransactions />,
          },
        ]}
      />
    </div>
  );
};

export default Library;
