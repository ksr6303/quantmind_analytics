import { HistoricalPoint, TechnicalIndicators } from '../types';

// --- Series Generators ---

export const calculateSMASeries = (data: number[], period: number): number[] => {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) sum -= data[i - period];
    if (i >= period - 1) result.push(sum / period);
    else result.push(NaN);
  }
  return result;
};

export const calculateEMASeries = (data: number[], period: number): number[] => {
  const result: number[] = [];
  const k = 2 / (period + 1);
  // Seeding with SMA for stability
  let sum = 0;
  for(let i=0; i<period; i++) sum += data[i];
  const sma = sum / period;
  
  for(let i=0; i<period-1; i++) result.push(NaN);
  result.push(sma);

  for (let i = period; i < data.length; i++) {
    const prev = result[result.length-1];
    result.push(data[i] * k + prev * (1 - k));
  }
  return result;
};

export const calculateRSISeries = (data: number[], period: number = 14): number[] => {
  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for(let i=0; i<period; i++) result.push(NaN);
  
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - (100 / (1 + rs)));

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    
    if (avgLoss === 0) result.push(100);
    else {
      rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  return result;
};

export const calculateMACDSeries = (data: number[], fast = 12, slow = 26, signal = 9) => {
  const emaFast = calculateEMASeries(data, fast);
  const emaSlow = calculateEMASeries(data, slow);
  const macdLine = emaFast.map((f, i) => f - emaSlow[i]);
  const signalLine = calculateEMASeries(macdLine, signal);
  return { macdLine, signalLine, histogram: macdLine.map((m, i) => m - signalLine[i]) };
};

export const calculateBollingerSeries = (data: number[], period = 20, mult = 2) => {
  const sma = calculateSMASeries(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
     if (i < period - 1) {
        upper.push(NaN); lower.push(NaN); middle.push(NaN); continue;
     }
     let sumSq = 0;
     for (let j = 0; j < period; j++) {
        sumSq += Math.pow(data[i - j] - sma[i], 2);
     }
     const stdDev = Math.sqrt(sumSq / period);
     upper.push(sma[i] + mult * stdDev);
     lower.push(sma[i] - mult * stdDev);
     middle.push(sma[i]);
  }
  return { upper, lower, middle };
};

export const calculateStochasticSeries = (high: number[], low: number[], close: number[], period = 14, kPeriod = 3, dPeriod = 3) => {
  const kLine: number[] = [];
  for (let i = 0; i < close.length; i++) {
     if (i < period - 1) { kLine.push(50); continue; }
     let highest = -Infinity;
     let lowest = Infinity;
     for (let j = 0; j < period; j++) {
        if (high[i-j] > highest) highest = high[i-j];
        if (low[i-j] < lowest) lowest = low[i-j];
     }
     const k = ((close[i] - lowest) / (highest - lowest)) * 100;
     kLine.push(isNaN(k) ? 50 : k);
  }
  const dLine = calculateSMASeries(kLine, dPeriod);
  return { kLine, dLine };
};

export const calculateATRSeries = (high: number[], low: number[], close: number[], period = 14): number[] => {
   const tr: number[] = [high[0] - low[0]]; 
   for (let i = 1; i < close.length; i++) {
      const hl = high[i] - low[i];
      const hc = Math.abs(high[i] - close[i-1]);
      const lc = Math.abs(low[i] - close[i-1]);
      tr.push(Math.max(hl, hc, lc));
   }
   
   const atr: number[] = [];
   let initialATR = 0;
   for(let i=0; i<period; i++) initialATR += tr[i];
   initialATR /= period;
   
   for(let i=0; i<close.length; i++) {
      if (i < period) { atr.push(NaN); continue; }
      if (i === period) { atr.push(initialATR); continue; }
      const prev = atr[i-1];
      const current = (prev * (period - 1) + tr[i]) / period;
      atr.push(current);
   }
   return atr;
};

export const calculateSuperTrendSeries = (high: number[], low: number[], close: number[], period = 10, multiplier = 3) => {
   const atr = calculateATRSeries(high, low, close, period);
   const superTrend: number[] = [];
   const directions: number[] = []; 
   
   let trend = 1;
   let lowerBand = 0;
   let upperBand = 0;

   for (let i = 0; i < close.length; i++) {
      if (isNaN(atr[i])) { 
         superTrend.push(NaN); 
         directions.push(1);
         continue; 
      }

      const hl2 = (high[i] + low[i]) / 2;
      const basicUpper = hl2 + (multiplier * atr[i]);
      const basicLower = hl2 - (multiplier * atr[i]);

      const prevUpper = i > 0 ? upperBand : basicUpper;
      const prevLower = i > 0 ? lowerBand : basicLower;
      const prevClose = i > 0 ? close[i-1] : close[i];

      if (basicUpper < prevUpper || prevClose > prevUpper) upperBand = basicUpper;
      else upperBand = prevUpper;

      if (basicLower > prevLower || prevClose < prevLower) lowerBand = basicLower;
      else lowerBand = prevLower;

      if (trend === 1 && close[i] <= lowerBand) {
         trend = -1;
      } else if (trend === -1 && close[i] >= upperBand) {
         trend = 1;
      }

      superTrend.push(trend === 1 ? lowerBand : upperBand);
      directions.push(trend);
   }
   return { superTrend, directions };
};

export const calculateCCISeries = (high: number[], low: number[], close: number[], period = 20) => {
   const tp = high.map((h, i) => (h + low[i] + close[i]) / 3);
   const smaTP = calculateSMASeries(tp, period);
   const cci: number[] = [];
   
   for (let i = 0; i < tp.length; i++) {
      if (isNaN(smaTP[i])) { cci.push(NaN); continue; }
      
      let mdSum = 0;
      for (let j = 0; j < period; j++) mdSum += Math.abs(tp[i-j] - smaTP[i]);
      const md = mdSum / period;
      
      cci.push((tp[i] - smaTP[i]) / (0.015 * md));
   }
   return cci;
};

export const calculateWilliamsRSeries = (high: number[], low: number[], close: number[], period = 14) => {
   const result: number[] = [];
   for (let i = 0; i < close.length; i++) {
      if (i < period - 1) { result.push(NaN); continue; }
      let highest = -Infinity;
      let lowest = Infinity;
      for (let j = 0; j < period; j++) {
         if (high[i-j] > highest) highest = high[i-j];
         if (low[i-j] < lowest) lowest = low[i-j];
      }
      const wr = ((highest - close[i]) / (highest - lowest)) * -100;
      result.push(wr);
   }
   return result;
};

export const calculateVWMASeries = (close: number[], volume: number[], period = 20) => {
   const result: number[] = [];
   for (let i = 0; i < close.length; i++) {
      if (i < period - 1) { result.push(NaN); continue; }
      let pvSum = 0;
      let vSum = 0;
      for (let j = 0; j < period; j++) {
         pvSum += close[i-j] * volume[i-j];
         vSum += volume[i-j];
      }
      result.push(pvSum / vSum);
   }
   return result;
};

export const calculateADXSeries = (high: number[], low: number[], close: number[], period = 14) => {
   const tr: number[] = []; const plusDM: number[] = []; const minusDM: number[] = [];
   tr.push(0); plusDM.push(0); minusDM.push(0);
   for(let i=1; i<close.length; i++) {
      const up = high[i] - high[i-1]; const down = low[i-1] - low[i];
      plusDM.push((up > down && up > 0) ? up : 0);
      minusDM.push((down > up && down > 0) ? down : 0);
      const hl = high[i] - low[i]; const hc = Math.abs(high[i] - close[i-1]); const lc = Math.abs(low[i] - close[i-1]);
      tr.push(Math.max(hl, hc, lc));
   }
   const smooth = (src: number[]) => {
      const res: number[] = []; let sum = 0;
      for(let i=0; i<src.length; i++) {
         if (i < period) { sum += src[i]; res.push(NaN); continue; }
         if (i === period) { res.push(sum / period); continue; }
         const prev = res[res.length-1];
         if (isNaN(prev)) { res.push(NaN); continue; }
         res.push((prev * (period - 1) + src[i]) / period);
      }
      return res;
   };
   const trS = smooth(tr); const plusS = smooth(plusDM); const minusS = smooth(minusDM);
   const plusDI: number[] = []; const minusDI: number[] = []; const dx: number[] = [];
   for(let i=0; i<close.length; i++) {
      if (isNaN(trS[i]) || trS[i] === 0) { plusDI.push(NaN); minusDI.push(NaN); dx.push(NaN); continue; }
      const p = (plusS[i] / trS[i]) * 100; const m = (minusS[i] / trS[i]) * 100;
      plusDI.push(p); minusDI.push(m);
      const sum = p + m; dx.push(sum === 0 ? 0 : (Math.abs(p - m) / sum) * 100);
   }
   const adx = new Array(dx.length).fill(NaN);
   let firstValidDX = -1;
   for(let i=0; i<dx.length; i++) { if (!isNaN(dx[i])) { firstValidDX = i; break; } }
   if (firstValidDX !== -1 && dx.length > firstValidDX + period) {
       let dxSum = 0;
       for(let i=0; i<period; i++) dxSum += dx[firstValidDX + i];
       adx[firstValidDX + period] = dxSum / period;
       for(let i = firstValidDX + period + 1; i < dx.length; i++) {
           const prevADX = adx[i-1]; adx[i] = (prevADX * (period - 1) + dx[i]) / period;
       }
   }
   return { adx, plusDI, minusDI };
};

export const calculateMFISeries = (high: number[], low: number[], close: number[], volume: number[], period = 14): number[] => {
  const result: number[] = [];
  const tp = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const rawMoneyFlow = tp.map((p, i) => p * volume[i]);
  const posFlow: number[] = [];
  const negFlow: number[] = [];
  for(let i=1; i<tp.length; i++) {
     if (tp[i] > tp[i-1]) { posFlow.push(rawMoneyFlow[i]); negFlow.push(0); }
     else if (tp[i] < tp[i-1]) { posFlow.push(0); negFlow.push(rawMoneyFlow[i]); }
     else { posFlow.push(0); negFlow.push(0); }
  }
  for(let i=0; i<period; i++) result.push(NaN);
  for(let i=period; i<tp.length; i++) {
     let sumPos = 0; let sumNeg = 0;
     for(let j=0; j<period; j++) {
        sumPos += posFlow[i - 1 - j];
        sumNeg += negFlow[i - 1 - j];
     }
     if (sumNeg === 0) result.push(100);
     else {
        const mfr = sumPos / sumNeg;
        result.push(100 - (100 / (1 + mfr)));
     }
  }
  return result;
};

export const calculateROCSeries = (data: number[], period = 12): number[] => {
   const result: number[] = [];
   for(let i=0; i<data.length; i++) {
      if (i < period) { result.push(NaN); continue; }
      const roc = ((data[i] - data[i-period]) / data[i-period]) * 100;
      result.push(roc);
   }
   return result;
};

export const calculateIchimokuSeries = (high: number[], low: number[]) => {
   const tenkan: number[] = [];
   const kijun: number[] = [];
   const getAvg = (period: number, idx: number) => {
      if (idx < period - 1) return NaN;
      let h = -Infinity; let l = Infinity;
      for(let j=0; j<period; j++) {
         if (high[idx-j] > h) h = high[idx-j];
         if (low[idx-j] < l) l = low[idx-j];
      }
      return (h + l) / 2;
   };
   for(let i=0; i<high.length; i++) {
      tenkan.push(getAvg(9, i));
      kijun.push(getAvg(26, i));
   }
   return { tenkan, kijun };
};

export const calculatePSARSeries = (high: number[], low: number[], acceleration = 0.02, maxAcceleration = 0.2) => {
   const psar: number[] = new Array(high.length).fill(NaN);
   if (high.length < 2) return psar;
   let trend = high[1] > high[0] ? 1 : -1;
   let sar = trend === 1 ? low[0] : high[0];
   let ep = trend === 1 ? high[1] : low[1];
   let af = acceleration;
   psar[1] = sar;
   for (let i = 2; i < high.length; i++) {
      const prevSar = psar[i-1];
      let nextSar = prevSar + af * (ep - prevSar);
      if (trend === 1) {
         if (nextSar > low[i-1]) nextSar = low[i-1];
         if (nextSar > low[i-2]) nextSar = low[i-2];
      } else {
         if (nextSar < high[i-1]) nextSar = high[i-1];
         if (nextSar < high[i-2]) nextSar = high[i-2];
      }
      if (trend === 1) {
         if (low[i] < nextSar) {
            trend = -1; nextSar = ep; ep = low[i]; af = acceleration;
         } else {
            if (high[i] > ep) { ep = high[i]; af = Math.min(af + acceleration, maxAcceleration); }
         }
      } else {
         if (high[i] > nextSar) {
            trend = 1; nextSar = ep; ep = high[i]; af = acceleration;
         } else {
            if (low[i] < ep) { ep = low[i]; af = Math.min(af + acceleration, maxAcceleration); }
         }
      }
      psar[i] = nextSar;
   }
   return psar;
};

export const calculateDonchianSeries = (high: number[], low: number[], period = 20) => {
   const upper: number[] = [];
   const lower: number[] = [];
   const middle: number[] = [];
   for(let i=0; i<high.length; i++) {
      if (i < period - 1) { upper.push(NaN); lower.push(NaN); middle.push(NaN); continue; }
      let h = -Infinity; let l = Infinity;
      for(let j=0; j<period; j++) {
         if (high[i-j] > h) h = high[i-j];
         if (low[i-j] < l) l = low[i-j];
      }
      upper.push(h); lower.push(l); middle.push((h+l)/2);
   }
   return { upper, lower, middle };
};

export const calculateKeltnerSeries = (high: number[], low: number[], close: number[], period = 20, multiplier = 2) => {
   const ema20 = calculateEMASeries(close, period);
   const atr = calculateATRSeries(high, low, close, 10);
   const upper: number[] = []; const lower: number[] = []; const middle: number[] = [];
   for(let i=0; i<close.length; i++) {
      if (isNaN(ema20[i]) || isNaN(atr[i])) { upper.push(NaN); lower.push(NaN); middle.push(NaN); continue; }
      middle.push(ema20[i]);
      upper.push(ema20[i] + multiplier * atr[i]);
      lower.push(ema20[i] - multiplier * atr[i]);
   }
   return { upper, lower, middle };
};

export const calculateForceIndexSeries = (close: number[], volume: number[], period = 13) => {
   const rawForce: number[] = [NaN];
   for(let i=1; i<close.length; i++) rawForce.push((close[i] - close[i-1]) * volume[i]);
   return calculateEMASeries(rawForce, period);
};

// --- NEW 1: Aroon Indicator ---
export const calculateAroonSeries = (high: number[], low: number[], period = 25) => {
   const aroonUp: number[] = [];
   const aroonDown: number[] = [];
   const aroonOsc: number[] = [];

   for(let i=0; i<high.length; i++) {
      if (i < period) { aroonUp.push(NaN); aroonDown.push(NaN); aroonOsc.push(NaN); continue; }
      
      let highIndex = -1; let lowIndex = -1;
      let maxH = -Infinity; let minL = Infinity;
      
      // Look back period days (inclusive of current)
      for(let j=0; j<=period; j++) {
         const idx = i - j;
         if (high[idx] > maxH) { maxH = high[idx]; highIndex = j; } // days ago
         if (low[idx] < minL) { minL = low[idx]; lowIndex = j; } // days ago
      }
      
      const up = ((period - highIndex) / period) * 100;
      const down = ((period - lowIndex) / period) * 100;
      aroonUp.push(up);
      aroonDown.push(down);
      aroonOsc.push(up - down);
   }
   return { aroonUp, aroonDown, aroonOsc };
};

// --- NEW 2: Chaikin Money Flow (CMF) ---
export const calculateCMFSeries = (high: number[], low: number[], close: number[], volume: number[], period = 20) => {
   const mfVol: number[] = [];
   const volSeries: number[] = [];
   const result: number[] = [];

   for(let i=0; i<close.length; i++) {
      const range = high[i] - low[i];
      const mfv = range === 0 ? 0 : (((close[i] - low[i]) - (high[i] - close[i])) / range) * volume[i];
      mfVol.push(mfv);
      volSeries.push(volume[i]);
      
      if (i < period - 1) { result.push(NaN); continue; }
      
      let sumMfv = 0; let sumVol = 0;
      for(let j=0; j<period; j++) {
         sumMfv += mfVol[i-j];
         sumVol += volSeries[i-j];
      }
      
      result.push(sumVol === 0 ? 0 : sumMfv / sumVol);
   }
   return result;
};

// --- NEW 3: Ultimate Oscillator ---
export const calculateUltimateOscillatorSeries = (high: number[], low: number[], close: number[], p1=7, p2=14, p3=28) => {
   const bp: number[] = []; // Buying Pressure
   const tr: number[] = []; // True Range
   const ult: number[] = [];

   // Calc BP and TR
   for(let i=0; i<close.length; i++) {
      if (i===0) { bp.push(0); tr.push(0); ult.push(NaN); continue; } // Need prev close
      
      const prevClose = close[i-1];
      const curBP = close[i] - Math.min(low[i], prevClose);
      const curTR = Math.max(high[i], prevClose) - Math.min(low[i], prevClose);
      
      bp.push(curBP);
      tr.push(curTR);
      
      if (i < p3) { ult.push(NaN); continue; }
      
      const calcAvg = (period: number) => {
         let sBP = 0; let sTR = 0;
         for(let j=0; j<period; j++) { sBP += bp[i-j]; sTR += tr[i-j]; }
         return sTR === 0 ? 0 : sBP / sTR;
      };
      
      const avg1 = calcAvg(p1);
      const avg2 = calcAvg(p2);
      const avg3 = calcAvg(p3);
      
      const u = 100 * ((4 * avg1) + (2 * avg2) + avg3) / 7;
      ult.push(u);
   }
   return ult;
};

// --- NEW 4: On-Balance Volume (OBV) ---
export const calculateOBVSeries = (close: number[], volume: number[]) => {
   const obv: number[] = [0];
   for(let i=1; i<close.length; i++) {
      const prev = obv[i-1];
      if (close[i] > close[i-1]) obv.push(prev + volume[i]);
      else if (close[i] < close[i-1]) obv.push(prev - volume[i]);
      else obv.push(prev);
   }
   return obv;
};

// --- NEW 5: Triple Exponential Moving Average (TEMA) ---
export const calculateTEMASeries = (data: number[], period: number) => {
   const ema1 = calculateEMASeries(data, period);
   const ema2 = calculateEMASeries(ema1.map(v => isNaN(v) ? 0 : v), period); // Handle NaNs for subsequent EMAs
   const ema3 = calculateEMASeries(ema2.map(v => isNaN(v) ? 0 : v), period);
   
   const tema: number[] = [];
   for(let i=0; i<data.length; i++) {
      if (isNaN(ema1[i]) || isNaN(ema2[i]) || isNaN(ema3[i])) { tema.push(NaN); continue; }
      // TEMA = 3*EMA1 - 3*EMA2 + EMA3
      tema.push(3 * ema1[i] - 3 * ema2[i] + ema3[i]);
   }
   return tema;
};

// --- NEW 6: Squeeze Momentum Indicator ---
export const calculateSqueezeSeries = (high: number[], low: number[], close: number[], length=20, mult=2, keltnerMult=1.5) => {
   // Bollinger Bands
   const bb = calculateBollingerSeries(close, length, mult);
   // Keltner Channels
   const kc = calculateKeltnerSeries(high, low, close, length, keltnerMult);
   
   // Momentum (Linear Regression of price-avg) - Simplified to Delta from Donchian Mid or SMA
   // Standard TTM uses Delta from (Donchian Mid + SMA)/2
   // Here we will use a simpler Momentum Oscillator: Price - SMA(20)
   const sma = calculateSMASeries(close, length);
   const momentum: number[] = [];
   
   const squeezeOn: boolean[] = []; // True if BB is inside KC
   
   for(let i=0; i<close.length; i++) {
      if (isNaN(bb.upper[i]) || isNaN(kc.upper[i])) {
         momentum.push(NaN); squeezeOn.push(false); continue; 
      }
      
      // Squeeze is ON when BB is INSIDE KC
      // UpperBB < UpperKC AND LowerBB > LowerKC
      const isSqueezed = bb.upper[i] < kc.upper[i] && bb.lower[i] > kc.lower[i];
      squeezeOn.push(isSqueezed);
      
      // Momentum Value
      momentum.push(close[i] - sma[i]);
   }
   
   return { squeezeOn, momentum };
};

// --- Single Value Wrapper using Series ---
export const calculateSMA = (data: number[], period: number) => {
   const series = calculateSMASeries(data, period);
   return series[series.length - 1];
};

export const calculatePivotPoints = (high: number, low: number, close: number) => {
  const p = (high + low + close) / 3;
  const r1 = 2 * p - low; const s1 = 2 * p - high;
  const r2 = p + (high - low); const s2 = p - (high - low);
  const r3 = high + 2 * (p - low); const s3 = low - 2 * (high - p);
  return { p, r1, s1, r2, s2, r3, s3 };
};

export const calculateTechnicalScore = (rsi: number, macd: number, signal: number, price: number, sma50: number, sma200: number, obvScore: number = 50, squeezeScore: number = 50, temaScore: number = 50): number => {
  let score = 50; 
  if (rsi < 30) score += 15; else if (rsi > 70) score -= 15; else if (rsi > 50) score += 5; else score -= 5;
  if (macd > signal) score += 10; else score -= 10;
  if (price > sma50) score += 10; else score -= 10;
  if (price > sma200) score += 15; else score -= 15;
  if (sma50 > sma200) score += 10;
  
  // Add weight for new models (Normalized to roughly same scale)
  if (obvScore > 60) score += 10; else if (obvScore < 40) score -= 10;
  if (squeezeScore > 60) score += 15; else if (squeezeScore < 40) score -= 15; // Higher weight for squeeze breakout
  if (temaScore > 60) score += 10; else if (temaScore < 40) score -= 10;

  return Math.max(0, Math.min(100, score));
};

export const analyzeTechnicalData = (history: HistoricalPoint[]): TechnicalIndicators & { score: number, pivots: any } => {
  const prices = history.map(h => h.price);
  const highs = history.map(h => h.high || h.price);
  const lows = history.map(h => h.low || h.price);
  const volumes = history.map(h => h.volume || 0);
  
  const rsi = calculateRSISeries(prices, 14).pop() || 50;
  
  const macdData = calculateMACDSeries(prices);
  const macd = {
     macd: macdData.macdLine.pop() || 0,
     signal: macdData.signalLine.pop() || 0,
     histogram: macdData.histogram.pop() || 0
  };

  const bollData = calculateBollingerSeries(prices);
  const u = bollData.upper.pop() || 0;
  const m = bollData.middle.pop() || 0;
  const l = bollData.lower.pop() || 0;
  
  const bollinger = {
     upper: u, middle: m, lower: l,
     bandwidth: m !== 0 ? (u - l) / m : 0
  };

  const sma20 = calculateSMASeries(prices, 20).pop() || 0;
  const sma50 = calculateSMASeries(prices, 50).pop() || 0;
  const sma200 = calculateSMASeries(prices, 200).pop() || 0;
  const currentPrice = prices[prices.length - 1];
  
  let trend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  if (currentPrice > sma20 && macd.macd > macd.signal) trend = 'Bullish';
  else if (currentPrice < sma20 && macd.macd < macd.signal) trend = 'Bearish';

  const lastPoint = history[history.length - 1];
  const pivots = calculatePivotPoints(lastPoint.high || lastPoint.price, lastPoint.low || lastPoint.price, lastPoint.price);
  
  // Calculate New Scores for Master Score
  const obv = calculateOBVSeries(prices, volumes);
  const obvSma = calculateSMASeries(obv, 20).pop() || 0;
  const curObv = obv.pop() || 0;
  const obvScore = curObv > obvSma ? 75 : 25;

  const sqz = calculateSqueezeSeries(highs, lows, prices, 20);
  const isSqueezed = sqz.squeezeOn.pop() || false;
  const mom = sqz.momentum.pop() || 0;
  let squeezeScore = 50;
  if (!isSqueezed) { if (mom > 0) squeezeScore = 80; else squeezeScore = 20; }

  const tS = calculateTEMASeries(prices, 10).pop() || 0;
  const tL = calculateTEMASeries(prices, 30).pop() || 0;
  const temaScore = tS > tL ? 85 : 15;

  const score = calculateTechnicalScore(rsi, macd.macd, macd.signal, currentPrice, sma50, sma200, obvScore, squeezeScore, temaScore);

  return { rsi, macd, bollinger, trend, score, pivots };
};