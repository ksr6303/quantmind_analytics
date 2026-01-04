import React from 'react';
import { StrategySignal } from '../services/strategies';

interface Props {
  data: any; 
  signals?: StrategySignal[]; 
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500 text-emerald-400';
  if (score >= 60) return 'bg-emerald-600/80 text-emerald-300';
  if (score <= 20) return 'bg-rose-500 text-rose-400';
  if (score <= 40) return 'bg-rose-600/80 text-rose-300';
  return 'bg-yellow-500 text-yellow-400';
};

const getScoreBarColor = (score: number) => {
  if (score >= 60) return 'bg-emerald-500';
  if (score <= 40) return 'bg-rose-500';
  return 'bg-yellow-500';
};

export const RecommendationPanel: React.FC<Props> = ({ signals }) => {
  if (!signals || signals.length === 0) {
     return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
           No strategy data available.
        </div>
     );
  }

  // Find the Master Score
  const masterSignal = signals.find(s => s.type === 'Master');
  
  // Calculate average score from component models (excluding Master to avoid double counting)
  const componentSignals = signals.filter(s => s.type !== 'Master');
  const avgComponentScore = componentSignals.reduce((acc, s) => acc + s.score, 0) / componentSignals.length;

  // Use Master score for headline if available, else average
  const headlineScore = masterSignal ? masterSignal.score : avgComponentScore;

  const buyCount = componentSignals.filter(s => s.signal.includes('BUY')).length;
  const sellCount = componentSignals.filter(s => s.signal.includes('SELL')).length;
  
  let overallLabel = 'NEUTRAL';
  if (headlineScore >= 60) overallLabel = 'BUY';
  if (headlineScore >= 80) overallLabel = 'STRONG BUY';
  if (headlineScore <= 40) overallLabel = 'SELL';
  if (headlineScore <= 20) overallLabel = 'STRONG SELL';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50">
         <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white">Strategy Consensus</h3>
            <span className={`text-sm font-bold px-2 py-0.5 rounded ${getScoreColor(headlineScore).split(' ')[1]} bg-opacity-10`}>
               {overallLabel} ({buyCount}B / {sellCount}S)
            </span>
         </div>
         {/* Master Score Bar */}
         <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-full relative group cursor-help" title={`Aggregated Score: ${headlineScore.toFixed(0)}/100`}>
            <div 
               className={`h-full transition-all duration-500 ${getScoreBarColor(headlineScore)}`} 
               style={{ width: `${headlineScore}%` }}
            />
         </div>
         <p className="text-[10px] text-slate-500 mt-1 text-right">Avg Score: {headlineScore.toFixed(0)}/100</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
         {/* Render Technical Score explicitly at the top if it exists in list (it should be) */}
         {masterSignal && (
            <div className="group border-b border-slate-800 pb-3">
               <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-white font-bold">{masterSignal.name}</span>
                  <span className={`text-xs font-bold ${getScoreColor(masterSignal.score).split(' ')[1]}`}>
                     {masterSignal.score.toFixed(0)}
                  </span>
               </div>
               <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                     className={`h-full absolute left-0 top-0 transition-all duration-500 ${getScoreBarColor(masterSignal.score)}`} 
                     style={{ width: `${masterSignal.score}%` }}
                  />
               </div>
               <p className="text-[10px] text-slate-400 mt-1">{masterSignal.description}</p>
            </div>
         )}

         {componentSignals.map((s, i) => (
            <div key={i} className="group">
               <div className="flex justify-between items-end mb-1">
                  <span className="text-xs text-slate-300 font-medium">{s.name}</span>
                  <span className={`text-xs font-bold ${getScoreColor(s.score).split(' ')[1]}`}>
                     {s.score.toFixed(0)}
                  </span>
               </div>
               
               <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                     className={`h-full absolute left-0 top-0 transition-all duration-500 ${getScoreBarColor(s.score)}`} 
                     style={{ width: `${s.score}%` }}
                  />
               </div>
               <p className="text-[10px] text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.signal} • {s.value}
               </p>
            </div>
         ))}
      </div>
    </div>
  );
};
