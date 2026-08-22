'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  revenue: number
}

export function RevenueChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">No revenue data available</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 10,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickFormatter={(value) => `₹${value}`}
        />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
        />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#4f46e5" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorRevenue)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
