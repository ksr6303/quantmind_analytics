import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM_STOCKS_FILE = path.join(__dirname, '../src/constants/custom_stocks.json');

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log("Usage: node scripts/add-stock.js <SYMBOL> <NAME> [SECTOR] [MARKET]");
    console.log("Examples:");
    console.log("  node scripts/add-stock.js ZOMATO.NS Zomato Technology IND");
    console.log("  node scripts/add-stock.js COIN Coinbase Financial US");
    process.exit(1);
}

const [symbol, name, sector = "Other", market = "IND"] = args;

// 1. Load existing custom stocks
let customStocks = [];
if (fs.existsSync(CUSTOM_STOCKS_FILE)) {
    customStocks = JSON.parse(fs.readFileSync(CUSTOM_STOCKS_FILE, 'utf8'));
}

// 2. Check for duplicates
if (customStocks.some(s => s.symbol.toUpperCase() === symbol.toUpperCase())) {
    console.error(`❌ Error: Stock ${symbol} already exists in custom_stocks.json`);
    process.exit(1);
}

// 3. Add new stock
const newStock = {
    symbol: symbol.toUpperCase(),
    name,
    sector,
    market: market.toUpperCase() === 'US' ? 'US' : 'IND',
    category: 'Custom'
};

customStocks.push(newStock);

// 4. Save
fs.writeFileSync(CUSTOM_STOCKS_FILE, JSON.stringify(customStocks, null, 2));

console.log(`✅ Successfully added ${symbol} (${name}) to permanent stock list.`);
console.log("Next steps:");
console.log("1. npm run build:data (to fetch history for this new stock)");
console.log("2. npm run deploy (to push to GitHub)");
