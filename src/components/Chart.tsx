import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Bar, Legend, Label
} from 'recharts';
import { HistoricalPoint } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { calculateBollingerSeries } from '../services/indicators';
import { subMonths, subYears, isAfter } from 'date-fns';

interface ChartProps {
  data: HistoricalPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-sm z-50">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-white font-bold text-lg">
          {formatCurrency(payload[0].payload.price)}
        </p>
        <p className="text-xs text-slate-500">Vol: {formatNumber(payload[0].payload.volume)}</p>
        {payload.find((p:any) => p.dataKey === 'sma20') && (
            <p className="text-yellow-400 text-xs">SMA 20: {formatCurrency(payload.find((p:any) => p.dataKey === 'sma20').value)}</p>
        )}
        {payload.find((p:any) => p.dataKey === 'upper') && (
            <p className="text-emerald-400 text-xs">BB Upper: {formatCurrency(payload.find((p:any) => p.dataKey === 'upper').value)}</p>
        )}
        {payload.find((p:any) => p.dataKey === 'lower') && (
            <p className="text-emerald-400 text-xs">BB Lower: {formatCurrency(payload.find((p:any) => p.dataKey === 'lower').value)}</p>
        )}
      </div>
    );
  }
  return null;
};

const RANGES = [
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
  { label: 'All', value: 'all' },
];

export const StockChart: React.FC<ChartProps> = ({ data }) => {
  const [showBollinger, setShowBollinger] = useState(false);
  const [range, setRange] = useState('1y');

  const filteredData = useMemo(() => {
     if (range === 'all') return data;
     const now = new Date();
     let cutoff = now;
     if (range === '6m') cutoff = subMonths(now, 6);
     if (range === '1y') cutoff = subYears(now, 1);
     if (range === '2y') cutoff = subYears(now, 2);
     if (range === '5y') cutoff = subYears(now, 5);
     
     return data.filter(d => isAfter(new Date(d.date), cutoff));
  }, [data, range]);

  const chartData = useMemo(() => {
     const prices = filteredData.map(d => d.price);
     const bb = calculateBollingerSeries(prices, 20, 2);
     
     return filteredData.map((d, i) => ({
       ...d,
       upper: bb.upper[i],
       lower: bb.lower[i],
       middle: bb.middle[i]
     }));
  }, [filteredData]);

  return (
    <div className="h-[450px] w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 relative group flex flex-col">
      <div className="flex justify-between items-center mb-4">
         <div className="flex gap-2">
            {RANGES.map(r => (
               <button
                 key={r.value}
                 onClick={() => setRange(r.value)}
                 className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    range === r.value 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                 }`}
               >
                 {r.label}
               </button>
            ))}
         </div>
         <button 
           onClick={() => setShowBollinger(!showBollinger)}
           className={`text-xs px-2 py-1.5 rounded border transition-colors ${
              showBollinger ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
           }`}
         >
           BB
         </button>
      </div>

      <div className="flex-1 w-full min-h-0">
         <ResponsiveContainer width="100%" height="100%">
           <ComposedChart data={chartData}>
             <defs>
               <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                 <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
               </linearGradient>
             </defs>
             <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
             <XAxis 
               dataKey="date" 
               stroke="#64748b" 
               tickFormatter={(str) => {
                 const d = new Date(str);
                 return `${d.getMonth() + 1}/${d.getDate()}`;
               }}
               tick={{fontSize: 12}}
               minTickGap={30}
             />
             <YAxis 
               yAxisId="price"
               stroke="#64748b" 
               domain={['auto', 'auto']}
               tickFormatter={(val) => `₹${val}`}
               tick={{fontSize: 12}}
               width={60}
             >
                <Label value="Price (₹)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748b', fontSize: 10 }} />
             </YAxis>
             <YAxis 
               yAxisId="volume"
               orientation="right"
               stroke="#64748b"
               tickFormatter={(val) => formatNumber(val)}
               tick={{fontSize: 10}}
               width={40}
               opacity={0.3}
             >
                <Label value="Volume" angle={90} position="insideRight" style={{ textAnchor: 'middle', fill: '#64748b', fontSize: 10 }} />
             </YAxis>
             <Tooltip content={<CustomTooltip />} />
             <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}/>
             
             <Bar yAxisId="volume" dataKey="volume" name="Volume" fill="#334155" opacity={0.3} barSize={2} />
             
             <Area 
               yAxisId="price"
               type="monotone" 
               dataKey="price" 
               name="Close Price"
               stroke="#6366f1" 
               strokeWidth={2}
               fillOpacity={1} 
               fill="url(#colorPrice)" 
             />
             <Line 
               yAxisId="price"
               type="monotone" 
               dataKey="middle" 
               name="SMA 20"
               stroke="#facc15" 
               strokeWidth={1} 
               dot={false}
               activeDot={false}
             />
             
             {showBollinger && (
               <>
                 <Line yAxisId="price" type="monotone" dataKey="upper" name="BB Upper" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                 <Line yAxisId="price" type="monotone" dataKey="lower" name="BB Lower" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} />
               </>
             )}
           </ComposedChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
};