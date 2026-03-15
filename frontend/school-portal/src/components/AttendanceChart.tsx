import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Card, Typography } from 'antd';

const { Title } = Typography;

interface AttendanceData {
    class: string;
    present: number;
    absent: number;
}

interface AttendanceChartProps {
    data: AttendanceData[];
    title?: string;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data, title = 'Attendance by Class' }) => {
    return (
        <Card className="shadow-md rounded-lg border-none">
            <div className="flex justify-between items-center mb-6">
                <Title level={4} style={{ margin: 0 }}>{title}</Title>
            </div>
            <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                        barSize={20}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="class"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8c8c8c', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8c8c8c', fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="present" name="Present" stackId="a" fill="#52c41a" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="absent" name="Absent" stackId="a" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default AttendanceChart;
