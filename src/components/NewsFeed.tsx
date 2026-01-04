import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Globe, Cpu, Coins, Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { analyzeSentiment, calculateAggregateSentiment } from '../services/sentiment';
import { cn } from '../lib/utils';

interface NewsArticle {
  title: string;
  source: string;
  published: string;
  summary: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  url: string;
  category: string;
}

const SOURCES = [
  { id: 'yahoo', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
  { id: 'cnbc', name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664' },
  { id: 'moneycontrol', name: 'Moneycontrol', url: 'https://www.moneycontrol.com/rss/MCtopnews.xml' },
  { id: 'bloomberg', name: 'Bloomberg', url: 'https://news.google.com/rss/search?q=site:bloomberg.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en' }
];

const PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

export const NewsFeed: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState('all');

  const fetchRSS = async (source: { name: string, url: string }) => {
    for (const proxyGen of PROXIES) {
      try {
        const response = await fetch(proxyGen(source.url));
        if (!response.ok) continue;
        
        const data = await response.json();
        const text = data.contents ? data.contents : (typeof data === 'string' ? data : await response.text());
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).slice(0, 6);

        return items.map(item => {
          const title = item.querySelector("title")?.textContent || "No Title";
          const desc = item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 120) + "..." || "";
          
          return {
            title,
            source: source.name,
            published: new Date(item.querySelector("pubDate")?.textContent || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            summary: desc,
            sentiment: analyzeSentiment(title + " " + desc),
            url: item.querySelector("link")?.textContent || "#",
            category: "General"
          };
        });
      } catch (e) {
        // Try next proxy
      }
    }
    return [];
  };

  const fetchNews = async () => {
    setLoading(true);
    setArticles([]);
    
    try {
      let news: NewsArticle[] = [];
      const sourcesToFetch = activeSource === 'all' ? SOURCES : SOURCES.filter(s => s.id === activeSource);

      const results = await Promise.all(sourcesToFetch.map(s => fetchRSS(s)));
      news = results.flat();
      news = news.sort(() => Math.random() - 0.5);

      setArticles(news);
    } catch (e) {
      console.error("News fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeSource]);

  // Aggregate Sentiment Calculation
  const marketScore = calculateAggregateSentiment(articles);
  
  const getSentimentLabel = (score: number) => {
    if (score >= 60) return { label: 'Bullish', color: 'text-emerald-400', icon: TrendingUp };
    if (score <= 40) return { label: 'Bearish', color: 'text-rose-400', icon: TrendingDown };
    return { label: 'Neutral', color: 'text-yellow-400', icon: Minus };
  };

  const sentiment = getSentimentLabel(marketScore);
  const SentimentIcon = sentiment.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Global Market News</h1>
          <p className="text-slate-400 mt-1">Aggregated insights from top financial sources</p>
        </div>
        
        {/* Market Sentiment Badge */}
        {!loading && articles.length > 0 && (
           <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg">
              <div className="flex flex-col items-end">
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Market Sentiment</span>
                 <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold", sentiment.color)}>{sentiment.label}</span>
                    <SentimentIcon className={cn("w-5 h-5", sentiment.color)} />
                 </div>
              </div>
              <div className="h-10 w-px bg-slate-800 mx-1"></div>
              <div className="flex flex-col">
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Score</span>
                 <div className="flex items-center gap-1">
                    <Gauge className="w-4 h-4 text-slate-600" />
                    <span className="text-lg font-mono text-white">{marketScore}</span>
                 </div>
              </div>
           </div>
        )}
      </div>

      <div className="flex items-center gap-4">
         <button 
           onClick={fetchNews}
           className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
           title="Refresh News"
         >
           <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
         </button>

         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveSource('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeSource === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All Sources
            </button>
            {SOURCES.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSource(s.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSource === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
         </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
           ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {articles.map((news, idx) => (
             <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-indigo-500/50 transition-colors group flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-bold text-slate-200 bg-slate-800 px-2 py-1 rounded">{news.source}</span>
                      <span>{news.published}</span>
                   </div>
                   <span className={cn(
                      "text-[10px] px-2 py-1 rounded border",
                      news.sentiment === 'Positive' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      news.sentiment === 'Negative' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                      "bg-slate-800 text-slate-400 border-slate-700"
                   )}>{news.sentiment}</span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                  <a href={news.url} target="_blank" rel="noopener noreferrer">{news.title}</a>
                </h3>
                
                <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-1">
                  {news.summary}
                </p>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                   <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
                     Read Full Article <ExternalLink className="w-3 h-3" />
                   </a>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
           <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-20" />
           <p>Unable to fetch news at this moment.</p>
           <button onClick={fetchNews} className="mt-4 text-indigo-400 hover:text-white underline">Try Again</button>
        </div>
      )}
    </div>
  );
};
