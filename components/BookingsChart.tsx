'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  name: string
  bookings: number
}

export function BookingsChart({ data, color = "#10b981" }: { data: DataPoint[], color?: string }) {
  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">No booking data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 10,
          right: 10,
          left: 0,
          bottom: 0,
        }}
        barSize={32}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          dy={10}
        />
        <YAxis 
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <Tooltip 
          cursor={{ fill: '#f9fafb' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Bar dataKey="bookings" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
