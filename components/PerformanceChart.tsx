import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HistoryDataPoint } from '../types';

interface PerformanceChartProps {
  data: HistoryDataPoint[];
}

type TimeRange = '1M' | '1Y' | 'ALL';

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const [range, setRange] = useState<TimeRange>('1Y');

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        return data;
    }

    return data.filter(d => new Date(d.date) >= startDate);
  }, [data, range]);

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
        <p>Not enough data to generate performance chart.</p>
      </div>
    );
  }

  const latestReturn = filteredData.length > 0 ? filteredData[filteredData.length - 1].returnRate : 0;
  const isPositive = latestReturn >= 0;
  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const fillColor = isPositive ? 'url(#colorUp)' : 'url(#colorDown)';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Yield Curve</h3>
          <p className="text-xs text-slate-400">Time-weighted performance visualization</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-lg">
          {(['1M', '1Y', 'ALL'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                range === r 
                  ? 'bg-slate-700 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              minTickGap={30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              tickFormatter={(val) => `${val.toFixed(1)}%`}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return Rate']}
              labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Area 
              type="monotone" 
              dataKey="returnRate" 
              stroke={strokeColor} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={fillColor} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
