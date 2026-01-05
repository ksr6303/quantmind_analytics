import { fetchStockHistory } from './yahoo';
import { HistoricalPoint } from '../types';

const DB_NAME = 'QuantMindDB';
const STORE_NAME = 'stock_history';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
      }
    };
  });
};

export const saveStockData = async (symbol: string, history: HistoricalPoint[]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ symbol, history, lastUpdated: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getStockData = async (symbol: string): Promise<{ history: HistoricalPoint[], lastUpdated: number } | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(symbol);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const getAllStocksData = async (): Promise<any[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const bootstrapFromSeed = async (onProgress: (status: string) => void): Promise<boolean> => {
    try {
        let fileIndex = 1;
        let totalImported = 0;
        let hasMore = true;
        const baseUrl = import.meta.env.BASE_URL; // e.g., "/quantmind_analytics/" or "/"

        while (hasMore) {
            onProgress(`Downloading part ${fileIndex}...`);
            // Remove trailing slash from base if present to avoid double slash
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const url = `${cleanBase}/data/seed_${fileIndex}.json`;
            
            console.log(`[Bootstrap] Attempting to fetch: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`[Bootstrap] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
                hasMore = false;
                break;
            }
            
            const data = await response.json();
            const symbols = Object.keys(data);
            
            if (symbols.length === 0) {
                hasMore = false;
                break;
            }

            onProgress(`Importing part ${fileIndex} (${symbols.length} stocks)...`);
            console.log(`[Bootstrap] Importing ${symbols.length} stocks from part ${fileIndex}`);
            
            for (const symbol of symbols) {
                await saveStockData(symbol, data[symbol]);
            }
            
            totalImported += symbols.length;
            fileIndex++;
        }

        return totalImported > 0;
    } catch (e) {
        console.warn("Bootstrap finished or interrupted:", e);
        return false;
    }
};

// Helper to fetch and update a single stock with signal awareness
const fetchAndUpdateStock = async (
  stock: { symbol: string }, 
  existingHistory: HistoricalPoint[], 
  onStatus: (status: string) => void,
  signal?: AbortSignal
): Promise<boolean> => {
  try {
    let newData: HistoricalPoint[] = [];
    let finalHistory: HistoricalPoint[] = [];
    let didFetch = false;

    if (!existingHistory || existingHistory.length === 0) {
      onStatus('Initializing (10y)...');
      newData = await fetchStockHistory(stock.symbol, { range: '10y', signal });
      finalHistory = newData;
      didFetch = true;
    } else {
      const lastPoint = existingHistory[existingHistory.length - 1];
      const lastDate = new Date(lastPoint.date);
      onStatus('Syncing...');
      newData = await fetchStockHistory(stock.symbol, { startDate: lastDate, signal });
      
      const dateMap = new Map<string, HistoricalPoint>();
      existingHistory.forEach(p => dateMap.set(p.date, p));
      newData.forEach(p => dateMap.set(p.date, p)); 
      
      finalHistory = Array.from(dateMap.values()).sort((a, b) => 
         new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      didFetch = true;
    }

    // FINAL SAFETY CHECK: Ensure we didn't stop while processing
    if (signal?.aborted) return false;

    if (finalHistory.length > 0) {
       if (didFetch) await saveStockData(stock.symbol, finalHistory);
       return true;
    }
    return false;
  } catch (e: any) {
    if (e.name === 'AbortError') return false;
    console.error(`Failed to update ${stock.symbol}`, e);
    return false;
  }
};

export const updateAllStocks = async (
  stocks: { symbol: string }[], 
  onProgress: (current: number, total: number, symbol: string, status: string) => void,
  signal?: AbortSignal
) => {
  const total = stocks.length;
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;

  onProgress(0, total, 'System', 'Checking Local Database...');
  let allData = await getAllStocksData();
  
  // If DB is totally empty, try to bootstrap from GitHub seed.json
  if (allData.length === 0) {
      const success = await bootstrapFromSeed((msg) => onProgress(0, total, 'Bootstrap', msg));
      if (success) {
          allData = await getAllStocksData(); // Reload data after bootstrap
      }
  }

  const dataMap = new Map<string, HistoricalPoint[]>();
  allData.forEach(d => dataMap.set(d.symbol, d.history));

  if (signal?.aborted) return { successCount: 0, failCount: 0 };

  const todayMidnight = new Date();
  todayMidnight.setHours(0,0,0,0);

  const pendingUpdates: { symbol: string, history: HistoricalPoint[] }[] = [];

  stocks.forEach(stock => {
     const history = dataMap.get(stock.symbol) || [];
     if (history.length === 0) {
        pendingUpdates.push({ symbol: stock.symbol, history: [] });
     } else {
        const lastPoint = history[history.length - 1];
        const lastDate = new Date(lastPoint.date);
        lastDate.setHours(0,0,0,0);
        
        // Simple logic: If last date is older than today midnight, update it.
        // This covers weekends (Friday data < Saturday midnight)
        if (lastDate.getTime() < todayMidnight.getTime()) {
           pendingUpdates.push({ symbol: stock.symbol, history });
        } else {
           successCount++;
           processedCount++;
        }
     }
  });

  // OPTIMIZED: Sliding Window / Concurrency Pool
  // Instead of waiting for a batch of 20 to ALL finish, we keep 12 requests active at all times.
  const CONCURRENCY_LIMIT = 12;
  const queue = [...pendingUpdates];
  
  const worker = async () => {
      while (queue.length > 0) {
          if (signal?.aborted) return;
          const item = queue.shift();
          if (!item) break;

          onProgress(processedCount, total, item.symbol, "Syncing...");
          
          try {
              const success = await fetchAndUpdateStock({ symbol: item.symbol }, item.history, () => {}, signal);
              if (success) successCount++; 
              else if (!signal?.aborted) failCount++;
          } catch (e) {
              if (!signal?.aborted) failCount++;
          }
          
          processedCount++;
          // Small yield to keep UI responsive
          await new Promise(r => setTimeout(r, 10));
      }
  };

  const workers = Array(Math.min(CONCURRENCY_LIMIT, queue.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  
  if (signal?.aborted) {
     onProgress(total, total, 'Stopped', `Partial: ${successCount} OK`);
  } else {
     onProgress(total, total, 'Complete', `Success: ${successCount}, Failed: ${failCount}`);
  }
  
  return { successCount, failCount };
};

export const forceReloadStocks = async (
  symbols: string[],
  fullReload: boolean,
  onProgress: (current: number, total: number, symbol: string, status: string) => void,
  signal?: AbortSignal
) => {
  const total = symbols.length;
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;

  let dataMap = new Map<string, HistoricalPoint[]>();
  
  if (!fullReload) {
      onProgress(0, total, 'System', 'Reading Local DB...');
      const allData = await getAllStocksData();
      allData.forEach(d => dataMap.set(d.symbol, d.history));
  }

  // OPTIMIZED: Sliding Window / Concurrency Pool for Force Reload
  const CONCURRENCY_LIMIT = 12;
  const queue = [...symbols];
  
  const worker = async () => {
      while (queue.length > 0) {
          if (signal?.aborted) return;
          const symbol = queue.shift();
          if (!symbol) break;

          onProgress(processedCount, total, symbol, fullReload ? "Overwriting..." : "Syncing...");
          
          try {
              const history = fullReload ? [] : (dataMap.get(symbol) || []);
              const success = await fetchAndUpdateStock({ symbol }, history, () => {}, signal);
              if (success) successCount++; 
              else if (!signal?.aborted) failCount++;
          } catch (e) {
              if (!signal?.aborted) failCount++;
          }
          
          processedCount++;
          // Tiny yield
          await new Promise(r => setTimeout(r, 10));
      }
  };

  const workers = Array(Math.min(CONCURRENCY_LIMIT, queue.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  
  return { successCount, failCount };
};
