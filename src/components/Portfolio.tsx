import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart, Wallet } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  avgCost: number;
}

interface PortfolioMetric {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export const Portfolio: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({ symbol: '', quantity: '', avgCost: '' });
  
  // Mock current prices mapping (Symbol -> Price)
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('quantmind_portfolio');
    if (saved) {
      setPositions(JSON.parse(saved));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('quantmind_portfolio', JSON.stringify(positions));
  }, [positions]);

  // Simulate live price updates
  useEffect(() => {
    const updatePrices = () => {
      const prices: Record<string, number> = {};
      positions.forEach(p => {
        // Mock price: +/- 10% of avg cost to show some P/L variation
        // Use a consistent seed based on symbol char code sum so it doesn't jump wildly on every render
        // But for "Live" feel, let's just randomize slightly around a base "Market Price"
        
        // If we already have a price, wiggle it slightly. If not, generate one.
        const basePrice = currentPrices[p.symbol] || p.avgCost * (1 + (Math.random() * 0.2 - 0.05)); // Bias slightly up
        prices[p.symbol] = basePrice * (1 + (Math.random() * 0.02 - 0.01));
      });
      setCurrentPrices(prices);
    };

    updatePrices();
    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, [positions.length]); // Re-run when positions change to ensure new ones get prices

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition.symbol || !newPosition.quantity || !newPosition.avgCost) return;

    const position: Position = {
      id: Date.now().toString(),
      symbol: newPosition.symbol.toUpperCase(),
      quantity: Number(newPosition.quantity),
      avgCost: Number(newPosition.avgCost)
    };

    setPositions([...positions, position]);
    setNewPosition({ symbol: '', quantity: '', avgCost: '' });
    setIsAddModalOpen(false);
  };

  const removePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  // Calculate Metrics
  const metrics = positions.reduce((acc, p) => {
    const currentPrice = currentPrices[p.symbol] || p.avgCost;
    const marketValue = currentPrice * p.quantity;
    const costBasis = p.avgCost * p.quantity;
    
    acc.totalValue += marketValue;
    acc.totalCost += costBasis;
    return acc;
  }, { totalValue: 0, totalCost: 0, totalReturn: 0, totalReturnPercent: 0, dayChange: 0, dayChangePercent: 0 });

  metrics.totalReturn = metrics.totalValue - metrics.totalCost;
  metrics.totalReturnPercent = metrics.totalCost > 0 ? (metrics.totalReturn / metrics.totalCost) * 100 : 0;
  // Mock Day Change (just 1.2% of total value for demo)
  metrics.dayChange = metrics.totalValue * 0.012; 
  metrics.dayChangePercent = 1.2;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio</h1>
          <p className="text-slate-400 mt-1">Track your holdings and performance</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="w-24 h-24 text-indigo-500" />
           </div>
           <p className="text-slate-400 text-sm font-medium">Total Balance</p>
           <h3 className="text-3xl font-bold text-white mt-1">{formatCurrency(metrics.totalValue)}</h3>
           <div className="flex items-center gap-2 mt-2 text-emerald-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+{formatCurrency(metrics.dayChange)} ({metrics.dayChangePercent.toFixed(2)}%)</span>
              <span className="text-slate-500 ml-1">Today</span>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-24 h-24 text-emerald-500" />
           </div>
           <p className="text-slate-400 text-sm font-medium">Total Profit/Loss</p>
           <h3 className={`text-3xl font-bold mt-1 ${metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             {metrics.totalReturn >= 0 ? '+' : ''}{formatCurrency(metrics.totalReturn)}
           </h3>
           <div className={`flex items-center gap-2 mt-2 text-sm ${metrics.totalReturn >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
              <span>{metrics.totalReturnPercent.toFixed(2)}% All Time</span>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <PieChart className="w-24 h-24 text-purple-500" />
           </div>
           <p className="text-slate-400 text-sm font-medium">Holdings</p>
           <h3 className="text-3xl font-bold text-white mt-1">{positions.length}</h3>
           <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm">
              <span>Active Positions</span>
           </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
           <h3 className="font-bold text-white">Your Assets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-sm border-b border-slate-800">
                <th className="px-6 py-4 font-medium">Symbol</th>
                <th className="px-6 py-4 font-medium text-right">Qty</th>
                <th className="px-6 py-4 font-medium text-right">Avg Cost</th>
                <th className="px-6 py-4 font-medium text-right">Last Price</th>
                <th className="px-6 py-4 font-medium text-right">Market Value</th>
                <th className="px-6 py-4 font-medium text-right">Total Return</th>
                <th className="px-6 py-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {positions.map((pos) => {
                const currentPrice = currentPrices[pos.symbol] || pos.avgCost;
                const marketValue = currentPrice * pos.quantity;
                const returnVal = marketValue - (pos.avgCost * pos.quantity);
                const returnPct = (returnVal / (pos.avgCost * pos.quantity)) * 100;

                return (
                  <tr key={pos.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{pos.symbol}</td>
                    <td className="px-6 py-4 text-right text-slate-300">{pos.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(pos.avgCost)}</td>
                    <td className="px-6 py-4 text-right text-white">{formatCurrency(currentPrice)}</td>
                    <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(marketValue)}</td>
                    <td className="px-6 py-4 text-right">
                       <div className={`flex flex-col items-end ${returnVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span className="font-medium">{returnVal >= 0 ? '+' : ''}{formatCurrency(returnVal)}</span>
                          <span className="text-xs opacity-80">{returnPct.toFixed(2)}%</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button 
                         onClick={() => removePosition(pos.id)}
                         className="text-slate-500 hover:text-rose-400 p-2 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {positions.length === 0 && (
                 <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                       No positions yet. Click "Add Position" to get started.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-xl font-bold text-white">Add New Position</h3>
              
              <div className="space-y-3">
                 <div>
                    <label className="block text-sm text-slate-400 mb-1">Symbol</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AAPL"
                      value={newPosition.symbol}
                      onChange={e => setNewPosition({...newPosition, symbol: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Quantity</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={newPosition.quantity}
                          onChange={e => setNewPosition({...newPosition, quantity: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Avg Cost</label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={newPosition.avgCost}
                          onChange={e => setNewPosition({...newPosition, avgCost: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 mt-6">
                 <button 
                   onClick={() => setIsAddModalOpen(false)}
                   className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleAddPosition}
                   className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                 >
                   Add Position
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
