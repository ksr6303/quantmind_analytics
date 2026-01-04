export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
  currency: string;
  lastUpdated: string;
}

export interface HistoricalPoint {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
  // Indicators
  sma20?: number;
  sma50?: number;
  sma200?: number;
  upperBand?: number;
  lowerBand?: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  score?: number;
  pivots?: { p: number, r1: number, s1: number, r2: number, s2: number, r3: number, s3: number };
}

export interface NewsItem {
  title: string;
  source: string;
  published: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  summary: string;
}

export interface Recommendation {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  targetPrice: number;
  stopLoss: number;
}

export interface AnalysisResult {
  stock: StockData;
  history: HistoricalPoint[];
  indicators: TechnicalIndicators;
  news: NewsItem[];
  recommendation: Recommendation;
}
