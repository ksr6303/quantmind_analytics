import { AnalysisResult, HistoricalPoint, StockData } from "../types";
import { analyzeTechnicalData } from "./indicators";
import { fetchAIAnalysis, initGemini } from "./gemini";
import { getStockData, saveStockData } from "./dataManager";
import { fetchStockHistory } from "./yahoo";
import { analyzeSentiment } from "./sentiment";

const PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

const fetchRealNews = async (symbol: string, market: 'IND' | 'US') => {
  const region = market === 'IND' ? 'IN' : 'US';
  const lang = market === 'IND' ? 'en-IN' : 'en-US';
  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=${region}&lang=${lang}`;
  
  for (const proxyGen of PROXIES) {
    try {
      const response = await fetch(proxyGen(rssUrl));
      if (!response.ok) continue;
      
      const data = await response.json();
      const text = data.contents ? data.contents : (typeof data === 'string' ? data : await response.text());
      
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);
      
      if (items.length === 0) continue;

      return items.map(item => {
        const title = item.querySelector("title")?.textContent || "No Title";
        const desc = item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 100) + "..." || "";
        return {
          title,
          source: "Yahoo Finance",
          published: new Date(item.querySelector("pubDate")?.textContent || "").toLocaleDateString(),
          summary: desc,
          sentiment: analyzeSentiment(title + " " + desc) 
        };
      });
    } catch (e) {
      console.warn("News fetch attempt failed", e);
    }
  }
  return [];
};

export const refetchFullHistory = async (ticker: string, market: 'IND' | 'US'): Promise<AnalysisResult> => {
  const symbol = ticker.toUpperCase();
  
  try {
    // 1. Fetch from Yahoo
    const history = await fetchStockHistory(symbol, { range: '10y' });
    
    // 2. SAFETY CHECK: Only proceed if we got a substantial amount of data.
    // A 10-year history should have ~2500 points. We require at least 100 
    // to avoid overwriting a good local DB with a partial/corrupted fetch.
    if (!history || history.length < 100) {
      throw new Error(`Incomplete data received (${history?.length || 0} points). Your existing local data has been preserved.`);
    }

    // 3. ATOMIC UPDATE: saveStockData uses IndexedDB put, which is atomic.
    // If it fails here, the catch block handles it and old data remains.
    await saveStockData(symbol, history);

    // 4. Return fresh analysis
    return await analyzeStock(symbol, market);
  } catch (e) {
    console.error("Full refetch failed, data preserved:", e);
    throw e;
  }
};

export const analyzeStock = async (ticker: string, market: 'IND' | 'US' = 'IND'): Promise<AnalysisResult> => {
  const symbol = ticker.toUpperCase();
  let history: HistoricalPoint[] = [];

  try {
    const localData = await getStockData(symbol);
    
    if (localData && localData.history.length > 0) {
       history = localData.history;
    } else {
       // Initial fetch if DB is empty
       history = await fetchStockHistory(symbol, { range: '10y' });
       // Only save if fetch was successful and contains data
       if (history && history.length > 0) {
         await saveStockData(symbol, history);
       }
    }
  } catch (e) {
    console.error("Data fetch failed", e);
    throw new Error(`Failed to fetch data for ${symbol}. Please use the Data Feed refresh button.`);
  }

  if (history.length === 0) {
     throw new Error(`No data available for ${symbol}. Please update via Data Feed.`);
  }

  const lastPoint = history[history.length - 1];
  const prevPoint = history[history.length - 2] || lastPoint;
  
  const price = lastPoint.price;
  const change = price - prevPoint.price;
  const changePercent = prevPoint.price !== 0 ? (change / prevPoint.price) * 100 : 0;
  
  const stockData: StockData = {
    symbol,
    price,
    change,
    changePercent,
    volume: lastPoint.volume,
    marketCap: "N/A", 
    currency: market === 'IND' ? "INR" : "USD", 
    lastUpdated: new Date(lastPoint.date).toLocaleDateString() 
  };

  const indicators = analyzeTechnicalData(history);
  const news = await fetchRealNews(symbol, market);
  const newsSummary = news.map((n: any) => n.title).join(". ");

  const recommendation = await fetchAIAnalysis(
    symbol, 
    stockData.price, 
    indicators, 
    newsSummary
  );

  return {
    stock: stockData,
    history,
    indicators,
    news: news as any,
    recommendation
  };
};