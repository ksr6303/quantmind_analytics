import React from 'react';
import { cn } from '../lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, value, subValue, trend, icon: Icon, className 
}) => {
  return (
    <div className={cn("bg-slate-900/50 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors", className)}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
      {subValue && (
        <p className={cn("text-xs mt-1 font-medium", 
          trend === 'up' ? 'text-emerald-400' : 
          trend === 'down' ? 'text-rose-400' : 'text-slate-500'
        )}>
          {subValue}
        </p>
      )}
    </div>
  );
};
