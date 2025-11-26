import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Percent } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: 'dollar' | 'percent' | 'chart';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subValue, trend, icon }) => {
  const getIcon = () => {
    switch (icon) {
      case 'dollar': return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'percent': return <Percent className="w-5 h-5 text-blue-400" />;
      default: return <DollarSign className="w-5 h-5 text-gray-400" />;
    }
  };

  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-gray-400';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg bg-slate-700/50`}>
          {getIcon()}
        </div>
      </div>
      {(subValue || trend) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={`flex items-center text-sm font-semibold ${trendColor}`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {subValue}
            </span>
          )}
          {!trend && subValue && (
             <span className="text-slate-500 text-sm">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
};
