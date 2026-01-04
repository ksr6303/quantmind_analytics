import { MODELS } from './backtestEngine';

export interface ModelSettings {
  [modelId: string]: number;
}

const SETTINGS_KEY = 'quantmind_model_settings';

export const getStoredThresholds = (): ModelSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load settings", e);
    return {};
  }
};

export const saveThresholds = (settings: ModelSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getModelThreshold = (modelId: string): number => {
  const stored = getStoredThresholds();
  if (stored[modelId] !== undefined) {
      return Number(stored[modelId]);
  }
  const model = MODELS.find(m => m.id === modelId);
  return model ? model.defaultThreshold : 50;
};

export const resetToDefaults = () => {
    localStorage.removeItem(SETTINGS_KEY);
};
