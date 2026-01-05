import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM_STOCKS_FILE = path.join(__dirname, '../src/constants/custom_stocks.json');

const STOCKS_FILE = path.join(__dirname, '../src/constants/stocks.ts');

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log("Usage: node scripts/add-stock.js <SYMBOL> <NAME> [SECTOR] [MARKET]");
    console.log("Examples:");
    console.log("  node scripts/add-stock.js ZOMATO.NS Zomato Technology IND");
    console.log("  node scripts/add-stock.js COIN Coinbase Financial US");
    process.exit(1);
}

const [symbol, name, sector = "Other", market = "IND"] = args;
const upperSymbol = symbol.toUpperCase();

// 1. Load existing custom stocks
let customStocks = [];
if (fs.existsSync(CUSTOM_STOCKS_FILE)) {
    customStocks = JSON.parse(fs.readFileSync(CUSTOM_STOCKS_FILE, 'utf8'));
}

// 2. Load built-in stocks
let builtInSymbols = new Set();
if (fs.existsSync(STOCKS_FILE)) {
    const content = fs.readFileSync(STOCKS_FILE, 'utf8');
    const regex = /symbol:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        builtInSymbols.add(match[1].toUpperCase());
    }
}

// 3. Check for duplicates in BOTH lists
if (customStocks.some(s => s.symbol.toUpperCase() === upperSymbol)) {
    console.log(`⚠️  ${upperSymbol} is already available (in Custom Stocks).`);
    process.exit(0);
}

if (builtInSymbols.has(upperSymbol)) {
    console.log(`⚠️  ${upperSymbol} is already available (in Built-in Stocks).`);
    process.exit(0);
}

// 4. Add new stock
const newStock = {
    symbol: upperSymbol,
    name,
    sector,
    market: market.toUpperCase() === 'US' ? 'US' : 'IND',
    category: 'Custom'
};

customStocks.push(newStock);

// 5. Save
fs.writeFileSync(CUSTOM_STOCKS_FILE, JSON.stringify(customStocks, null, 2));

console.log(`✅ Successfully added ${upperSymbol} (${name}) to permanent stock list.`);
console.log("Next steps:");
console.log("1. npm run build:data (to fetch history for this new stock)");
console.log("2. npm run deploy (to push to GitHub)");
