import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard, 
  LineChart, 
  Wallet, 
  FlaskConical, 
  Newspaper,
  Menu,
  X,
  BrainCircuit,
  Database,
  RefreshCw,
  Trophy,
  Globe,
  XCircle,
  PlusCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { StockScanner } from './components/StockScanner';
import { Portfolio } from './components/Portfolio';
import { Backtester } from './components/Backtester';
import { Stackathon } from './components/Stackathon';
import { NewsFeed } from './components/NewsFeed';
import { AddStock } from './components/AddStock';
import { Settings } from './components/Settings';
import { updateAllStocks } from './services/dataManager';
import { getStocks } from './constants/stocks';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [market, setMarket] = useState<'IND' | 'US'>('IND');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Navigation State
  const [selectedTicker, setSelectedTicker] = useState<string>('');

  const handleUpdateData = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const stocks = getStocks(market);
      const result = await updateAllStocks(stocks, (current, total, symbol, status) => {
         setUpdateStatus(`${current}/${total}: ${symbol} - ${status}`);
      }, controller.signal);
      
      if (controller.signal.aborted) {
         setUpdateStatus(`Stopped. Success: ${result.successCount}`);
      } else {
         setUpdateStatus(`Done. Success: ${result.successCount}, Failed: ${result.failCount}`);
      }
      setTimeout(() => setUpdateStatus(''), 5000);
    } catch (e: any) {
      if (e.message === 'Aborted') {
         setUpdateStatus('Update Stopped');
      } else {
         setUpdateStatus('Update Process Error');
      }
    } finally {
      setIsUpdating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopUpdate = () => {
     if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setUpdateStatus('Stopping...');
     }
  };

  const navigateToAnalysis = (ticker: string) => {
    setSelectedTicker(ticker);
    setActiveTab('dashboard');
  };

  const navItems = [
    { id: 'dashboard', label: 'Market Analysis', icon: LayoutDashboard },
    { id: 'scanner', label: 'Stock Scanner', icon: LineChart },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'backtest', label: 'Backtesting', icon: FlaskConical },
    { id: 'stackathon', label: 'Stackathon', icon: Trophy },
    { id: 'addstock', label: 'Add Stock', icon: PlusCircle },
    { id: 'news', label: 'News Wire', icon: Newspaper },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-950 border-r border-slate-800 sticky top-0 h-screen">
         <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
               <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              QuantMind
            </span>
         </div>
         
         <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id 
                    ? 'bg-slate-900 text-white border border-slate-800' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
         </nav>

         <div className="p-4 border-t border-slate-800 space-y-4">
            {/* Market Switcher */}
            <div className="bg-slate-900/50 rounded-lg p-1 border border-slate-800 flex">
               <button 
                 onClick={() => setMarket('IND')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
                   market === 'IND' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                 }`}
               >
                 <span className="text-[10px]">🇮🇳</span> IND
               </button>
               <button 
                 onClick={() => setMarket('US')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
                   market === 'US' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                 }`}
               >
                 <span className="text-[10px]">🇺🇸</span> US
               </button>
            </div>

            {/* Data Update Control */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                     <Database className="w-3 h-3" /> {market} Data
                  </span>
                  <button 
                    onClick={isUpdating ? handleStopUpdate : handleUpdateData}
                    className={`text-xs p-1 rounded hover:bg-slate-800 transition-colors ${isUpdating ? 'text-rose-400' : 'text-indigo-400'}`}
                    title={isUpdating ? "Stop Update" : "Update Data"}
                  >
                    {isUpdating ? <XCircle className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                  </button>
               </div>
               {updateStatus ? (
                 <div className="space-y-1">
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 animate-pulse w-full"></div>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{updateStatus}</p>
                 </div>
               ) : (
                 <p className="text-[10px] text-slate-600">Sync {market} Stocks</p>
               )}
            </div>
         </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
               <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white">QuantMind</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-slate-950 z-40 p-4 space-y-2">
             <div className="flex gap-2 mb-4">
               <button onClick={() => { setMarket('IND'); setMobileMenuOpen(false); }} className={`flex-1 py-2 rounded bg-slate-800 text-center ${market === 'IND' ? 'text-indigo-400 border border-indigo-500' : 'text-slate-400'}`}>IND</button>
               <button onClick={() => { setMarket('US'); setMobileMenuOpen(false); }} className={`flex-1 py-2 rounded bg-slate-800 text-center ${market === 'US' ? 'text-blue-400 border border-blue-500' : 'text-slate-400'}`}>US</button>
             </div>
             {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-lg text-sm font-medium ${
                  activeTab === item.id ? 'bg-slate-900 text-white' : 'text-slate-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
           {activeTab === 'dashboard' && <Dashboard initialTicker={selectedTicker} market={market} />}
           {activeTab === 'scanner' && <StockScanner onNavigate={navigateToAnalysis} market={market} />}
           {activeTab === 'portfolio' && <Portfolio market={market} />}
           {activeTab === 'backtest' && <Backtester market={market} />}
           {activeTab === 'stackathon' && <Stackathon market={market} />}
           {activeTab === 'addstock' && <AddStock />}
           {activeTab === 'news' && <NewsFeed />}
           {activeTab === 'settings' && <Settings />}
        </main>

      </div>
    </div>
  );
}

export default App;
