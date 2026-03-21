import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, Select, AutoComplete, message, Card } from 'antd';
import { useSelector } from 'react-redux';
import {
  useGetRoutesQuery, useCreateRouteMutation, useUpdateRouteMutation, useDeleteRouteMutation,
  useGetVehiclesQuery, useCreateVehicleMutation, useUpdateVehicleMutation, useDeleteVehicleMutation,
  useAssignStudentToRouteMutation, useGetStudentRouteQuery, useUnassignStudentFromRouteMutation,
  useGetRouteFeesQuery, useCreateRouteFeeMutation, useUpdateRouteFeeMutation, useDeleteRouteFeeMutation,
  useAssignRouteFeeToStudentMutation
} from '../services/transportApi';
import { useGetStudentsQuery, useGetStudentsByClassIdQuery } from '../services/studentsApi';
import { useGetFundsQuery } from '../services/financeApi';
import { useGetClassesQuery } from '../services/classApi';
import type { RootState } from '../store/store';
import type { Route, Vehicle, StudentRoute } from '../schemas/transport_schema';

const { TabPane } = Tabs;
const { Option } = Select;

const RoutesManager: React.FC = () => {
  const { data: routes, isLoading } = useGetRoutesQuery();
  const [createRoute] = useCreateRouteMutation();
  const [updateRoute] = useUpdateRouteMutation();
  const [deleteRoute] = useDeleteRouteMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const showModal = (route: Route | null = null) => {
    setEditingRoute(route);
    form.setFieldsValue(route ? { ...route, pickup_points: route.pickup_points?.join(', ') } : {});
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      const routeData = { ...values, pickup_points: values.pickup_points?.split(',').map((s: string) => s.trim()) };
      if (editingRoute) {
        await updateRoute({ id: editingRoute.id, body: routeData });
      } else {
        await createRoute({ ...routeData, school_id: schoolId });
      }
      handleCancel();
    });
  };

  const handleDelete = (id: string) => {
    deleteRoute(id);
  };

  const columns = [
    { title: 'Route Name', dataIndex: 'route_name', key: 'route_name' },
    { title: 'Route Number', dataIndex: 'route_number', key: 'route_number' },
    { title: 'Pickup Points', dataIndex: 'pickup_points', key: 'pickup_points', render: (points: string[]) => points?.join(', ') },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Route) => (
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
        Add Route
      </Button>
      <Table dataSource={routes} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title={editingRoute ? "Edit Route" : "Add Route"} visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Form form={form} layout="vertical">
          <Form.Item name="route_name" label="Route Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="route_number" label="Route Number">
            <Input />
          </Form.Item>
          <Form.Item name="pickup_points" label="Pickup Points (comma-separated)">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const VehiclesManager: React.FC = () => {
  const { data: vehicles, isLoading } = useGetVehiclesQuery();
  const { data: routes, isLoading: routesLoading } = useGetRoutesQuery();
  const [createVehicle] = useCreateVehicleMutation();
  const [updateVehicle] = useUpdateVehicleMutation();
  const [deleteVehicle] = useDeleteVehicleMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form] = Form.useForm();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const showModal = (vehicle: Vehicle | null = null) => {
    setEditingVehicle(vehicle);
    form.setFieldsValue(vehicle);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      if (editingVehicle) {
        await updateVehicle({ id: editingVehicle.id, body: values });
      } else {
        await createVehicle({ ...values, school_id: schoolId });
      }
      handleCancel();
    });
  };

  const handleDelete = (id: string) => {
    deleteVehicle(id);
  };

  const columns = [
    { title: 'Vehicle Number', dataIndex: 'vehicle_number', key: 'vehicle_number' },
    { title: 'Type', dataIndex: 'vehicle_type', key: 'vehicle_type' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    { title: 'Driver', dataIndex: 'driver_name', key: 'driver_name' },
    { title: 'Assigned Route', dataIndex: 'route_id', key: 'route_id', render: (routeId: string) => routes?.find(r => r.id === routeId)?.route_name || 'N/A' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Vehicle) => (
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
        Add Vehicle
      </Button>
      <Table dataSource={vehicles} columns={columns} loading={isLoading} rowKey="id" />
      <Modal title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"} visible={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <Form form={form} layout="vertical">
          <Form.Item name="vehicle_number" label="Vehicle Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="vehicle_type" label="Type">
            <Input />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="driver_name" label="Driver Name">
            <Input />
          </Form.Item>
          <Form.Item name="driver_phone" label="Driver Phone">
            <Input />
          </Form.Item>
          <Form.Item name="route_id" label="Assign to Route">
            <Select loading={routesLoading} placeholder="Select a route" allowClear>
              {routes?.map(route => <Option key={route.id} value={route.id}>{route.route_name}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const StudentAssignment: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;

  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFeeModalVisible, setIsFeeModalVisible] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [form] = Form.useForm();
  const [feeForm] = Form.useForm();

  const { data: students, isLoading: studentsLoading } = useGetStudentsQuery({ search: studentSearch }, { skip: !!selectedClassId || !studentSearch });
  const { data: classStudents, isLoading: classStudentsLoading } = useGetStudentsByClassIdQuery(selectedClassId, { skip: !selectedClassId });
  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { data: routes, isLoading: routesLoading } = useGetRoutesQuery();
  const { data: routeFees } = useGetRouteFeesQuery();
  const { data: studentRoute, refetch } = useGetStudentRouteQuery(
    { studentId: selectedStudent?.id, academic_year: academicYear },
    { skip: !selectedStudent }
  );

  const [assignStudent] = useAssignStudentToRouteMutation();
  const [assignRouteFee] = useAssignRouteFeeToStudentMutation();
  const [unassignStudent] = useUnassignStudentFromRouteMutation();

  const schoolId = useSelector((state: RootState) => state.auth.user?.school_id);

  const studentOptions = students?.map(s => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name} (${s.admission_number})`,
    student: s,
  }));

  const feesForRoute = routeFees?.filter((rf: any) => rf.route_id === selectedRouteId) || [];

  const handleStudentSelect = (value: string, option: any) => {
    setSelectedStudent({ id: value, name: option.label });
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setStudentSearch('');
    setSelectedStudent(null);
  };

  const handleCardClick = (student: any) => {
    setSelectedStudent({ id: student.id, name: `${student.first_name} ${student.last_name} (${student.admission_number})` });
  };

  const handleAssign = () => {
    form.validateFields().then(async (values) => {
      try {
        await assignStudent({ ...values, student_id: selectedStudent.id, school_id: schoolId, academic_year: academicYear }).unwrap();

        if (values.route_fee_id) {
          try {
            await assignRouteFee({
              student_id: selectedStudent.id,
              body: { route_fee_id: values.route_fee_id, academic_year, create_installments: false }
            }).unwrap();
            message.success('Route and transport fee assigned successfully!');
          } catch (err: any) {
            message.warning('Route assigned but fee assignment failed: ' + (err?.data?.detail || 'Unknown error'));
          }
        } else {
          message.success('Route assigned successfully!');
        }

        setIsModalVisible(false);
        setSelectedRouteId('');
        form.resetFields();
        refetch();
      } catch (err: any) {
        message.error('Assignment failed: ' + (err?.data?.detail || 'Unknown error'));
      }
    });
  };

  const handleUnassign = async () => {
    if (!studentRoute?.id) return;
    try {
      await unassignStudent(studentRoute.id).unwrap();
      message.success('Student unassigned from route.');
      refetch();
    } catch (err: any) {
      message.error('Failed to unassign: ' + (err?.data?.detail || 'Unknown error'));
    }
  };

  const currentRouteFee = studentRoute
    ? routeFees?.find((rf: any) => rf.route_id === studentRoute.route_id)
    : null;

  const displayStudents = selectedClassId ? classStudents : [];

  return (
    <div>
      {/* Top filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Academic Year:</div>
            <Select value={academicYear} onChange={val => { setAcademicYear(val); setSelectedStudent(null); }} style={{ width: 130 }}>
              {[0, 1, 2].map(offset => {
                const y = currentYear - offset;
                return <Option key={y} value={`${y}-${String(y + 1).slice(-2)}`}>{y}-{String(y + 1).slice(-2)}</Option>;
              })}
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Filter by Class:</div>
            <Select
              style={{ width: 200 }}
              placeholder="Select a class"
              loading={classesLoading}
              value={selectedClassId || undefined}
              onChange={handleClassChange}
              allowClear
              onClear={() => { setSelectedClassId(''); setSelectedStudent(null); }}
            >
              {classes?.map((cls: any) => (
                <Option key={cls.id} value={cls.id}>{cls.name}</Option>
              ))}
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Search by Name:</div>
            <AutoComplete
              style={{ width: 280 }}
              options={studentOptions}
              onSelect={handleStudentSelect}
              onSearch={(val) => { setStudentSearch(val); setSelectedClassId(''); setSelectedStudent(null); }}
              placeholder="Type student name..."
              loading={studentsLoading}
              value={studentSearch || undefined}
            />
          </div>
        </div>
      </Card>

      {/* Student Cards Grid (when class is selected) */}
      {selectedClassId && (
        <div style={{ marginBottom: 16 }}>
          {classStudentsLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>Loading students...</div>
          ) : (displayStudents?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>No students in this class.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {displayStudents?.map((student: any) => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <Card
                    key={student.id}
                    size="small"
                    hoverable
                    onClick={() => handleCardClick(student)}
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      background: isSelected ? '#e6f7ff' : '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{student.first_name} {student.last_name}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>{student.admission_number}</div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transport Status Card for selected student */}
      {selectedStudent && (
        <Card
          title={`Transport — ${selectedStudent.name}`}
          style={{ marginBottom: 16 }}
          extra={<span style={{ color: '#888', fontSize: 12 }}>Year: {academicYear}</span>}
        >
          {studentRoute ? (
            <div>
              <p><strong>Route:</strong> {routes?.find(r => r.id === studentRoute.route_id)?.route_name || 'Unknown'}</p>
              <p><strong>Pickup Point:</strong> {studentRoute.pickup_point || '-'}</p>
              {currentRouteFee && (
                <p><strong>Route Fee:</strong> ₹{currentRouteFee.amount} ({currentRouteFee.installment_type})</p>
              )}
              <Space>
                <Button type="default" onClick={() => { feeForm.resetFields(); setIsFeeModalVisible(true); }}>
                  Assign Transport Fee
                </Button>
                <Popconfirm title="Unassign this student from the route?" onConfirm={handleUnassign} okText="Yes" cancelText="No">
                  <Button danger>Unassign from Route</Button>
                </Popconfirm>
              </Space>
            </div>
          ) : (
            <div>
              <p style={{ color: '#888' }}>Not assigned to any transport route for {academicYear}.</p>
              <Button type="primary" onClick={() => { form.resetFields(); setIsModalVisible(true); }}>
                Assign to Route
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Assign Route Modal */}
      <Modal
        title="Assign Route & Fee"
        open={isModalVisible}
        onOk={handleAssign}
        onCancel={() => { setIsModalVisible(false); setSelectedRouteId(''); form.resetFields(); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="route_id" label="Route" rules={[{ required: true }]}>
            <Select
              loading={routesLoading}
              placeholder="Select a route"
              onChange={(val) => { setSelectedRouteId(val); form.setFieldValue('route_fee_id', undefined); }}
            >
              {routes?.map(route => <Option key={route.id} value={route.id}>{route.route_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="pickup_point" label="Pickup Point" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="route_fee_id" label="Transport Fee (optional)">
            <Select placeholder="Select fee for this route" allowClear disabled={!selectedRouteId}>
              {feesForRoute.map((rf: any) => (
                <Option key={rf.id} value={rf.id}>
                  ₹{rf.amount} — {rf.installment_type} ({rf.academic_year})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Fee Modal (for already-routed student) */}
      <Modal
        title="Assign Transport Fee"
        open={isFeeModalVisible}
        onOk={() => {
          feeForm.validateFields().then(async (values) => {
            try {
              await assignRouteFee({
                student_id: selectedStudent.id,
                body: { route_fee_id: values.route_fee_id, academic_year, create_installments: false }
              }).unwrap();
              message.success('Transport fee assigned successfully!');
              setIsFeeModalVisible(false);
              feeForm.resetFields();
              refetch();
            } catch (err: any) {
              message.error('Failed to assign fee: ' + (err?.data?.detail || 'Unknown error'));
            }
          });
        }}
        onCancel={() => { setIsFeeModalVisible(false); feeForm.resetFields(); }}
      >
        <Form form={feeForm} layout="vertical">
          <Form.Item name="route_fee_id" label="Select Transport Fee" rules={[{ required: true, message: 'Please select a fee' }]}>
            <Select placeholder="Select a fee for this route">
              {routeFees
                ?.filter((rf: any) => rf.route_id === studentRoute?.route_id)
                .map((rf: any) => (
                  <Option key={rf.id} value={rf.id}>
                    ₹{rf.amount} — {rf.installment_type} ({rf.academic_year})
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const RouteFeesManager: React.FC = () => {
  const { data: routeFees, isLoading } = useGetRouteFeesQuery();
  const { data: routes, isLoading: routesLoading } = useGetRoutesQuery();
  const { data: funds, isLoading: fundsLoading } = useGetFundsQuery();
  const [createRouteFee] = useCreateRouteFeeMutation();
  const [updateRouteFee] = useUpdateRouteFeeMutation();
  const [deleteRouteFee] = useDeleteRouteFeeMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRouteFee, setEditingRouteFee] = useState<any | null>(null);
  const [form] = Form.useForm();

  const currentYear = new Date().getFullYear();

  const showModal = (routeFee: any | null = null) => {
    setEditingRouteFee(routeFee);
    form.setFieldsValue(routeFee || { academic_year: `${currentYear}-${String(currentYear + 1).slice(-2)}` });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingRouteFee) {
          await updateRouteFee({ id: editingRouteFee.id, body: values }).unwrap();
          message.success('Route fee updated successfully');
        } else {
          await createRouteFee(values).unwrap();
          message.success('Route fee created successfully');
        }
        handleCancel();
      } catch (error) {
        message.error('Failed to save route fee');
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRouteFee(id).unwrap();
      message.success('Route fee deleted successfully');
    } catch (error) {
      message.error('Failed to delete route fee');
    }
  };

  const columns = [
    {
      title: 'Route',
      dataIndex: 'route_id',
      key: 'route_id',
      render: (routeId: string) => routes?.find(r => r.id === routeId)?.route_name || 'N/A',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₹${amount.toFixed(2)}`,
    },
    {
      title: 'Fund',
      dataIndex: 'fund_id',
      key: 'fund_id',
      render: (fundId: string) => funds?.find(f => f.id === fundId)?.name || 'N/A',
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
        Add Route Fee
      </Button>
      <Table dataSource={routeFees} columns={columns} loading={isLoading} rowKey="id" />
      <Modal
        title={editingRouteFee ? "Edit Route Fee" : "Add Route Fee"}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="route_id" label="Route" rules={[{ required: true }]}>
            <Select loading={routesLoading} placeholder="Select a route">
              {routes?.map(route => (
                <Option key={route.id} value={route.id}>{route.route_name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fund_id" label="Fund" rules={[{ required: true }]}>
            <Select loading={fundsLoading} placeholder="Select a fund">
              {funds?.map(fund => (
                <Option key={fund.id} value={fund.id}>{fund.name}</Option>
              ))}
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

const TransportPage: React.FC = () => {
  return (
    <div>
      <h2>Transport Management</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Routes" key="1">
          <RoutesManager />
        </TabPane>
        <TabPane tab="Vehicles" key="2">
          <VehiclesManager />
        </TabPane>
        <TabPane tab="Student Assignment" key="3">
          <StudentAssignment />
        </TabPane>
        <TabPane tab="Route Fees" key="4">
          <RouteFeesManager />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TransportPage;
