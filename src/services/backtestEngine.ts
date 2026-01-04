import { 
  calculateSMASeries, calculateRSISeries, calculateMACDSeries, 
  calculateTechnicalScore, calculateBollingerSeries, calculateStochasticSeries, 
  calculateCCISeries, calculateWilliamsRSeries, calculateVWMASeries, calculateADXSeries,
  calculateEMASeries, calculateSuperTrendSeries, calculatePSARSeries, calculateDonchianSeries,
  calculateKeltnerSeries, calculateForceIndexSeries, calculateIchimokuSeries,
  calculateAroonSeries, calculateCMFSeries, calculateUltimateOscillatorSeries,
  calculateOBVSeries, calculateTEMASeries, calculateSqueezeSeries
} from './indicators';
import { HistoricalPoint } from '../types';

export interface TradeLog {
  id: string;
  symbol: string;
  entryDate: string;
  exitDate: string | null;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
  balanceAfter: number;
}

export interface StrategyResult {
  equityCurve: { date: string; equity: number }[];
  finalBalance: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  trades: TradeLog[];
}

export const MODELS = [
  { id: 'master', name: 'Technical Score (Master)', defaultThreshold: 75, description: 'Aggregated score of 17 indicators' },
  { id: 'golden_cross', name: 'Golden Cross Trend', defaultThreshold: 60, description: 'Buy when SMA 50 > SMA 200 (Long Term Bull)' },
  { id: 'volume_breakout', name: 'Volume Breakout', defaultThreshold: 70, description: 'Buy when Price > 20d High AND Vol > 2x Avg' },
  { id: 'squeeze', name: 'TTM Squeeze', defaultThreshold: 70, description: 'Buy on Volatility Breakout (Squeeze Release)' },
  { id: 'obv', name: 'OBV Trend', defaultThreshold: 60, description: 'Buy when OBV > SMA(20)' },
  { id: 'tema', name: 'TEMA Crossover', defaultThreshold: 60, description: 'Buy when Short TEMA > Long TEMA' },
  { id: 'rsi', name: 'Smart RSI Pullback', defaultThreshold: 70, description: 'Buy when RSI < 30 & Price > SMA 200' },
  { id: 'bollinger', name: 'Bollinger Band Dip', defaultThreshold: 80, description: 'Buy when price touches lower band' },
  { id: 'stoch', name: 'Stochastic Trend', defaultThreshold: 80, description: 'Buy when %K < 20 & Price > SMA 200' },
  { id: 'adx', name: 'ADX Trend Strength', defaultThreshold: 70, description: 'Buy when Trend is Strong & Bullish' },
  { id: 'vwma', name: 'VWMA Trend', defaultThreshold: 60, description: 'Buy when Price > Volume Weighted MA' },
  { id: 'psar', name: 'Parabolic SAR', defaultThreshold: 70, description: 'Buy when Price > SAR' },
  { id: 'donchian', name: 'Donchian Breakout', defaultThreshold: 80, description: 'Buy on 20-day High Breakout' },
  { id: 'keltner', name: 'Keltner Channel', defaultThreshold: 70, description: 'Buy on Upper Channel Breakout' },
  { id: 'ichimoku', name: 'Ichimoku Cloud', defaultThreshold: 70, description: 'Buy when Price > Cloud & Tenkan > Kijun' },
  { id: 'aroon', name: 'Aroon Oscillator', defaultThreshold: 60, description: 'Buy when Aroon Up > Down' },
  { id: 'cmf', name: 'Chaikin Money Flow', defaultThreshold: 60, description: 'Buy when Accumulation > 0' },
  { id: 'ultimate', name: 'Ultimate Oscillator', defaultThreshold: 70, description: 'Buy when Oversold (Low Value)' },
];

const calculateModelScores = (type: string, prices: number[], highs: number[], lows: number[], volumes: number[]) => {
     const clamp = (val: number) => Math.max(0, Math.min(100, val));
     
     if (type === 'master') {
        const rsi = calculateRSISeries(prices, 14);
        const sma50 = calculateSMASeries(prices, 50);
        const sma200 = calculateSMASeries(prices, 200);
        const macdData = calculateMACDSeries(prices);
        
        // New Components
        const obv = calculateOBVSeries(prices, volumes);
        const obvSma = calculateSMASeries(obv, 20);
        
        const sqz = calculateSqueezeSeries(highs, lows, prices, 20);
        
        const tS = calculateTEMASeries(prices, 10);
        const tL = calculateTEMASeries(prices, 30);

        return prices.map((p, i) => {
           if (i < 50) return 0;
           
           const obvSc = obv[i] > obvSma[i] ? 75 : 25;
           
           let sqzSc = 50;
           if (!sqz.squeezeOn[i]) { if (sqz.momentum[i] > 0) sqzSc = 80; else sqzSc = 20; }
           
           const temaSc = tS[i] > tL[i] ? 85 : 15;

           return calculateTechnicalScore(rsi[i], macdData.macdLine[i], macdData.signalLine[i], p, sma50[i], sma200[i], obvSc, sqzSc, temaSc);
        });
     }
     
     // --- NEW MODELS ---
     if (type === 'squeeze') {
        const sqz = calculateSqueezeSeries(highs, lows, prices, 20);
        return sqz.momentum.map((mom, i) => {
           if (sqz.squeezeOn[i]) return 50; 
           if (mom > 0) return 80; 
           return 20; 
        });
     }
     if (type === 'obv') {
        const obv = calculateOBVSeries(prices, volumes);
        const obvSma = calculateSMASeries(obv, 20);
        return obv.map((val, i) => val > obvSma[i] ? 75 : 25);
     }
     if (type === 'tema') {
        const tS = calculateTEMASeries(prices, 10);
        const tL = calculateTEMASeries(prices, 30);
        return tS.map((s, i) => s > tL[i] ? 85 : 15);
     }
     if (type === 'golden_cross') {
        const sma50 = calculateSMASeries(prices, 50);
        const sma200 = calculateSMASeries(prices, 200);
        return prices.map((_, i) => (sma50[i] > sma200[i]) ? 85 : 15);
     }
     if (type === 'volume_breakout') {
        const don = calculateDonchianSeries(highs, lows, 20);
        const volSma = calculateSMASeries(volumes, 20);
        return prices.map((p, i) => {
           if (i < 20) return 50;
           // Breakout: Price > Prev High AND Vol > 2 * Avg Vol
           const breakout = p > don.upper[i-1];
           const volSurge = volumes[i] > (volSma[i] * 2);
           if (breakout && volSurge) return 90;
           return 40;
        });
     }
     
     // --- REFINED MODELS ---
     if (type === 'rsi') {
        const rsi = calculateRSISeries(prices, 14);
        const sma200 = calculateSMASeries(prices, 200);
        return rsi.map((val, i) => {
           // Filter: Only buy oversold if Trend is UP
           const trendUp = prices[i] > sma200[i];
           if (val < 30 && trendUp) return 85; // Strong Buy
           if (val < 30 && !trendUp) return 40; // Weak Buy (Counter-trend)
           
           // Standard scaling
           let s = 100 - val;
           return clamp(s);
        });
     }
     if (type === 'stoch') {
        const stoch = calculateStochasticSeries(highs, lows, prices);
        const sma200 = calculateSMASeries(prices, 200);
        return stoch.kLine.map((k, i) => {
           const trendUp = prices[i] > sma200[i];
           if (k < 20 && trendUp) return 85;
           if (k < 20 && !trendUp) return 40;
           return clamp(100 - k);
        });
     }

     if (type === 'bollinger') {
        const bb = calculateBollingerSeries(prices);
        return prices.map((p, i) => {
           if (i<20) return 50;
           const bw = bb.upper[i] - bb.lower[i];
           const pctB = (p - bb.lower[i]) / bw;
           return clamp((1 - pctB) * 100); 
        });
     }
     if (type === 'adx') {
        const adxData = calculateADXSeries(highs, lows, prices);
        return adxData.adx.map((val, i) => {
           const pDi = adxData.plusDI[i];
           const mDi = adxData.minusDI[i];
           let s = 50;
           const strength = Math.min(val, 50);
           if (pDi > mDi) s = 50 + strength; else s = 50 - strength;
           return clamp(s);
        });
     }
     if (type === 'vwma') {
        const vwma = calculateVWMASeries(prices, volumes);
        return prices.map((p, i) => {
           if (i<20) return 50;
           const diff = (p - vwma[i])/vwma[i];
           return clamp(50 + (diff * 100 * 5));
        });
     }
     if (type === 'psar') {
        const psar = calculatePSARSeries(highs, lows);
        return prices.map((p, i) => p > psar[i] ? 80 : 20);
     }
     if (type === 'donchian') {
        const don = calculateDonchianSeries(highs, lows);
        return prices.map((p, i) => {
           if (i < 20) return 50;
           const upper = don.upper[i-1];
           const lower = don.lower[i-1];
           if (p > upper) return 90;
           if (p < lower) return 10;
           return 50;
        });
     }
     if (type === 'keltner') {
        const kel = calculateKeltnerSeries(highs, lows, prices);
        return prices.map((p, i) => {
           if (i<20) return 50;
           if (p > kel.upper[i]) return 80;
           if (p < kel.lower[i]) return 20;
           return 50;
        });
     }
     if (type === 'ichimoku') {
        const ichi = calculateIchimokuSeries(highs, lows);
        return prices.map((p, i) => {
           if (i<26) return 50;
           const t = ichi.tenkan[i];
           const k = ichi.kijun[i];
           if (p > t && t > k) return 80;
           if (p < t && t < k) return 20;
           return 50;
        });
     }
     if (type === 'aroon') {
        const aroon = calculateAroonSeries(highs, lows);
        return aroon.aroonOsc.map(osc => clamp(50 + (osc/2)));
     }
     if (type === 'cmf') {
        const cmf = calculateCMFSeries(highs, lows, prices, volumes);
        return cmf.map(v => clamp(50 + (v * 100)));
     }
     if (type === 'ultimate') {
        const ult = calculateUltimateOscillatorSeries(highs, lows, prices);
        return ult.map(u => clamp(100 - u));
     }

     return new Array(prices.length).fill(50);
};

export const simulateStrategy = (
     universe: any[], 
     dates: string[], 
     modelId: string, 
     threshold: number,
     initialCapital: number = 100000,
     maxTrades: number = 5,
     stopLoss: number = 5,
     targetProfit: number = 10,
     commission: number = 0.1
  ): StrategyResult => {
     let cash = initialCapital;
     const openTrades: TradeLog[] = [];
     const closedTrades: TradeLog[] = [];
     const equityCurve = [];
     let peakEquity = initialCapital;
     let maxDrawdown = 0;
     const stockPointers = new Array(universe.length).fill(0);

     universe.forEach(u => {
        if (!u.modelScores) u.modelScores = {};
        if (!u.modelScores[modelId]) {
            u.modelScores[modelId] = calculateModelScores(modelId, u.prices, u.highs, u.lows, u.volumes);
        }
     });

     for (const date of dates) {
        const dailyCandidates: { idx: number, score: number }[] = [];

        for (let uIdx = 0; uIdx < universe.length; uIdx++) {
           const stock = universe[uIdx];
           let p = stockPointers[uIdx];
           while (p < stock.history.length && stock.history[p].date < date) p++;
           stockPointers[uIdx] = p;

           if (p < stock.history.length && stock.history[p].date === date) {
              dailyCandidates.push({ idx: uIdx, score: stock.modelScores[modelId][p] });
           }
        }

        // 1. Manage Open Trades (Exits)
        for (let i = openTrades.length - 1; i >= 0; i--) {
           const trade = openTrades[i];
           const uIdx = universe.findIndex((u: any) => u.symbol === trade.symbol);
           const ptr = stockPointers[uIdx];
           const candle = universe[uIdx].history[ptr];
           
           if (!candle || candle.date !== date) continue;

           const currentPrice = candle.price;
           const high = candle.high || currentPrice;
           const low = candle.low || currentPrice;

           const stopPrice = trade.entryPrice * (1 - stopLoss / 100);
           const targetPrice = trade.entryPrice * (1 + targetProfit / 100);

           let exitPrice = 0;
           let reason = '';

           // Check Low for Stop, High for Target
           if (low <= stopPrice) { exitPrice = stopPrice; reason = 'STOP_LOSS'; }
           else if (high >= targetPrice) { exitPrice = targetPrice; reason = 'TARGET'; }

           if (exitPrice > 0) {
              const proceed = exitPrice * trade.qty;
              const fee = proceed * (commission / 100);
              const netProceed = proceed - fee;
              const pnl = netProceed - (trade.entryPrice * trade.qty); // Entry commission already deducted from cash
              
              trade.exitDate = date;
              trade.exitPrice = exitPrice;
              trade.pnl = pnl;
              trade.pnlPercent = (pnl / (trade.entryPrice * trade.qty)) * 100;
              trade.reason = reason;
              
              cash += netProceed;
              closedTrades.push(trade);
              openTrades.splice(i, 1);
           }
        }

        // 2. Manage Entries
        if (openTrades.length < maxTrades) {
           const buyable = dailyCandidates.filter(c => 
              c.score >= threshold && 
              !openTrades.find(t => t.symbol === universe[c.idx].symbol)
           );
           buyable.sort((a, b) => b.score - a.score);

           for (const candidate of buyable) {
              if (openTrades.length >= maxTrades) break;
              if (cash <= 0) break;

              const stock = universe[candidate.idx];
              const ptr = stockPointers[candidate.idx];
              const price = stock.history[ptr].price;
              
              const slotsLeft = maxTrades - openTrades.length;
              const allocAmt = cash / slotsLeft;
              const qty = Math.floor(allocAmt / price);
              const cost = qty * price;
              const fee = cost * (commission / 100);
              
              if (qty > 0 && cash >= (cost + fee)) {
                 cash -= (cost + fee);
                 openTrades.push({
                    id: `${stock.symbol}-${date}-${modelId}`,
                    symbol: stock.symbol,
                    entryDate: date,
                    exitDate: null,
                    entryPrice: price,
                    exitPrice: 0,
                    qty: qty,
                    pnl: 0,
                    pnlPercent: 0,
                    reason: 'OPEN',
                    balanceAfter: 0
                 });
              }
           }
        }

        // 3. Mark to Market Equity
        let openEquity = 0;
        openTrades.forEach(t => {
           const uIdx = universe.findIndex((u: any) => u.symbol === t.symbol);
           const ptr = stockPointers[uIdx];
           const curPrice = (universe[uIdx].history[ptr] && universe[uIdx].history[ptr].date === date) 
              ? universe[uIdx].history[ptr].price : t.entryPrice;
           openEquity += curPrice * t.qty;
        });

        const totalEquity = cash + openEquity;
        equityCurve.push({ date, equity: totalEquity });

        if (totalEquity > peakEquity) peakEquity = totalEquity;
        const dd = (peakEquity - totalEquity) / peakEquity;
        if (dd > maxDrawdown) maxDrawdown = dd;
     }

     const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
     
     // Metrics
     const wins = closedTrades.filter(t => t.pnl > 0).length;
     const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
     
     const totalWinVal = closedTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
     const totalLossVal = closedTrades.filter(t => t.pnl <= 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0);
     const profitFactor = totalLossVal > 0 ? totalWinVal / totalLossVal : totalWinVal > 0 ? 99 : 0;

     // Sharpe
     const returns = [];
     for(let i=1; i<equityCurve.length; i++) {
         const r = (equityCurve[i].equity - equityCurve[i-1].equity) / equityCurve[i-1].equity;
         returns.push(r);
     }
     const meanReturn = returns.length > 0 ? returns.reduce((a,b)=>a+b,0) / returns.length : 0;
     const stdDev = returns.length > 0 ? Math.sqrt(returns.reduce((a,b) => a + Math.pow(b-meanReturn, 2), 0) / returns.length) : 0;
     const sharpeRatio = stdDev !== 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

     return {
        equityCurve,
        finalBalance: finalEquity,
        totalReturnPercent: ((finalEquity - initialCapital) / initialCapital) * 100,
        maxDrawdown: maxDrawdown * 100,
        winRate,
        profitFactor,
        sharpeRatio,
        trades: [...closedTrades, ...openTrades].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
     };
  };