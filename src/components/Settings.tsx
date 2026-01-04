import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Sliders } from 'lucide-react';
import { MODELS } from '../services/backtestEngine';
import { getStoredThresholds, saveThresholds, resetToDefaults } from '../services/settingsManager';

export const Settings: React.FC = () => {
  const [thresholds, setThresholds] = useState<{ [key: string]: number }>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredThresholds();
    const current: { [key: string]: number } = {};
    
    MODELS.forEach(m => {
      current[m.id] = stored[m.id] !== undefined ? stored[m.id] : m.defaultThreshold;
    });
    setThresholds(current);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            Global Strategy Settings
          </h2>
          <p className="text-slate-400 text-sm mt-1">Configure default buy thresholds for all strategy models.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODELS.map(model => (
          <div key={model.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-slate-200">{model.name}</h3>
              <span className="text-xs font-mono bg-slate-800 text-indigo-400 px-2 py-1 rounded">
                Default: {model.defaultThreshold}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4 min-h-[2.5em]">{model.description}</p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Buy Threshold</span>
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
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                 <span>Loose (0)</span>
                 <span>Strict (100)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
