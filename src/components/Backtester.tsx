import React, { useState, useEffect, useMemo } from 'react';
import { Play, RotateCcw, Settings2, BarChart3, AlertCircle, GitCompare, List, Download } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Area, Line, Legend } from 'recharts';
import { formatCurrency, formatNumber } from '../lib/utils';
import { getAllStocksData } from '../services/dataManager';
import { getStocks } from '../constants/stocks';
import { HistoricalPoint } from '../types';
import { MODELS, simulateStrategy, StrategyResult } from '../services/backtestEngine';
import { downloadCSV } from '../lib/csvUtils';
import { getModelThreshold } from '../services/settingsManager';

interface BacktestResult {
  primary: StrategyResult;
  secondary?: StrategyResult;
}

interface Props {
  market: 'IND' | 'US';
}

export const Backtester: React.FC<Props> = ({ market }) => {
  // Strategy Inputs
  const [model1, setModel1] = useState('master');
  const [threshold1, setThreshold1] = useState(getModelThreshold('master'));
  
  const [compareMode, setCompareMode] = useState(false);
  const [model2, setModel2] = useState('rsi');
  const [threshold2, setThreshold2] = useState(getModelThreshold('rsi'));

  const [stopLoss, setStopLoss] = useState(5); 
  const [targetProfit, setTargetProfit] = useState(10); 
  const [maxTrades, setMaxTrades] = useState(5);
  const [initialCapital, setInitialCapital] = useState(100000);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState('');

  const currencyCode = market === 'IND' ? 'INR' : 'USD';

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, [market]);

  const handleModel1Change = (newModel: string) => {
      setModel1(newModel);
      setThreshold1(getModelThreshold(newModel));
  };

  const handleModel2Change = (newModel: string) => {
      setModel2(newModel);
      setThreshold2(getModelThreshold(newModel));
  };

  const runBacktest = async () => {
    setIsRunning(true);
    setResult(null);
    setError('');
    setProgress('Loading Data...');
    try {
      const allData = await getAllStocksData();
      if (allData.length === 0) throw new Error("No data found.");
      const universe = allData.map(d => {
         const history = d.history.filter((h: HistoricalPoint) => h.date >= startDate && h.date <= endDate);
         if (history.length < 50) return null;
         return { symbol: d.symbol, history, prices: history.map((h: HistoricalPoint) => h.price), highs: history.map((h: HistoricalPoint) => h.high || h.price), lows: history.map((h: HistoricalPoint) => h.low || h.price), volumes: history.map((h: HistoricalPoint) => h.volume || 0), modelScores: {} };
      }).filter(Boolean);
      if (universe.length === 0) throw new Error("No data in range.");
      const dates = Array.from(new Set(universe.flatMap((u:any) => u.history.map((h:any) => h.date)))).sort();
      const res1 = simulateStrategy(universe, dates, model1, threshold1, initialCapital, maxTrades, stopLoss, targetProfit);
      let res2;
      if (compareMode) res2 = simulateStrategy(universe, dates, model2, threshold2, initialCapital, maxTrades, stopLoss, targetProfit);
      setResult({ primary: res1, secondary: res2 });
    } catch (e: any) { setError(e.message); } finally { setIsRunning(false); setProgress(''); }
  };

  const chartData = useMemo(() => {
     if (!result) return [];
     return result.primary.equityCurve.map((p, i) => ({ date: p.date, primary: p.equity, secondary: result.secondary?.equityCurve[i]?.equity }));
  }, [result]);

  const handleExport = () => {
    if (!result) return;
    const trades = result.primary.trades.map(t => ({
       ...t,
       entryPrice: t.entryPrice.toFixed(2),
       exitPrice: t.exitPrice.toFixed(2),
       pnl: t.pnl.toFixed(2),
       pnlPercent: t.pnlPercent.toFixed(2) + '%'
    }));
    downloadCSV(trades, `backtest_trades_${model1}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-3xl font-bold text-white">Portfolio Backtester ({market})</h1></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
             <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-white"><Settings2 className="w-5 h-5 text-indigo-400" /><h3 className="font-semibold">Strategy Config</h3></div><button onClick={() => setCompareMode(!compareMode)} className={`text-xs px-2 py-1 rounded ${compareMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Compare</button></div>
             <div className="space-y-3 p-3 bg-indigo-900/10 rounded-lg"><p className="text-xs font-bold text-indigo-400 uppercase">Strategy A</p>
                <select value={model1} onChange={e => handleModel1Change(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-white text-xs">{MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                <input type="range" min="1" max="99" value={threshold1} onChange={e => setThreshold1(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" /><span className="text-xs text-white">Threshold: {threshold1}</span>
             </div>
             {compareMode && (<div className="space-y-3 p-3 bg-pink-900/10 rounded-lg"><p className="text-xs font-bold text-pink-400 uppercase">Strategy B</p>
                <select value={model2} onChange={e => handleModel2Change(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-white text-xs">{MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                <input type="range" min="1" max="99" value={threshold2} onChange={e => setThreshold2(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" /><span className="text-xs text-white">Threshold: {threshold2}</span>
             </div>)}
             <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div><label className="text-[10px] text-slate-500 uppercase font-bold">Max Trades</label><input type="number" value={maxTrades} onChange={e => setMaxTrades(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-white text-xs" /></div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold">Start Capital</label><input type="number" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-white text-xs" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-2 text-white text-xs" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-2 text-white text-xs" />
             </div>
             <button onClick={runBacktest} disabled={isRunning} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold">{isRunning ? 'Running...' : 'Run Simulation'}</button>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
           {result ? (
             <>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Return (A)</p><p className={`text-xl font-bold ${result.primary.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{result.primary.totalReturnPercent.toFixed(2)}%</p></div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Win Rate (A)</p><p className="text-xl font-bold text-white">{result.primary.winRate.toFixed(1)}%</p></div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Balance (A)</p><p className="text-xl font-bold text-white">{formatCurrency(result.primary.finalBalance, currencyCode)}</p></div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><p className="text-xs text-slate-500">Trades (A)</p><p className="text-xl font-bold text-white">{result.primary.trades.length}</p></div>
               </div>
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="date" stroke="#64748b" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', year:'2-digit'})} minTickGap={40} /><YAxis stroke="#64748b" tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} domain={['auto', 'auto']} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} formatter={(val: number) => formatCurrency(val, currencyCode)} /><Legend />
                      <Area type="monotone" dataKey="primary" name="Strategy A" stroke="#6366f1" fillOpacity={0.1} />
                      {result.secondary && <Line type="monotone" dataKey="secondary" name="Strategy B" stroke="#ec4899" dot={false} />}
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
               <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                     <h3 className="font-semibold text-white flex items-center gap-2"><List className="w-4 h-4"/> Trade Log (Strategy A)</h3>
                     <button onClick={handleExport} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Export CSV"><Download className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-slate-950 text-slate-500 sticky top-0 z-10">
                         <tr>
                           <th className="px-4 py-3">Symbol</th>
                           <th className="px-4 py-3">Entry</th>
                           <th className="px-4 py-3">Exit</th>
                           <th className="px-4 py-3 text-right">Result</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800">
                          {result.primary.trades.slice(0, 50).map((trade, i) => (
                             <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-2 font-bold text-white">{trade.symbol}</td>
                                <td className="px-4 py-2 text-slate-400">
                                   <div className="flex flex-col">
                                      <span>{trade.entryDate}</span>
                                      <span className="text-[10px]">@{formatCurrency(trade.entryPrice, currencyCode)}</span>
                                   </div>
                                </td>
                                <td className="px-4 py-2 text-slate-400">
                                   {trade.exitDate ? (
                                      <div className="flex flex-col">
                                         <span>{trade.exitDate}</span>
                                         <span className="text-[10px]">@{formatCurrency(trade.exitPrice, currencyCode)}</span>
                                      </div>
                                   ) : <span className="text-indigo-400 font-bold text-xs">OPEN</span>}
                                </td>
                                <td className="px-4 py-2 text-right">
                                   {trade.exitDate ? (
                                      <span className={trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                         {trade.pnlPercent.toFixed(2)}%
                                      </span>
                                   ) : '-'}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                     </table>
                  </div>
               </div>
             </>
           ) : (<div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800 p-12 min-h-[400px]"><BarChart3 className="w-16 h-16 opacity-20 mb-4" /><h3 className="text-xl font-medium text-slate-400">Backtesting Engine</h3></div>)}
        </div>
      </div>
    </div>
  );
};