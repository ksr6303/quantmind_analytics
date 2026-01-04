import React, { useState, useEffect, useRef } from 'react';
import { Filter, ArrowUpRight, ArrowDownRight, Search, TrendingUp, RefreshCw, Loader2, Gauge, ArrowUp, ArrowDown, ExternalLink, Download, CheckSquare, Square, DatabaseZap, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { getAllStocksData, forceReloadStocks } from '../services/dataManager';
import { getStocks } from '../constants/stocks';
import { analyzeTechnicalData } from '../services/indicators';
import { evaluateStrategies } from '../services/strategies';
import { downloadCSV } from '../lib/csvUtils';

interface ScannedStock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  score: number;
  trend: string;
  recommendation: string;
}

type SortKey = keyof ScannedStock;

interface Props {
  onNavigate: (ticker: string) => void;
  market: 'IND' | 'US';
}

export const StockScanner: React.FC<Props> = ({ onNavigate, market }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStrategy, setSelectedStrategy] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stocks, setStocks] = useState<ScannedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });
  
  // Selection State
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  
  // Reload State
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const currencyCode = market === 'IND' ? 'INR' : 'USD';

  useEffect(() => {
    loadData();
    setSelectedStocks(new Set()); // Reset selection on market change
  }, [market]);

  const loadData = async () => {
    setLoading(true);
    try {
      const storedData = await getAllStocksData();
      const universe = getStocks(market);
      const scanned: ScannedStock[] = [];

      for (const meta of universe) {
        const data = storedData.find(d => d.symbol === meta.symbol);
        if (data && data.history && data.history.length > 50) {
           const history = data.history;
           const latest = history[history.length - 1];
           const prev = history[history.length - 2] || latest;
           const strategies = evaluateStrategies(history);
           const avgScore = strategies.reduce((acc, s) => acc + s.score, 0) / strategies.length;
           const tech = analyzeTechnicalData(history); 

           scanned.push({
             symbol: meta.symbol,
             name: meta.name,
             sector: meta.sector,
             price: latest.price,
             change: latest.price - prev.price,
             changePercent: ((latest.price - prev.price) / prev.price) * 100,
             volume: latest.volume,
             score: avgScore,
             trend: tech.trend,
             recommendation: avgScore >= 60 ? 'BUY' : avgScore <= 40 ? 'SELL' : 'HOLD'
           });
        }
      }
      setStocks(scanned);
    } catch (e) {
      console.error("Scanner load failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleForceReload = async (fullReload: boolean) => {
      if (selectedStocks.size === 0) return;
      if (isReloading) return;

      if (fullReload) {
          if (!confirm(`WARNING: You are about to completely overwrite data for ${selectedStocks.size} stocks. This will fetch full 10y history from Yahoo Finance. Continue?`)) {
              return;
          }
      }

      setIsReloading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
          const symbols = Array.from(selectedStocks);
          await forceReloadStocks(symbols, fullReload, (curr, total, sym, status) => {
              setReloadStatus(`[${curr}/${total}] ${sym}: ${status}`);
          }, controller.signal);
          
          setReloadStatus('Reload Complete. Refreshing table...');
          setTimeout(() => {
              setReloadStatus('');
              loadData(); // Refresh UI
              setSelectedStocks(new Set());
          }, 1500);

      } catch (e: any) {
          setReloadStatus('Reload Failed');
      } finally {
          setIsReloading(false);
          abortControllerRef.current = null;
      }
  };

  const handleStopReload = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setReloadStatus('Stopping...');
      }
  };

  const toggleSelectAll = () => {
      if (selectedStocks.size === filteredStocks.length) {
          setSelectedStocks(new Set());
      } else {
          setSelectedStocks(new Set(filteredStocks.map(s => s.symbol)));
      }
  };

  const toggleSelect = (symbol: string) => {
      const newSet = new Set(selectedStocks);
      if (newSet.has(symbol)) newSet.delete(symbol);
      else newSet.add(symbol);
      setSelectedStocks(newSet);
  };

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = (stock.symbol.includes(searchTerm.toUpperCase()) || stock.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSector = selectedSector === 'All' || stock.sector === selectedSector;
    const matchesPrice = (!minPrice || stock.price >= parseFloat(minPrice)) && (!maxPrice || stock.price <= parseFloat(maxPrice));
    let matchesStrategy = true;
    if (selectedStrategy === 'Strong_Buy') matchesStrategy = stock.score >= 80;
    if (selectedStrategy === 'Buy') matchesStrategy = stock.score >= 60;
    if (selectedStrategy === 'Sell') matchesStrategy = stock.score <= 40;
    if (selectedStrategy === 'Strong_Sell') matchesStrategy = stock.score <= 20;
    return matchesSearch && matchesSector && matchesPrice && matchesStrategy;
  });

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const { key, direction } = sortConfig;
    const valA = a[key]; const valB = b[key];
    if (typeof valA === 'string' && typeof valB === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExport = () => {
    downloadCSV(sortedStocks, `stock_scanner_${market}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const sectors = ['All', ...Array.from(new Set(getStocks(market).map(s => s.sector)))];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-emerald-300';
    if (score <= 20) return 'text-rose-500';
    if (score <= 40) return 'text-rose-400';
    return 'text-yellow-400';
  };

  const renderSortIcon = (key: SortKey) => {
     if (sortConfig.key !== key) return <div className="w-3 h-3 opacity-0 group-hover:opacity-30"><ArrowUp className="w-3 h-3" /></div>;
     return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Stock Scanner ({market})</h1>
          {!loading && stocks.length > 0 && (
            <span className="text-sm bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 font-medium">
              {stocks.length} Assets
            </span>
          )}
        </div>
        <div className="flex gap-2">
           <button onClick={handleExport} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white" title="Export CSV">
              <Download className="w-5 h-5" />
           </button>
           <button onClick={loadData} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white" title="Refresh">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>
      
      {/* Force Reload Controls */}
      {selectedStocks.size > 0 && (
          <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
             <div className="flex items-center gap-3">
                 <div className="bg-indigo-500 rounded flex items-center justify-center w-6 h-6 text-white text-xs font-bold">{selectedStocks.size}</div>
                 <span className="text-indigo-200 text-sm font-medium">stocks selected</span>
             </div>
             <div className="flex items-center gap-3">
                 {isReloading ? (
                     <div className="flex items-center gap-3">
                         <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                         <span className="text-sm text-indigo-300 font-mono">{reloadStatus}</span>
                         <button onClick={handleStopReload} className="px-3 py-1.5 bg-rose-500/20 text-rose-300 text-xs font-bold rounded hover:bg-rose-500/40">STOP</button>
                     </div>
                 ) : (
                     <>
                        <button onClick={() => handleForceReload(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">
                            <RefreshCw className="w-3 h-3" /> Force Sync
                        </button>
                        <button onClick={() => handleForceReload(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-rose-900/20">
                            <DatabaseZap className="w-3 h-3" /> Full Overwrite
                        </button>
                     </>
                 )}
             </div>
          </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none" /></div>
          <div><select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none">{sectors.map(s => <option key={s} value={s}>{s} Sector</option>)}</select></div>
          <div><select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none"><option value="All">All Scores</option><option value="Strong_Buy">Strong Buy (80+)</option><option value="Buy">Buy (60+)</option><option value="Sell">Sell (&lt;40)</option><option value="Strong_Sell">Strong Sell (&lt;20)</option></select></div>
          <div className="flex gap-2"><input type="number" placeholder="Min Price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none" /><input type="number" placeholder="Max Price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none" /></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-950/50 text-slate-400 text-sm border-b border-slate-800">
        <th className="px-6 py-4 w-10 text-center">
            <button onClick={toggleSelectAll} className="text-slate-500 hover:text-white">
                {selectedStocks.size > 0 && selectedStocks.size === filteredStocks.length ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
            </button>
        </th>
        <th onClick={() => handleSort('symbol')} className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-800/50 transition-colors group"><div className="flex items-center gap-1">Symbol {renderSortIcon('symbol')}</div></th>
        <th onClick={() => handleSort('sector')} className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-800/50 transition-colors group"><div className="flex items-center gap-1">Sector {renderSortIcon('sector')}</div></th>
        <th onClick={() => handleSort('price')} className="px-6 py-4 font-medium text-right cursor-pointer hover:bg-slate-800/50 transition-colors group"><div className="flex items-center justify-end gap-1">Price {renderSortIcon('price')}</div></th>
        <th onClick={() => handleSort('changePercent')} className="px-6 py-4 font-medium text-right cursor-pointer hover:bg-slate-800/50 transition-colors group"><div className="flex items-center justify-end gap-1">Change {renderSortIcon('changePercent')}</div></th>
        <th onClick={() => handleSort('score')} className="px-6 py-4 font-medium text-center cursor-pointer hover:bg-slate-800/50 transition-colors group"><div className="flex items-center justify-center gap-1">Score {renderSortIcon('score')}</div></th>
        <th onClick={() => handleSort('trend')} className="px-6 py-4 font-medium text-center cursor-pointer hover:bg-slate-800/50 transition-colors group"><div className="flex items-center justify-center gap-1">Trend {renderSortIcon('trend')}</div></th>
        <th className="px-6 py-4 font-medium text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-800">
        {loading ? (<tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" /><span className="text-slate-500">Calculating Scores...</span></td></tr>) : sortedStocks.length > 0 ? (
          sortedStocks.map((stock) => (<tr key={stock.symbol} className={`hover:bg-slate-800/50 transition-colors group ${selectedStocks.has(stock.symbol) ? 'bg-indigo-900/10' : ''}`}>
          <td className="px-6 py-4 text-center">
             <button onClick={() => toggleSelect(stock.symbol)} className="text-slate-500 hover:text-white">
                {selectedStocks.has(stock.symbol) ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
             </button>
          </td>
          <td className="px-6 py-4"><div className="flex flex-col"><span className="font-bold text-white">{stock.symbol}</span><span className="text-xs text-slate-500">{stock.name}</span></div></td><td className="px-6 py-4"><span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs">{stock.sector}</span></td><td className="px-6 py-4 text-right text-white font-mono">{formatCurrency(stock.price, currencyCode)}</td><td className="px-6 py-4 text-right"><div className={`flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{stock.changePercent.toFixed(2)}%</div></td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1"><Gauge className="w-4 h-4 text-slate-600" /><span className={`font-mono font-bold ${getScoreColor(stock.score)}`}>{stock.score.toFixed(0)}</span></div></td><td className="px-6 py-4 text-center"><span className={`text-xs px-2 py-1 rounded ${stock.trend === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{stock.trend}</span></td><td className="px-6 py-4 text-center"><button onClick={() => onNavigate(stock.symbol)} className="text-indigo-400 hover:text-white hover:bg-indigo-600 p-2 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto">Analyze <ExternalLink className="w-3 h-3" /></button></td></tr>))
        ) : (<tr><td colSpan={8} className="p-12 text-center text-slate-500">No data available.</td></tr>)}
      </tbody></table></div></div>
    </div>
  );
};
