import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Card, AutoComplete, message, InputNumber, DatePicker } from 'antd';
import { useSelector } from 'react-redux';
import {
  useGetHostelsQuery, useCreateHostelMutation, useUpdateHostelMutation, useDeleteHostelMutation,
  useGetHostelRoomsQuery, useCreateHostelRoomMutation, useUpdateHostelRoomMutation, useDeleteHostelRoomMutation,
  useGetAllAllocationsQuery, useAllocateStudentMutation, useVacateStudentMutation, useGetStudentAllocationQuery,
  useAssignHostelFeeToStudentMutation,
  useGetHostelFeesQuery, useCreateHostelFeeMutation, useUpdateHostelFeeMutation, useDeleteHostelFeeMutation
} from '../services/hostelApi';
import { useGetFundsQuery } from '../services/financeApi';
import { useGetStudentsByClassIdQuery } from '../services/studentsApi';
import { useGetClassesQuery } from '../services/classesApi';
import type { RootState } from '../store/store';
import type { Hostel, HostelRoom, HostelAllocation } from '../schemas/hostel_schema';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;

const HostelsAndRooms: React.FC = () => {
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [isHostelModalVisible, setIsHostelModalVisible] = useState(false);
  const [isRoomModalVisible, setIsRoomModalVisible] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [editingRoom, setEditingRoom] = useState<HostelRoom | null>(null);
  const [hostelForm] = Form.useForm();
  const [roomForm] = Form.useForm();

  const { data: hostels, isLoading: hostelsLoading } = useGetHostelsQuery();
  const { data: rooms, isLoading: roomsLoading, refetch: refetchRooms } = useGetHostelRoomsQuery(selectedHostel?.id!, { skip: !selectedHostel });

  const [createHostel] = useCreateHostelMutation();
  const [updateHostel] = useUpdateHostelMutation();
  const [deleteHostel] = useDeleteHostelMutation();
  const [createRoom] = useCreateHostelRoomMutation();
  const [updateRoom] = useUpdateHostelRoomMutation();
  const [deleteRoom] = useDeleteHostelRoomMutation();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  useEffect(() => {
    if (selectedHostel) {
      refetchRooms();
    }
  }, [selectedHostel, refetchRooms]);

  // Hostel Modal Handlers
  const showHostelModal = (hostel: Hostel | null = null) => {
    setEditingHostel(hostel);
    hostelForm.setFieldsValue(hostel);
    setIsHostelModalVisible(true);
  };
  const handleHostelCancel = () => setIsHostelModalVisible(false);
  const handleHostelOk = () => {
    hostelForm.validateFields().then(async (values) => {
      if (editingHostel) {
        await updateHostel({ id: editingHostel.id, body: values });
      } else {
        await createHostel({ ...values, school_id: schoolId });
      }
      handleHostelCancel();
    });
  };

  // Room Modal Handlers
  const showRoomModal = (room: HostelRoom | null = null) => {
    setEditingRoom(room);
    roomForm.setFieldsValue(room);
    setIsRoomModalVisible(true);
  };
  const handleRoomCancel = () => setIsRoomModalVisible(false);
  const handleRoomOk = () => {
    roomForm.validateFields().then(async (values) => {
      if (editingRoom) {
        await updateRoom({ id: editingRoom.id, body: values });
      } else {
        await createRoom({ ...values, hostel_id: selectedHostel?.id });
      }
      handleRoomCancel();
    });
  };

  const hostelColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'hostel_type', key: 'hostel_type' },
    { title: 'Warden', dataIndex: 'warden_name', key: 'warden_name' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Hostel) => (
        <Space>
          <a onClick={() => setSelectedHostel(record)}>View Rooms</a>
          <a onClick={() => showHostelModal(record)}>Edit</a>
          <Popconfirm title="Sure to delete?" onConfirm={() => deleteHostel(record.id)}>
            <a>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const roomColumns = [
    { title: 'Room Number', dataIndex: 'room_number', key: 'room_number' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    { title: 'Occupied', dataIndex: 'occupied_count', key: 'occupied_count' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: HostelRoom) => (
        <Space>
          <a onClick={() => showRoomModal(record)}>Edit</a>
          <Popconfirm title="Sure to delete?" onConfirm={() => deleteRoom(record.id)}>
            <a>Delete</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button onClick={() => showHostelModal()} type="primary">Create Hostel</Button>
      <Table dataSource={hostels} columns={hostelColumns} loading={hostelsLoading} rowKey="id" />

      {selectedHostel && (
        <Card title={`Rooms in ${selectedHostel.name}`}>
          <Button onClick={() => showRoomModal()} type="primary" style={{ marginBottom: 16 }}>Add Room</Button>
          <Table dataSource={rooms} columns={roomColumns} loading={roomsLoading} rowKey="id" />
        </Card>
      )}

      <Modal title={editingHostel ? "Edit Hostel" : "Create Hostel"} visible={isHostelModalVisible} onOk={handleHostelOk} onCancel={handleHostelCancel}>
        <Form form={hostelForm} layout="vertical">
          <Form.Item name="name" label="Hostel Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hostel_type" label="Type" rules={[{ required: true }]}>
            <Select><Option value="Boys">Boys</Option><Option value="Girls">Girls</Option></Select>
          </Form.Item>
          <Form.Item name="warden_name" label="Warden Name"><Input /></Form.Item>
          <Form.Item name="warden_phone" label="Warden Phone"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingRoom ? "Edit Room" : "Add Room"} visible={isRoomModalVisible} onOk={handleRoomOk} onCancel={handleRoomCancel}>
        <Form form={roomForm} layout="vertical">
          <Form.Item name="room_number" label="Room Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

const StudentAllocation: React.FC = () => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'allocate' | 'view'>('allocate');
  const [selectedRoomView, setSelectedRoomView] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { data: students, isLoading: studentsLoading } = useGetStudentsByClassIdQuery(selectedClassId!, { skip: !selectedClassId });
  const { data: hostels, isLoading: hostelsLoading } = useGetHostelsQuery();
  const { data: rooms, isLoading: roomsLoading } = useGetHostelRoomsQuery(selectedHostelId!, { skip: !selectedHostelId });
  const { data: allAllocations, isLoading: allocationsLoading, refetch: refetchAllocations } = useGetAllAllocationsQuery();

  const [allocateStudent] = useAllocateStudentMutation();
  const [vacateStudent] = useVacateStudentMutation();
  const [assignHostelFee] = useAssignHostelFeeToStudentMutation();
  const { data: hostelFees } = useGetHostelFeesQuery();

  // Set of student IDs that are already allocated
  const allocatedStudentIds = new Set((allAllocations || []).map((a: any) => a.student_id));

  // Map studentId → allocation detail for showing current room
  const allocationByStudent: Record<string, any> = {};
  (allAllocations || []).forEach((a: any) => { allocationByStudent[a.student_id] = a; });

  // Determine gender required for selected hostel
  const selectedHostel = hostels?.find(h => h.id === selectedHostelId);
  const requiredGender = selectedHostel?.hostel_type === 'Boys' ? 'Male'
    : selectedHostel?.hostel_type === 'Girls' ? 'Female' : null;

  const handleAllocate = () => {
    form.validateFields().then(async (values) => {
      if (selectedStudentIds.length === 0) {
        message.error('Please select at least one student');
        return;
      }
      const roomData = rooms?.find(r => r.id === values.room_id);
      const available = roomData ? roomData.capacity - roomData.occupied_count : 0;
      if (selectedStudentIds.length > available) {
        message.error(`Only ${available} slot(s) available in this room`);
        return;
      }
      let successCount = 0;
      let failMessages: string[] = [];
      for (const studentId of selectedStudentIds) {
        try {
          await allocateStudent({
            student_id: studentId,
            room_id: values.room_id,
            allocation_date: values.allocation_date.format('YYYY-MM-DD'),
            academic_year: values.academic_year,
          }).unwrap();
          successCount++;
        } catch (err: any) {
          const student = students?.find(s => s.id === studentId);
          const name = student ? `${student.first_name} ${student.last_name}` : studentId;
          failMessages.push(`${name}: ${err?.data?.detail || 'failed'}`);
        }
      }
      // Auto-assign hostel fee to successfully allocated students
      if (successCount > 0 && values.hostel_fee_id) {
        for (const studentId of selectedStudentIds.slice(0, successCount)) {
          try {
            await assignHostelFee({
              studentId,
              body: { hostel_fee_id: values.hostel_fee_id, academic_year: values.academic_year },
            }).unwrap();
          } catch { /* ignore duplicate assignments */ }
        }
      }
      if (successCount > 0) message.success(`${successCount} student(s) allocated and fee assigned`);
      if (failMessages.length > 0) message.error(failMessages.join('\n'));
      refetchAllocations();
      setIsModalVisible(false);
      setSelectedStudentIds([]);
      form.resetFields();
      setSelectedHostelId(null);
    });
  };

  const handleVacate = async (allocationId: string) => {
    try {
      await vacateStudent(allocationId).unwrap();
      message.success('Student vacated');
      refetchAllocations();
    } catch (err: any) {
      message.error(err?.data?.detail || 'Vacate failed');
    }
  };

  const studentColumns = [
    { title: 'Admission No.', dataIndex: 'admission_number', key: 'admission_number' },
    { title: 'Name', key: 'name', render: (_: any, r: any) => `${r.first_name} ${r.last_name}` },
    { title: 'Gender', dataIndex: 'gender', key: 'gender' },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) => {
        if (allocatedStudentIds.has(r.id)) {
          const a = allocationByStudent[r.id];
          return <span style={{ color: '#d46b08' }}>Allocated — {a?.hostel_name} / Room {a?.room_number}</span>;
        }
        if (requiredGender && r.gender !== requiredGender) {
          return <span style={{ color: '#cf1322' }}>Gender mismatch</span>;
        }
        return <span style={{ color: '#389e0d' }}>Available</span>;
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedStudentIds,
    onChange: (keys: React.Key[]) => setSelectedStudentIds(keys as string[]),
    getCheckboxProps: (record: any) => ({
      disabled: allocatedStudentIds.has(record.id) || (!!requiredGender && record.gender !== requiredGender),
    }),
  };

  // Group allocations by room for the card view
  const roomGroups: Record<string, { roomId: string; roomNumber: string; hostelName: string; hostelType: string; capacity: number; students: any[] }> = {};
  (allAllocations || []).forEach((a: any) => {
    if (!roomGroups[a.room_id]) {
      const roomInfo = (hostels || []).reduce((found: any, h: any) => found, null);
      roomGroups[a.room_id] = {
        roomId: a.room_id,
        roomNumber: a.room_number,
        hostelName: a.hostel_name,
        hostelType: a.hostel_type,
        capacity: 0,
        students: [],
      };
    }
    roomGroups[a.room_id].students.push(a);
  });
  const roomCards = Object.values(roomGroups);

  const roomStudentColumns = [
    { title: 'Name', dataIndex: 'student_name', key: 'student_name' },
    { title: 'Admission No.', dataIndex: 'admission_number', key: 'admission_number' },
    { title: 'Gender', dataIndex: 'gender', key: 'gender' },
    { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm title="Vacate this student?" onConfirm={async () => { await handleVacate(record.id); setSelectedRoomView(null); }}>
          <Button danger size="small">Vacate</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as any)}>
        <TabPane tab="Allocate Students" key="allocate">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card>
              <Space wrap>
                <Select
                  placeholder="Select Class"
                  style={{ width: 220 }}
                  loading={classesLoading}
                  onChange={(val) => { setSelectedClassId(val); setSelectedStudentIds([]); }}
                  allowClear
                  onClear={() => { setSelectedClassId(null); setSelectedStudentIds([]); }}
                >
                  {classes?.map((c: any) => (
                    <Option key={c.id} value={c.id}>{c.name} — {c.section}</Option>
                  ))}
                </Select>
                <Button
                  type="primary"
                  disabled={selectedStudentIds.length === 0}
                  onClick={() => setIsModalVisible(true)}
                >
                  Allocate Room ({selectedStudentIds.length} selected)
                </Button>
              </Space>
            </Card>

            {selectedClassId && (
              <Table
                rowSelection={{ type: 'checkbox', ...rowSelection }}
                dataSource={students}
                columns={studentColumns}
                loading={studentsLoading || allocationsLoading}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                locale={{ emptyText: 'No students in this class' }}
              />
            )}
          </Space>
        </TabPane>

        <TabPane tab="Room Allocation View" key="view">
          {allocationsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : roomCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No students currently allocated to any room</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {roomCards.map(room => (
                <Card
                  key={room.roomId}
                  hoverable
                  style={{ width: 220, cursor: 'pointer', borderRadius: 8 }}
                  onClick={() => setSelectedRoomView(room)}
                >
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Room {room.roomNumber}</div>
                  <div style={{ color: '#555', marginBottom: 8 }}>{room.hostelName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>{room.hostelType}</span>
                    <span style={{
                      background: '#e6f4ff', color: '#1677ff',
                      borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 600
                    }}>
                      {room.students.length} student{room.students.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Room detail modal */}
          <Modal
            title={selectedRoomView ? `Room ${selectedRoomView.roomNumber} — ${selectedRoomView.hostelName}` : ''}
            open={!!selectedRoomView}
            onCancel={() => setSelectedRoomView(null)}
            footer={null}
            width={640}
          >
            {selectedRoomView && (
              <Table
                dataSource={selectedRoomView.students}
                columns={roomStudentColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Modal>
        </TabPane>
      </Tabs>

      <Modal
        title="Allocate Room"
        visible={isModalVisible}
        onOk={handleAllocate}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); setSelectedHostelId(null); }}
        okText={`Allocate ${selectedStudentIds.length} Student(s)`}
      >
        <p style={{ marginBottom: 16 }}>
          Allocating <strong>{selectedStudentIds.length}</strong> student(s) to a room.
        </p>
        <Form form={form} layout="vertical">
          <Form.Item name="hostel_id" label="Hostel" rules={[{ required: true }]}>
            <Select
              loading={hostelsLoading}
              placeholder="Select a hostel"
              onChange={(val) => { setSelectedHostelId(val); form.setFieldValue('room_id', undefined); }}
            >
              {hostels?.map(h => <Option key={h.id} value={h.id}>{h.name} ({h.hostel_type})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="room_id" label="Room" rules={[{ required: true }]}>
            <Select
              loading={roomsLoading}
              placeholder="Select a room"
              disabled={!selectedHostelId}
            >
              {rooms?.map(r => (
                <Option key={r.id} value={r.id} disabled={r.capacity - r.occupied_count < 1}>
                  Room {r.room_number} — {r.capacity - r.occupied_count}/{r.capacity} slots free
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="hostel_fee_id" label="Hostel Fee" rules={[{ required: true, message: 'Please select a hostel fee' }]}>
            <Select placeholder="Select hostel fee" disabled={!selectedHostelId}>
              {hostelFees?.filter((hf: any) => hf.hostel_id === selectedHostelId).map((hf: any) => (
                <Option key={hf.id} value={hf.id}>
                  ₹{Number(hf.amount).toFixed(2)} — {hf.installment_type || 'one-time'} ({hf.academic_year})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="allocation_date" label="Allocation Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
            <Input placeholder="e.g., 2024-25" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

const HostelFeesManager: React.FC = () => {
  const { data: hostelFees, isLoading } = useGetHostelFeesQuery();
  const { data: hostels, isLoading: hostelsLoading } = useGetHostelsQuery();
  const { data: funds, isLoading: fundsLoading } = useGetFundsQuery();
  const [createHostelFee] = useCreateHostelFeeMutation();
  const [updateHostelFee] = useUpdateHostelFeeMutation();
  const [deleteHostelFee] = useDeleteHostelFeeMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [form] = Form.useForm();

  const currentYear = new Date().getFullYear();

  const showModal = (fee: any | null = null) => {
    setEditingFee(fee);
    form.setFieldsValue(fee || { academic_year: `${currentYear}-${String(currentYear + 1).slice(-2)}` });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingFee) {
          await updateHostelFee({ id: editingFee.id, body: values }).unwrap();
          message.success('Hostel fee updated');
        } else {
          await createHostelFee(values).unwrap();
          message.success('Hostel fee created');
        }
        handleCancel();
      } catch {
        message.error('Failed to save hostel fee');
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHostelFee(id).unwrap();
      message.success('Hostel fee deleted');
    } catch {
      message.error('Failed to delete hostel fee');
    }
  };

  const columns = [
    {
      title: 'Hostel',
      dataIndex: 'hostel_id',
      key: 'hostel_id',
      render: (hostelId: string) => hostels?.find(h => h.id === hostelId)?.name || 'N/A',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${Number(amount).toFixed(2)}`,
    },
    {
      title: 'Fund',
      dataIndex: 'fund_id',
      key: 'fund_id',
      render: (fundId: string) => funds?.find((f: any) => f.id === fundId)?.name || 'N/A',
    },
    {
      title: 'Installment Type',
      dataIndex: 'installment_type',
      key: 'installment_type',
      render: (type: string) => type ? type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A',
    },
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
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
        Add Hostel Fee
      </Button>
      <Table dataSource={hostelFees} columns={columns} loading={isLoading} rowKey="id" />
      <Modal
        title={editingFee ? 'Edit Hostel Fee' : 'Add Hostel Fee'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="hostel_id" label="Hostel" rules={[{ required: true }]}>
            <Select loading={hostelsLoading} placeholder="Select a hostel">
              {hostels?.map(h => <Option key={h.id} value={h.id}>{h.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fund_id" label="Fund" rules={[{ required: true }]}>
            <Select loading={fundsLoading} placeholder="Select a fund">
              {funds?.map((f: any) => <Option key={f.id} value={f.id}>{f.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="installment_type" label="Installment Type">
            <Select placeholder="Select installment type" allowClear>
              <Option value="monthly">Monthly</Option>
              <Option value="quarterly">Quarterly</Option>
              <Option value="half_yearly">Half Yearly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
          </Form.Item>
          <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
            <Input placeholder="e.g., 2024-25" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const HostelPage: React.FC = () => {
  return (
    <div>
      <h2>Hostel Management</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Hostels & Rooms" key="1">
          <HostelsAndRooms />
        </TabPane>
        <TabPane tab="Student Allocation" key="2">
          <StudentAllocation />
        </TabPane>
        <TabPane tab="Hostel Fees" key="3">
          <HostelFeesManager />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default HostelPage;