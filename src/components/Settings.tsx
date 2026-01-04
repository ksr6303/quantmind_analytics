import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Sliders, Key, BrainCircuit, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { MODELS } from '../services/backtestEngine';
import { getStoredThresholds, saveThresholds, resetToDefaults, getStoredApiKey, saveApiKey } from '../services/settingsManager';

export const Settings: React.FC = () => {
  const [thresholds, setThresholds] = useState<{ [key: string]: number }>({});
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredThresholds();
    const current: { [key: string]: number } = {};
    
    MODELS.forEach(m => {
      current[m.id] = stored[m.id] !== undefined ? stored[m.id] : m.defaultThreshold;
    });
    setThresholds(current);
    setApiKey(getStoredApiKey());
  }, []);

  const handleChange = (id: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setThresholds(prev => ({ ...prev, [id]: num }));
      setSaved(false);
    }
  };

  const handleSave = () => {
    saveThresholds(thresholds);
    saveApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetToDefaults();
    const defaults: { [key: string]: number } = {};
    MODELS.forEach(m => {
      defaults[m.id] = m.defaultThreshold;
    });
    setThresholds(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            System Settings
          </h2>
          <p className="text-slate-400 text-sm mt-1">Configure your environment and strategy parameters.</p>
        </div>
        <div className="flex gap-3">
            <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm ${
              saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* API Key Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  AI Intelligence (Gemini API)
              </h3>
              <p className="text-slate-400 text-xs mt-1">Required for AI Stock Recommendations and Sentiment Analysis.</p>
          </div>
          <div className="p-6 space-y-4">
              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                      Gemini API Key
                      <span className="text-[10px] text-indigo-400 lowercase italic">Saved only to this device</span>
                  </label>
                  <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
                        placeholder="Enter your Google Gemini API Key..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors pr-12"
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-4 top-3.5 text-slate-500 hover:text-white"
                      >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                  </div>
              </div>
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                      Your key is stored <strong>locally in your browser</strong>. It is never sent to our servers or stored on GitHub. This makes it safe to use even on public deployments.
                  </p>
              </div>
          </div>
      </section>

      {/* Strategy Section */}
      <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 px-1">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Strategy Model Thresholds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODELS.map(model => (
              <div key={model.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-200">{model.name}</h3>
                  <span className="text-xs font-mono bg-slate-800 text-indigo-400 px-2 py-1 rounded">
                    Def: {model.defaultThreshold}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4 min-h-[2.5em]">{model.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 text-xs">Buy Threshold</span>
                    <span className={`font-bold ${thresholds[model.id] >= 80 ? 'text-emerald-400' : thresholds[model.id] <= 20 ? 'text-rose-400' : 'text-white'}`}>
                      {thresholds[model.id] || 0}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={thresholds[model.id] || 0}
                    onChange={(e) => handleChange(model.id, e.target.value)}
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
      </section>
    </div>
  );
};
