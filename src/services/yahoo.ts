import { HistoricalPoint } from '../types';

const PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://thingproxy.freeboard.io/fetch/",
  "https://cors-anywhere.herokuapp.com/", // Often rate limited but good backup
];

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

interface FetchOptions {
  range?: string;
  startDate?: Date;
  endDate?: Date;
  signal?: AbortSignal;
}

// Helper to race promises
const raceProxies = async (encodedUrl: string, signal?: AbortSignal): Promise<any> => {
  const fetchWithProxy = async (proxy: string) => {
    try {
      const response = await fetch(`${proxy}${encodedUrl}`, { signal });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.json();
    } catch (e) {
      throw e;
    }
  };

  // Launch requests to ALL proxies at the same time
  // The first one to succeed wins.
  try {
    return await Promise.any(PROXIES.map(p => fetchWithProxy(p)));
  } catch (e) {
    throw new Error("All proxies failed");
  }
};

export const fetchStockHistory = async (symbol: string, options: FetchOptions = {}): Promise<HistoricalPoint[]> => {
  let url = `${BASE_URL}${symbol}?interval=1d`;
  
  if (options.startDate) {
     const p1 = Math.floor(options.startDate.getTime() / 1000);
     const p2 = options.endDate ? Math.floor(options.endDate.getTime() / 1000) : Math.floor(Date.now() / 1000);
     url += `&period1=${p1}&period2=${p2}`;
  } else {
     url += `&range=${options.range || '2y'}`;
  }

  const encodedUrl = encodeURIComponent(url);

  try {
    const data = await raceProxies(encodedUrl, options.signal);
    const result = data.chart.result?.[0];
    
    if (!result) throw new Error('No data found');

    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];
    
    return timestamps.map((ts: number, i: number) => {
      if (quotes.close[i] === null) return null;
      return {
        date: new Date(ts * 1000).toISOString().split('T')[0],
        price: quotes.close[i],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        volume: quotes.volume[i],
      };
    }).filter((item: any) => item !== null);

  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    // console.warn(`Failed to fetch ${symbol}`); // Silence logs for performance
    return [];
  }
};