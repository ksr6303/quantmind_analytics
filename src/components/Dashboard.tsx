import React, { useState, useEffect } from 'react';
import { Search, Loader2, Gauge, Info, TrendingUp, TrendingDown, Minus, DatabaseZap, Newspaper } from 'lucide-react';
import { AnalysisResult } from '../types';
import { analyzeStock, refetchFullHistory } from '../services/marketData';
import { evaluateStrategies, StrategySignal } from '../services/strategies';
import { calculateAggregateSentiment } from '../services/sentiment';
import { StockChart } from './Chart';
import { MetricCard } from './MetricCard';
import { RecommendationPanel } from './RecommendationPanel';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { getStocks } from '../constants/stocks';

interface Props {
  initialTicker?: string;
  market: 'IND' | 'US';
}

export const Dashboard: React.FC<Props> = ({ initialTicker, market }) => {
  const [ticker, setTicker] = useState(initialTicker || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [strategySignals, setStrategySignals] = useState<StrategySignal[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const currencyCode = market === 'IND' ? 'INR' : 'USD';

  useEffect(() => {
    if (initialTicker) {
      setTicker(initialTicker);
      performAnalysis(initialTicker);
    }
  }, [initialTicker, market]);

  const performAnalysis = async (symbol: string) => {
    setLoading(true);
    try {
      const result = await analyzeStock(symbol, market);
      setData(result);
      if (result && result.history) {
         setStrategySignals(evaluateStrategies(result.history));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFullRefresh = async () => {
    if (!ticker.trim()) return;
    if (!confirm(`Force re-download 10 years of data for ${ticker}?`)) return;
    
    setLoading(true);
    try {
      const result = await refetchFullHistory(ticker, market);
      setData(result);
      if (result && result.history) {
         setStrategySignals(evaluateStrategies(result.history));
      }
    } catch (err: any) {
      alert("Failed to refresh data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setShowSuggestions(false);
    performAnalysis(ticker);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-emerald-200';
    if (score >= 40) return 'text-yellow-200';
    if (score >= 20) return 'text-rose-200';
    return 'text-rose-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Strong Buy';
    if (score >= 60) return 'Buy';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Sell';
    return 'Strong Sell';
  };

  const get52WeekStats = (history: any[]) => {
    if (!history.length) return { high: 0, low: 0, avgVol: 0 };
    const yearSlice = history.slice(-252);
    let high = -Infinity;
    let low = Infinity;
    let volSum = 0;
    
    yearSlice.forEach(h => {
       if (h.high > high) high = h.high;
       else if (h.price > high) high = h.price;
       if (h.low < low) low = h.low;
       else if (h.price < low) low = h.price;
       volSum += h.volume;
    });
    return { high, low, avgVol: volSum / yearSlice.length };
  };

  const stats = data ? get52WeekStats(data.history) : null;

  const masterSignal = strategySignals.find(s => s.type === 'Master');
  const rsiSignal = strategySignals.find(s => s.name.includes('RSI'));
  const displayScore = masterSignal ? masterSignal.score : 50;
  const displayRSI = rsiSignal ? parseFloat(rsiSignal.value.toString()) : (data?.indicators.rsi || 50);
  
  // Calculate Sentiment Score
  const newsScore = data ? calculateAggregateSentiment(data.news) : 50;

  const suggestions = getStocks(market).filter(s => 
    s.symbol.includes(ticker.toUpperCase()) || 
    s.name.toLowerCase().includes(ticker.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Market Analysis ({market})</h1>
           <p className="text-slate-400 mt-1">Real-time AI quant strategies</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
            <input
              type="text"
              value={ticker}
              onChange={(e) => {
                 setTicker(e.target.value.toUpperCase());
                 setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={`Search ${market} Ticker`}
              className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
            <Search className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
            {loading && (
               <div className="absolute right-4 top-3.5">
                 <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
               </div>
            )}
            {showSuggestions && ticker.length > 0 && suggestions.length > 0 && (
               <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg mt-2 max-h-80 overflow-y-auto z-50 shadow-2xl ring-1 ring-slate-800">
                  {suggestions.map((s) => (
                     <button
                       key={s.symbol}
                       type="button"
                       onMouseDown={(e) => {
                          e.preventDefault();
                          setTicker(s.symbol);
                          setShowSuggestions(false);
                          performAnalysis(s.symbol);
                       }}
                       className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 flex justify-between items-center group/item transition-colors"
                     >
                       <div className="flex flex-col">
                          <span className="font-bold text-white group-hover/item:text-indigo-400 transition-colors">{s.symbol}</span>
                          <span className="text-xs text-slate-500">{s.name}</span>
                       </div>
                       <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded group-hover/item:bg-slate-700">{s.sector}</span>
                     </button>
                  ))}
               </div>
            )}
          </form>
          {data && (
             <button 
               onClick={handleFullRefresh} 
               className="p-3 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white text-slate-400 transition-colors"
               title="Force Refresh Full Data"
             >
               <DatabaseZap className="w-5 h-5" />
             </button>
          )}
        </div>
      </div>

      {data && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard 
              label="Current Price" 
              value={formatCurrency(data.stock.price, currencyCode)}
              subValue={`${data.stock.change > 0 ? '+' : ''}${data.stock.change.toFixed(2)} (${data.stock.changePercent.toFixed(2)}%)`}
              trend={data.stock.change >= 0 ? 'up' : 'down'}
            />
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group cursor-help">
               <p className="text-slate-400 text-sm font-medium mb-1">Technical Score</p>
               <div className="flex items-end gap-2">
                 <h3 className={cn("text-3xl font-bold", getScoreColor(displayScore))}>{displayScore.toFixed(0)}</h3>
                 <span className="text-slate-500 text-sm mb-1">/ 100</span>
               </div>
               <p className={cn("text-xs font-bold mt-1 uppercase tracking-wider", getScoreColor(displayScore))}>{getScoreLabel(displayScore)}</p>
               <Gauge className="absolute right-4 top-4 w-8 h-8 text-slate-800" />
            </div>
            
            {/* New Sentiment Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
               <p className="text-slate-400 text-sm font-medium mb-1">News Sentiment</p>
               <div className="flex items-end gap-2">
                 <h3 className={cn("text-3xl font-bold", getScoreColor(newsScore))}>{newsScore.toFixed(0)}</h3>
                 <span className="text-slate-500 text-sm mb-1">% Positive</span>
               </div>
               <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${getScoreColor(newsScore).split(' ')[0].replace('text', 'bg')}`} style={{ width: `${newsScore}%` }}></div>
               </div>
               <Newspaper className="absolute right-4 top-4 w-8 h-8 text-slate-800" />
            </div>

            <MetricCard 
              label="RSI (14)" 
              value={displayRSI.toFixed(1)}
              trend={displayRSI > 70 ? 'down' : displayRSI < 30 ? 'up' : 'neutral'}
            />
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
               <p className="text-slate-400 text-sm font-medium mb-1">Market Trend</p>
               <h3 className="text-2xl font-bold text-white mt-1">{data.indicators.trend}</h3>
               <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  {data.indicators.trend === 'Bullish' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : 
                   data.indicators.trend === 'Bearish' ? <TrendingDown className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3" />}
                  <span>Based on SMA & MACD</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <StockChart data={data.history} />
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                     <p className="text-xs text-slate-500 mb-1">52W High</p>
                     <p className="font-bold text-white">{formatCurrency(stats.high, currencyCode)}</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                     <p className="text-xs text-slate-500 mb-1">52W Low</p>
                     <p className="font-bold text-white">{formatCurrency(stats.low, currencyCode)}</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                     <p className="text-xs text-slate-500 mb-1">Avg Vol (1Y)</p>
                     <p className="font-bold text-white">{formatNumber(stats.avgVol)}</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                     <p className="text-xs text-slate-500 mb-1">Last Vol</p>
                     <p className="font-bold text-white">{formatNumber(data.stock.volume)}</p>
                  </div>
               </div>
               {data.indicators.pivots && (
                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 cursor-help">
                       <Info className="w-4 h-4 text-indigo-400" /> Key Levels (S&R)
                    </h3>
                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                       <div><p className="text-xs text-slate-500 mb-1">S2</p><p className="text-emerald-400 font-mono">{formatNumber(data.indicators.pivots.s2)}</p></div>
                       <div><p className="text-xs text-slate-500 mb-1">S1</p><p className="text-emerald-300 font-mono">{formatNumber(data.indicators.pivots.s1)}</p></div>
                       <div className="bg-indigo-500/10 rounded py-1"><p className="text-xs text-indigo-300 mb-1">Pivot</p><p className="text-indigo-100 font-mono font-bold">{formatNumber(data.indicators.pivots.p)}</p></div>
                       <div><p className="text-xs text-slate-500 mb-1">R1</p><p className="text-rose-300 font-mono">{formatNumber(data.indicators.pivots.r1)}</p></div>
                       <div><p className="text-xs text-slate-500 mb-1">R2</p><p className="text-rose-400 font-mono">{formatNumber(data.indicators.pivots.r2)}</p></div>
                    </div>
                 </div>
               )}
            </div>
            <div className="lg:col-span-1 space-y-6">
               <RecommendationPanel data={data.recommendation} signals={strategySignals} />
               <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Market News</h3>
                  <div className="space-y-4">
                     {data.news.map((n, i) => (
                       <div key={i} className="border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium text-slate-200 line-clamp-2">{n.title}</h4>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded ml-2 whitespace-nowrap", n.sentiment === 'Positive' ? "bg-emerald-500/10 text-emerald-400" : n.sentiment === 'Negative' ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400")}>{n.sentiment}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{n.source} • {n.published}</p>
                       </div>
                     ))}
                     {data.news.length === 0 && <p className="text-slate-500 text-sm">No recent news found.</p>}
                  </div>
               </div>
            </div>
          </div>
        </>
      )}
      {!data && !loading && (
        <div className="text-center py-20 text-slate-500">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
             <Search className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-medium text-white">Start Your Analysis</h3>
          <p className="mt-2">Enter a {market} ticker symbol above.</p>
        </div>
      )}
    </div>
  );
};
