import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../public/data');
const STOCKS_FILE = path.join(__dirname, '../src/constants/stocks.ts');

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

// REMOVED PROXIES - Fetching Directly from Node.js
const BATCH_SIZE = 20; // Increased concurrency for direct fetching
const STOCKS_PER_FILE = 100; 
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchDirect(url) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json"
    };
    
    // Simple retry logic
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, { headers, signal: controller.signal });
            clearTimeout(id);
            
            if (!response.ok) {
                if (response.status === 404) return null; // Stock not found
                if (response.status === 429) {
                    await wait(2000 * (attempt + 1)); // Rate limit backoff
                    throw new Error("Rate Limited");
                }
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            if (attempt === 2) throw e;
            await wait(1000);
        }
    }
}

async function fetchHistory(symbol, lastDate = null) {
    let url = `${BASE_URL}${symbol}?interval=1d`;
    if (lastDate) {
        const p1 = Math.floor(new Date(lastDate).getTime() / 1000) + 86400; 
        const p2 = Math.floor(Date.now() / 1000);
        if (p1 >= p2 - 3600) return []; 
        url += `&period1=${p1}&period2=${p2}`;
    } else {
        url += `&range=10y`;
    }

    try {
        const data = await fetchDirect(url);
        if (!data) return null;
        
        const result = data.chart?.result?.[0];
        if (!result || !result.timestamp) return [];
        
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        return timestamps.map((ts, i) => {
            if (quotes.close[i] === null) return null;
            return {
                date: new Date(ts * 1000).toISOString().split('T')[0],
                price: quotes.close[i],
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                volume: quotes.volume[i],
            };
        }).filter(item => item !== null);
    } catch (e) {
        // console.warn(`Failed to fetch ${symbol}: ${e.message}`);
        return null;
    }
}

function extractSymbols() {
    const content = fs.readFileSync(STOCKS_FILE, 'utf8');
    const regex = /symbol:\s*['"]([^'"]+)['"]/g;
    const symbols = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        symbols.push(match[1]);
    }

    // Also load from custom_stocks.json
    const customPath = path.join(__dirname, '../src/constants/custom_stocks.json');
    if (fs.existsSync(customPath)) {
        try {
            const customData = JSON.parse(fs.readFileSync(customPath, 'utf8'));
            customData.forEach(s => symbols.push(s.symbol));
        } catch (e) {
            console.warn("Could not read custom_stocks.json");
        }
    }

    return [...new Set(symbols)];
}

function loadAllExistingData() {
    let combined = {};
    if (!fs.existsSync(DATA_DIR)) return combined;
    const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('seed_') && f.endsWith('.json'));
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
            Object.assign(combined, data);
        } catch (e) {}
    }
    return combined;
}

async function main() {
    console.log("🚀 Starting Multi-File Seed Generation...");
    const symbols = extractSymbols();
    const existingData = loadAllExistingData();
    const finalDatabase = { ...existingData };
    
    let totalNewPoints = 0;
    let failedCount = 0;

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);
        process.stdout.write(`[${i + batch.length}/${symbols.length}] Syncing ${batch.length} stocks... `);

        const results = await Promise.all(batch.map(async (symbol) => {
            const history = existingData[symbol] || [];
            const lastDate = history.length > 0 ? history[history.length - 1].date : null;
            const newData = await fetchHistory(symbol, lastDate);
            return { symbol, newData, existingHistory: history };
        }));

        let batchNew = 0;
        for (const { symbol, newData, existingHistory } of results) {
            if (newData === null) { failedCount++; continue; }
            if (newData.length > 0) {
                const dateMap = new Map();
                existingHistory.forEach(p => dateMap.set(p.date, p));
                newData.forEach(p => dateMap.set(p.date, p));
                finalDatabase[symbol] = Array.from(dateMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                batchNew += newData.length;
                totalNewPoints += newData.length;
            }
        }
        process.stdout.write(`Done (+${batchNew})\n`);
        await wait(1000);
    }

    // --- Splitting Logic ---
    console.log("\n📦 Splitting into multiple files...");
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    // Clean old files first
    fs.readdirSync(DATA_DIR).filter(f => f.startsWith('seed_')).forEach(f => fs.unlinkSync(path.join(DATA_DIR, f)));

    const allSymbols = Object.keys(finalDatabase).sort();
    let fileIndex = 1;
    for (let i = 0; i < allSymbols.length; i += STOCKS_PER_FILE) {
        const slice = allSymbols.slice(i, i + STOCKS_PER_FILE);
        const chunk = {};
        slice.forEach(sym => chunk[sym] = finalDatabase[sym]);
        
        const fileName = `seed_${fileIndex}.json`;
        fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(chunk));
        console.log(`   ✅ Saved ${fileName} (${slice.length} stocks)`);
        fileIndex++;
    }

    console.log(`\n✅ Success! Total Stocks: ${allSymbols.length}, Files: ${fileIndex - 1}`);
}

main().catch(console.error);
