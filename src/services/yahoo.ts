import { HistoricalPoint } from '../types';

const PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url="
];

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

interface FetchOptions {
  range?: string;
  startDate?: Date;
  endDate?: Date;
  signal?: AbortSignal; // Added signal support
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  let lastError: any;

  for (const proxy of PROXIES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Pass the abort signal to the fetch call
        const response = await fetch(`${proxy}${encodedUrl}`, { signal: options.signal });
        
        if (!response.ok) {
           if (response.status === 429) await wait(1000 * (attempt + 1));
           throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const result = data.chart.result?.[0];
        
        if (!result) throw new Error('No data found in response');

        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0];
        
        const history: HistoricalPoint[] = timestamps.map((ts: number, i: number) => {
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

        if (history.length > 0) return history;

      } catch (error: any) {
        if (error.name === 'AbortError') throw error; // Re-throw to be caught by manager
        console.warn(`Fetch failed for ${symbol} using ${proxy} (Attempt ${attempt + 1}):`, error);
        lastError = error;
        await wait(500);
      }
    }
  }

  throw lastError || new Error("All proxies failed");
};