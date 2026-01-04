import { HistoricalPoint } from '../types';
import { 
  calculateSMASeries, calculateEMASeries, calculateRSISeries, calculateMACDSeries, 
  calculateBollingerSeries, calculateStochasticSeries, calculateCCISeries, 
  calculateWilliamsRSeries, calculateVWMASeries, calculateADXSeries,
  calculateMFISeries, calculateROCSeries, calculateIchimokuSeries, calculateTechnicalScore,
  calculatePSARSeries, calculateDonchianSeries, calculateKeltnerSeries, calculateForceIndexSeries,
  calculateAroonSeries, calculateCMFSeries, calculateUltimateOscillatorSeries,
  calculateOBVSeries, calculateTEMASeries, calculateSqueezeSeries
} from './indicators';

export interface StrategySignal {
  name: string;
  score: number; 
  signal: 'BUY' | 'SELL' | 'NEUTRAL' | 'STRONG BUY' | 'STRONG SELL';
  value: string | number;
  type: 'Trend' | 'Oscillator' | 'Volatility' | 'Master';
  description: string;
}

const clamp = (val: number) => Math.max(0, Math.min(100, val));

const getSignalLabel = (score: number) => {
  if (score >= 80) return 'STRONG BUY';
  if (score >= 60) return 'BUY';
  if (score <= 20) return 'STRONG SELL';
  if (score <= 40) return 'SELL';
  return 'NEUTRAL';
};

export const evaluateStrategies = (history: HistoricalPoint[]): StrategySignal[] => {
  if (history.length < 50) return [];

  const prices = history.map(h => h.price);
  const highs = history.map(h => h.high || h.price);
  const lows = history.map(h => h.low || h.price);
  const volumes = history.map(h => h.volume || 0);
  const i = prices.length - 1;
  const currentPrice = prices[i];

  const signals: StrategySignal[] = [];

  // --- 0. Master Score ---
  // We need to calculate component scores first to feed into Master Score
  // Or simpler: We calculate everything, then push the signals.
  
  // Calculate component values first
  const sma200 = calculateSMASeries(prices, 200)[i] || 0;
  const sma50 = calculateSMASeries(prices, 50)[i] || 0;
  const rsi = calculateRSISeries(prices, 14)[i];
  const macdData = calculateMACDSeries(prices);
  
  // New components needed for Master Score
  const obvRaw = calculateOBVSeries(prices, volumes);
  const obvSmaRaw = calculateSMASeries(obvRaw, 20);
  const obvSc = obvRaw[i] > obvSmaRaw[i] ? 75 : 25;
  
  const sqzRaw = calculateSqueezeSeries(highs, lows, prices, 20);
  let sqzSc = 50;
  if (!sqzRaw.squeezeOn[i]) { if (sqzRaw.momentum[i] > 0) sqzSc = 80; else sqzSc = 20; }
  
  const tS = calculateTEMASeries(prices, 10)[i];
  const tL = calculateTEMASeries(prices, 30)[i];
  const temaSc = tS > tL ? 85 : 15;

  const techScore = calculateTechnicalScore(rsi, macdData.macdLine[i], macdData.signalLine[i], currentPrice, sma50, sma200, obvSc, sqzSc, temaSc);
  
  signals.push({
    name: 'Technical Score',
    score: techScore,
    signal: getSignalLabel(techScore),
    value: `${techScore}/100`,
    type: 'Master',
    description: 'Aggregated strength score'
  });

  // --- 1. RSI (Refined) ---
  // 30 = Buy (80pts), 70 = Sell (20pts)
  let rsiScore = 50;
  if (rsi < 30) rsiScore = 80 + (30 - rsi); // e.g. RSI 20 -> 90
  else if (rsi > 70) rsiScore = 20 - (rsi - 70); // e.g. RSI 80 -> 10
  else rsiScore = 50 + (50 - rsi); // Linear in middle
  signals.push({
    name: 'RSI (14)',
    score: clamp(rsiScore),
    signal: getSignalLabel(clamp(rsiScore)),
    value: rsi.toFixed(1),
    type: 'Oscillator',
    description: 'Relative Strength Index'
  });

  // --- 2. SMA Trend (Refined) ---
  // Use percentage distance. 5% above = Strong Trend.
  const smaDiff = (currentPrice - sma50) / sma50; 
  const smaScore = 50 + (smaDiff * 100 * 4); // 1% = +4 pts. 5% = +20 pts -> 70.
  signals.push({
    name: 'SMA Trend (50)',
    score: clamp(smaScore),
    signal: getSignalLabel(clamp(smaScore)),
    value: `${(smaDiff * 100).toFixed(2)}%`,
    type: 'Trend',
    description: 'Distance from 50-day SMA'
  });

  // --- 3. MACD (Refined) ---
  // Hist > 0 is bullish momentum. Signal Cross is trend.
  const macdVal = macdData.macdLine[i];
  const macdSig = macdData.signalLine[i];
  const hist = macdData.histogram[i];
  let macdScore = 50;
  
  // Trend Component (Above Zero)
  if (macdVal > 0) macdScore += 10; else macdScore -= 10;
  // Momentum Component (Hist)
  if (hist > 0) macdScore += 15; else macdScore -= 15;
  // Cross Component (Distance from Signal)
  // Normalized slightly by price is hard without ATR, assume raw value relative to price isn't huge
  // Just use sign of hist which covers the cross state.
  
  signals.push({
    name: 'MACD',
    score: clamp(macdScore),
    signal: getSignalLabel(macdScore),
    value: hist > 0 ? 'Bullish' : 'Bearish',
    type: 'Trend',
    description: 'Trend & Momentum'
  });

  // --- 4. Aroon (NEW) ---
  const aroon = calculateAroonSeries(highs, lows);
  const osc = aroon.aroonOsc[i]; // -100 to 100
  const aroonScore = 50 + (osc / 2); // 100 -> 100, -100 -> 0
  signals.push({
    name: 'Aroon Oscillator',
    score: clamp(aroonScore),
    signal: getSignalLabel(aroonScore),
    value: osc.toFixed(0),
    type: 'Trend',
    description: 'Time since recent high/low'
  });

  // --- 5. Chaikin Money Flow (NEW) ---
  const cmf = calculateCMFSeries(highs, lows, prices, volumes)[i]; // -1 to 1 usually
  const cmfScore = 50 + (cmf * 100); // 0.2 -> 70.
  signals.push({
    name: 'Chaikin Money Flow',
    score: clamp(cmfScore),
    signal: getSignalLabel(clamp(cmfScore)),
    value: cmf.toFixed(2),
    type: 'Oscillator',
    description: 'Buying/Selling Pressure'
  });

  // --- 6. Ultimate Oscillator (NEW) ---
  const ult = calculateUltimateOscillatorSeries(highs, lows, prices)[i];
  // Range 0-100. < 30 Oversold (Buy), > 70 Overbought (Sell)
  let ultScore = 50;
  if (ult < 30) ultScore = 85;
  else if (ult > 70) ultScore = 15;
  else ultScore = 100 - ult; // In middle, lower is better for entry? Or trend? 
  // Actually Ult Osc is mean reverting. Low = Buy.
  // Simple inversion: 50 -> 50. 30 -> 70. 70 -> 30.
  
  signals.push({
    name: 'Ultimate Oscillator',
    score: clamp(100 - ult),
    signal: getSignalLabel(clamp(100 - ult)),
    value: ult.toFixed(1),
    type: 'Oscillator',
    description: 'Multi-timeframe momentum'
  });

  // --- 7. Bollinger Bands ---
  const bbData = calculateBollingerSeries(prices);
  const bw = bbData.upper[i] - bbData.lower[i];
  const pctB = (currentPrice - bbData.lower[i]) / bw;
  let bbScore = (1 - pctB) * 100;
  signals.push({
    name: 'Bollinger Bands',
    score: clamp(bbScore),
    signal: getSignalLabel(clamp(bbScore)),
    value: pctB.toFixed(2),
    type: 'Volatility',
    description: '%B Position'
  });

  // --- 8. Stochastic (Refined) ---
  const stoch = calculateStochasticSeries(highs, lows, prices);
  const k = stoch.kLine[i];
  let stochScore = 100 - k;
  // Boost extremes
  if (k < 20) stochScore += 10;
  if (k > 80) stochScore -= 10;
  signals.push({
    name: 'Stochastic',
    score: clamp(stochScore),
    signal: getSignalLabel(clamp(stochScore)),
    value: k.toFixed(1),
    type: 'Oscillator',
    description: 'Momentum %K'
  });

  // --- 9. Ichimoku Cloud ---
  const ichimoku = calculateIchimokuSeries(highs, lows);
  const tenkan = ichimoku.tenkan[i];
  const kijun = ichimoku.kijun[i];
  let ichiScore = 50;
  if (currentPrice > tenkan && tenkan > kijun) ichiScore = 80;
  else if (currentPrice < tenkan && tenkan < kijun) ichiScore = 20;
  signals.push({
    name: 'Ichimoku Cloud',
    score: ichiScore,
    signal: getSignalLabel(ichiScore),
    value: tenkan > kijun ? 'Bullish' : 'Bearish',
    type: 'Trend',
    description: 'Tenkan/Kijun Cross'
  });

  // --- 10. ADX Trend ---
  const adxData = calculateADXSeries(highs, lows, prices);
  const adx = adxData.adx[i];
  const pDi = adxData.plusDI[i];
  const mDi = adxData.minusDI[i];
  let adxScore = 50;
  const strength = Math.min(adx, 50); 
  if (pDi > mDi) adxScore = 50 + strength; 
  else adxScore = 50 - strength;
  signals.push({
    name: 'ADX Trend',
    score: clamp(adxScore),
    signal: getSignalLabel(clamp(adxScore)),
    value: `ADX ${adx.toFixed(0)}`,
    type: 'Trend',
    description: 'Trend Strength'
  });

  // --- 11. MFI ---
  const mfiData = calculateMFISeries(highs, lows, prices, volumes);
  const mfi = mfiData[i];
  let mfiScore = 100 - mfi; 
  signals.push({
    name: 'Money Flow Index',
    score: clamp(mfiScore),
    signal: getSignalLabel(clamp(mfiScore)),
    value: mfi.toFixed(1),
    type: 'Oscillator',
    description: 'Volume RSI'
  });

  // --- 12. Parabolic SAR ---
  const psar = calculatePSARSeries(highs, lows)[i];
  const psarScore = currentPrice > psar ? 80 : 20;
  signals.push({
    name: 'Parabolic SAR',
    score: psarScore,
    signal: getSignalLabel(psarScore),
    value: currentPrice > psar ? 'Bullish' : 'Bearish',
    type: 'Trend',
    description: 'Stop & Reverse'
  });

  // --- 13. Squeeze Momentum (NEW) ---
  // Buy when Squeeze RELEASES (was on, now off) and Momentum is Positive
  // Or just if Momentum is positive and strong
  // We can't easily check "was on" without looking back.
  // Strategy: If Squeeze is OFF and Momentum > 0 -> Buy. If Squeeze is ON -> Neutral (Wait).
  const sqz = calculateSqueezeSeries(highs, lows, prices, 20);
  const isSqueezed = sqz.squeezeOn[i];
  const mom = sqz.momentum[i];
  let sqzScore = 50;
  if (isSqueezed) {
     sqzScore = 50; // Neutral, pending breakout
  } else {
     if (mom > 0) sqzScore = 80;
     else sqzScore = 20;
  }
  signals.push({
    name: 'TTM Squeeze',
    score: sqzScore,
    signal: getSignalLabel(sqzScore),
    value: isSqueezed ? 'Squeezing' : (mom > 0 ? 'Bullish Release' : 'Bearish Release'),
    type: 'Volatility',
    description: 'Volatility Breakout'
  });

  // --- 14. OBV Trend (NEW) ---
  const obv = calculateOBVSeries(prices, volumes);
  const obvSma = calculateSMASeries(obv, 20)[i];
  let obvScore = 50;
  if (obv[i] > obvSma) obvScore = 75;
  else obvScore = 25;
  signals.push({
    name: 'On-Balance Volume',
    score: obvScore,
    signal: getSignalLabel(obvScore),
    value: obv[i] > obvSma ? 'Accumulation' : 'Distribution',
    type: 'Trend',
    description: 'Volume Trend'
  });

  // --- 15. TEMA Trend (NEW) ---
  const temaShort = calculateTEMASeries(prices, 10)[i];
  const temaLong = calculateTEMASeries(prices, 30)[i];
  let temaScore = 50;
  if (temaShort > temaLong) temaScore = 85;
  else temaScore = 15;
  signals.push({
    name: 'TEMA Crossover',
    score: temaScore,
    signal: getSignalLabel(temaScore),
    value: temaShort > temaLong ? 'Bullish' : 'Bearish',
    type: 'Trend',
    description: 'Triple EMA Momentum'
  });

  return signals;
};