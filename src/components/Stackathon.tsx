import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Trophy, SlidersHorizontal, Loader2, Download, BarChart3, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Area, Line, Legend, Bar } from 'recharts';
import { simulateStrategy, MODELS, StrategyResult } from '../services/backtestEngine';
import { getAllStocksData } from '../services/dataManager';
import { getStocks } from '../constants/stocks';
import { HistoricalPoint } from '../types';
import { formatCurrency } from '../lib/utils';
import { downloadCSV } from '../lib/csvUtils';
import { getModelThreshold } from '../services/settingsManager';

interface StackathonResult {
  modelId: string;
  modelName: string;
  usedThreshold: number;
  result: StrategyResult;
}

interface SingleModelPoint {
  threshold: number;
  profit: number;
  winRate: number;
  trades: number;
}

interface Props {
  market: 'IND' | 'US';
}

export const Stackathon: React.FC<Props> = ({ market }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stopLoss, setStopLoss] = useState(5);
  const [targetProfit, setTargetProfit] = useState(10);
  const [maxTrades, setMaxTrades] = useState(5);
  const [initialCapital, setInitialCapital] = useState(100000);
  
  const [optimizeThresholds, setOptimizeThresholds] = useState(false);
  
  // Single Model Mode State
  const [runSingleModel, setRunSingleModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState('master');
  const [singleModelResults, setSingleModelResults] = useState<SingleModelPoint[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<StackathonResult[]>([]);
  const [error, setError] = useState('');

  const currencyCode = market === 'IND' ? 'INR' : 'USD';

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, [market]);

  const runStackathon = async () => {
    setIsRunning(true);
    setResults([]);
    setSingleModelResults([]);
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
      if (universe.length === 0) throw new Error("No data.");
      const dates = Array.from(new Set(universe.flatMap((u:any) => u.history.map((h:any) => h.date)))).sort();
      
      if (runSingleModel) {
          const points: SingleModelPoint[] = [];
          for (let t = 1; t < 100; t++) {
              if (t % 5 === 0) setProgress(`Simulating Threshold ${t}...`); // Update UI every 5 steps to avoid flicker
              const res = simulateStrategy(universe, dates, selectedModel, t, initialCapital, maxTrades, stopLoss, targetProfit);
              points.push({
                  threshold: t,
                  profit: res.totalReturnPercent,
                  winRate: res.winRate,
                  trades: res.trades.length
              });
          }
          setSingleModelResults(points);
      } else {
          const leaderboard: StackathonResult[] = [];
          for (let i = 0; i < MODELS.length; i++) {
             const model = MODELS[i];
             const defaultThresh = getModelThreshold(model.id); // Load User Setting
             if (optimizeThresholds) {
                let bestRes: StrategyResult | null = null;
                let bestThresh = defaultThresh;
                let maxReturn = -Infinity;
                for (let t = 10; t <= 90; t += 5) {
                   setProgress(`Optimizing ${model.name} (${t})...`);
                   const simResult = simulateStrategy(universe, dates, model.id, t, initialCapital, maxTrades, stopLoss, targetProfit);
                   if (simResult.totalReturnPercent > maxReturn) { maxReturn = simResult.totalReturnPercent; bestRes = simResult; bestThresh = t; }
                }
                if (bestRes) leaderboard.push({ modelId: model.id, modelName: model.name, usedThreshold: bestThresh, result: bestRes });
             } else {
                setProgress(`Simulating ${model.name}...`);
                const simResult = simulateStrategy(universe, dates, model.id, defaultThresh, initialCapital, maxTrades, stopLoss, targetProfit);
                leaderboard.push({ modelId: model.id, modelName: model.name, usedThreshold: defaultThresh, result: simResult });
             }
          }
          leaderboard.sort((a, b) => b.result.totalReturnPercent - a.result.totalReturnPercent);
          setResults(leaderboard);
      }
    } catch (e: any) { setError(e.message); } finally { setIsRunning(false); setProgress(''); }
  };

  const handleExport = (item: StackathonResult) => {
    const trades = item.result.trades.map(t => ({
       ...t,
       entryPrice: t.entryPrice.toFixed(2),
       exitPrice: t.exitPrice.toFixed(2),
       pnl: t.pnl.toFixed(2),
       pnlPercent: t.pnlPercent.toFixed(2) + '%'
    }));
    downloadCSV(trades, `stackathon_${item.modelId}_${item.usedThreshold}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getOptimalStats = () => {
      if (singleModelResults.length === 0) return null;
      const sortedByProfit = [...singleModelResults].sort((a,b) => b.profit - a.profit);
      const best = sortedByProfit[0];
      const worst = sortedByProfit[sortedByProfit.length - 1];
      return { best, worst };
  };

  const optimalStats = getOptimalStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-3xl font-bold text-white">Stackathon ({market})</h1></div></div>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="text-[10px] text-slate-500 font-bold uppercase">Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div>
            <div><label className="text-[10px] text-slate-500 font-bold uppercase">End</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div>
            <div><label className="text-[10px] text-slate-500 font-bold uppercase">SL (%)</label><input type="number" value={stopLoss} onChange={e => setStopLoss(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div>
            <div><label className="text-[10px] text-slate-500 font-bold uppercase">Target (%)</label><input type="number" value={targetProfit} onChange={e => setTargetProfit(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div>
         </div>
         
         <div className="flex gap-3">
             <button onClick={() => { setRunSingleModel(false); setOptimizeThresholds(!optimizeThresholds); }} className={`flex-1 px-3 py-2 rounded text-xs font-bold transition-all border ${!runSingleModel && optimizeThresholds ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                 {optimizeThresholds && !runSingleModel ? 'Auto-Optimize Enabled' : 'Enable Auto-Optimize'}
             </button>
             <button onClick={() => { setRunSingleModel(!runSingleModel); setOptimizeThresholds(false); }} className={`flex-1 px-3 py-2 rounded text-xs font-bold transition-all border ${runSingleModel ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                 {runSingleModel ? 'Deep Dive Mode (Single Model)' : 'Enable Deep Dive Mode'}
             </button>
         </div>

         {runSingleModel && (
             <div className="p-3 bg-indigo-900/10 rounded-lg border border-indigo-500/20">
                 <label className="text-[10px] text-indigo-400 font-bold uppercase mb-1 block">Select Model to Analyze</label>
                 <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm">
                     {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
             </div>
         )}

         <button onClick={runStackathon} disabled={isRunning} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold">{isRunning ? `Running ${progress}` : 'Start Simulation'}</button>
      </div>

      {runSingleModel && optimalStats && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-emerald-500/50 transition-colors">
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><Trophy className="w-3 h-3 text-emerald-500" /> Optimal Threshold</p>
                          <h3 className="text-3xl font-bold text-white">{optimalStats.best.threshold}</h3>
                          <p className="text-xs text-slate-400 mt-1">Score &gt; {optimalStats.best.threshold}</p>
                      </div>
                      <div className="text-right">
                          <p className={`text-xl font-bold ${optimalStats.best.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{optimalStats.best.profit.toFixed(2)}%</p>
                          <p className="text-xs text-slate-500">Net Profit</p>
                      </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-rose-500/50 transition-colors">
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-rose-500" /> Worst Threshold</p>
                          <h3 className="text-3xl font-bold text-white">{optimalStats.worst.threshold}</h3>
                          <p className="text-xs text-slate-400 mt-1">Score &gt; {optimalStats.worst.threshold}</p>
                      </div>
                      <div className="text-right">
                          <p className={`text-xl font-bold ${optimalStats.worst.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{optimalStats.worst.profit.toFixed(2)}%</p>
                          <p className="text-xs text-slate-500">Net Profit</p>
                      </div>
                  </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-[400px]">
                  <h3 className="text-sm font-bold text-white mb-4">Profit & Win Rate by Threshold</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={singleModelResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="threshold" stroke="#64748b" label={{ value: 'Threshold', position: 'insideBottom', offset: -5 }} />
                      <YAxis yAxisId="left" stroke="#64748b" tickFormatter={(val) => `${val}%`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickFormatter={(val) => `${val}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="trades" name="Trades" fill="#334155" opacity={0.3} barSize={4} />
                      <Area type="monotone" yAxisId="left" dataKey="profit" name="Profit %" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                      <Line type="monotone" yAxisId="right" dataKey="winRate" name="Win Rate %" stroke="#10b981" dot={false} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {!runSingleModel && results.length > 0 && (<div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800"><th className="px-6 py-4 font-bold">Rank</th><th className="px-6 py-4 font-bold">Model</th><th className="px-6 py-4 font-bold text-center">Thresh</th><th className="px-6 py-4 font-bold text-right">Return</th><th className="px-6 py-4 font-bold text-right">Balance</th>                        <th className="px-6 py-4 font-bold text-right">Win Rate</th>
                        <th className="px-6 py-4 font-bold text-right">Trades</th>
                        <th className="px-6 py-4 font-bold text-center">Export</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                     {results.map((r, i) => (
                        <tr key={r.modelId} className={`hover:bg-slate-800/50 transition-colors ${i === 0 ? 'bg-indigo-900/10' : ''}`}>
                           <td className="px-6 py-4 font-bold">{i + 1}</td>
                           <td className="px-6 py-4 font-bold text-white">{r.modelName}</td>
                           <td className="px-6 py-4 text-center text-slate-400">{r.usedThreshold}</td>
                           <td className="px-6 py-4 text-right"><span className={`font-bold ${r.result.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{r.result.totalReturnPercent.toFixed(2)}%</span></td>
                           <td className="px-6 py-4 text-right text-slate-300 font-mono">{formatCurrency(r.result.finalBalance, currencyCode)}</td>
                           <td className="px-6 py-4 text-right text-slate-300">{r.result.winRate.toFixed(1)}%</td>
                           <td className="px-6 py-4 text-right text-slate-300">{r.result.trades.length}</td>
                           <td className="px-6 py-4 text-center"><button onClick={() => handleExport(r)} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button></td>
                        </tr>
                     ))}</tbody></table></div></div>)}
    </div>
  );
};
