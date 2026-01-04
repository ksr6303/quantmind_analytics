import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../public/data/seed.json');
const STOCKS_FILE = path.join(__dirname, '../src/constants/stocks.ts');

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";
const PROXIES = ["https://corsproxy.io/?", "https://api.allorigins.win/raw?url="];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(symbol) {
    const url = `${BASE_URL}${symbol}?interval=1d&range=10y`;
    const encodedUrl = encodeURIComponent(url);
    
    for (const proxy of PROXIES) {
        try {
            const response = await fetch(`${proxy}${encodedUrl}`);
            if (!response.ok) continue;
            const data = await response.json();
            const result = data.chart.result?.[0];
            if (!result) continue;

            const timestamps = result.timestamp || [];
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
            continue;
        }
    }
    return null;
}

function extractSymbols() {
    const content = fs.readFileSync(STOCKS_FILE, 'utf8');
    // Regex to find symbols like { symbol: 'AAPL', ... }
    const regex = /symbol:\s*['"]([^'"]+)['"]/g;
    const symbols = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        symbols.push(match[1]);
    }
    return [...new Set(symbols)]; // Remove duplicates
}

async function main() {
    console.log("🚀 Starting Standalone Seed Data Generation...");
    
    const symbols = extractSymbols();
    console.log(`Found ${symbols.length} symbols in stocks.ts`);
    
    const database = {};
    let count = 0;

    for (const symbol of symbols) {
        count++;
        process.stdout.write(`[${count}/${symbols.length}] Fetching ${symbol.padEnd(12)}... `);
        
        const history = await fetchWithRetry(symbol);
        if (history) {
            database[symbol] = history;
            console.log("✅ OK");
        } else {
            console.log("❌ FAILED");
        }
        
        // Anti-throttle delay
        await wait(200);
    }

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database));
    console.log(`\n✅ Success! Seed data for ${Object.keys(database).length} stocks saved to ${OUTPUT_FILE}`);
    console.log("Next steps:");
    console.log("1. git add .");
    console.log("2. git commit -m 'Update seed data'");
    console.log("3. npm run deploy");
}

main().catch(console.error);