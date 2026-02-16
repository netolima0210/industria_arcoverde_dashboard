
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ConversationsChartProps {
    data: { hour: string; count: number }[];
}

export function ConversationsChart({ data }: ConversationsChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis
                    dataKey="hour"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#80868b', fontSize: 12 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#80868b', fontSize: 12 }}
                />
                <Tooltip
                    cursor={{ fill: '#e8f0fe' }}
                    contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 1px 3px 0 rgb(60 64 67 / 0.3), 0 4px 8px 3px rgb(60 64 67 / 0.15)',
                        padding: '8px 16px',
                    }}
                />
                <Bar
                    dataKey="count"
                    fill="#1a73e8"
                    radius={[6, 6, 0, 0]}
                    barSize={36}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
