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
  const allData = await getAllStocksData();
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
        const lastDate = new Date(history[history.length - 1].date);
        lastDate.setHours(0,0,0,0);
        if (lastDate.getTime() < todayMidnight.getTime()) {
           pendingUpdates.push({ symbol: stock.symbol, history });
        } else {
           successCount++;
           processedCount++;
        }
     }
  });

  const BATCH_SIZE = 8;
  for (let i = 0; i < pendingUpdates.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = pendingUpdates.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(item => {
      const report = (status: string) => {
         onProgress(processedCount, total, item.symbol, status);
      };
      
      return fetchAndUpdateStock({ symbol: item.symbol }, item.history, report, signal).then(success => {
        if (success) successCount++; else if (!signal?.aborted) failCount++;
        processedCount++;
      });
    });

    await Promise.all(promises);
    if (signal?.aborted) break;
    await new Promise(r => setTimeout(r, 200)); 
  }
  
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

  const BATCH_SIZE = 5; // Smaller batch for forced operations to be safe
  
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = symbols.slice(i, i + BATCH_SIZE);
    const promises = batch.map(symbol => {
      const report = (status: string) => {
         onProgress(processedCount, total, symbol, status);
      };
      
      // If fullReload is true, pass [] as history to force 10y fetch
      // If fullReload is false, pass existing history (or [] if none) to sync
      const history = fullReload ? [] : (dataMap.get(symbol) || []);
      
      return fetchAndUpdateStock({ symbol }, history, report, signal).then(success => {
        if (success) successCount++; else if (!signal?.aborted) failCount++;
        processedCount++;
      });
    });

    await Promise.all(promises);
    if (signal?.aborted) break;
    await new Promise(r => setTimeout(r, 200)); 
  }
  
  return { successCount, failCount };
};
