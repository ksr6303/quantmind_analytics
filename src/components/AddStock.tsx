import React, { useState } from 'react';
import { PlusCircle, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchStockHistory } from '../services/yahoo';
import { saveStockData } from '../services/dataManager';
import { addUserStockToStorage, getStocks } from '../constants/stocks';

export const AddStock: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<'IND' | 'US'>('IND');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;
    setLoading(true);
    setStatus(null);

    // Normalize symbol
    let ticker = symbol.toUpperCase();
    if (market === 'IND' && !ticker.endsWith('.NS') && !ticker.endsWith('.BO')) {
       ticker += '.NS'; // Default to NSE
    }

    // Check if already present in universe
    const currentStocks = getStocks(market);
    const isPresent = currentStocks.some(s => s.symbol === ticker);

    if (isPresent) {
       setStatus({ type: 'error', msg: `The symbol ${ticker} is already added.` });
       setLoading(false);
       return;
    }

    try {
       // Validate by fetching data
       const history = await fetchStockHistory(ticker, { range: '1mo' });
       
       if (!history || history.length === 0) throw new Error("No data found");

       // Add to storage
       addUserStockToStorage({
          symbol: ticker,
          name: ticker, // We don't have name easily, use ticker
          sector: 'Custom',
          category: 'User',
          market
       });

       // Cache data
       await saveStockData(ticker, history);

       setStatus({ type: 'success', msg: `Success: Stock ${ticker} added to ${market} list.` });
       setSymbol('');
    } catch (e) {
       setStatus({ type: 'error', msg: `Failed to add ${ticker}: Invalid symbol or data unavailable.` });
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-slate-300 animate-in fade-in zoom-in duration-300">
       <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <PlusCircle className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Add Stock</h2>
                <p className="text-xs text-slate-500">Expand your tracking universe</p>
             </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-5">
             <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Select Market</label>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                   <button 
                     type="button" 
                     onClick={() => setMarket('IND')} 
                     className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${market === 'IND' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                   >
                     🇮🇳 India
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setMarket('US')} 
                     className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${market === 'US' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                   >
                     🇺🇸 USA
                   </button>
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">Ticker Symbol</label>
                <div className="relative group">
                   <input 
                     type="text" 
                     value={symbol}
                     onChange={e => setSymbol(e.target.value.toUpperCase())}
                     placeholder={market === 'IND' ? "e.g. TATAMOTORS" : "e.g. AAPL"}
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white font-mono placeholder:font-sans focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all group-hover:border-slate-600"
                   />
                   <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                   <AlertCircle className="w-3 h-3" />
                   {market === 'IND' ? 'Suffix .NS added automatically.' : 'Use standard exchange ticker.'}
                </p>
             </div>

             <button 
               type="submit" 
               disabled={loading || !symbol}
               className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
             >
               {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Validate & Add to Universe'}
             </button>
          </form>

          {status && (
             <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 border animate-in slide-in-from-bottom-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {status.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                <div>
                   <p className="text-sm font-bold">{status.type === 'success' ? 'Success' : 'Error'}</p>
                   <p className="text-xs opacity-90">{status.msg}</p>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};