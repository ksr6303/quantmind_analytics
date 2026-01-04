import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, '../public/data/seed.json');
const DATA_DIR = path.join(__dirname, '../public/data');
const STOCKS_PER_FILE = 100;

async function splitData() {
    console.log("📂 Loading massive seed.json (this may take a few seconds)...");
    
    if (!fs.existsSync(SEED_FILE)) {
        console.error("❌ Error: public/data/seed.json not found.");
        return;
    }

    const rawData = fs.readFileSync(SEED_FILE, 'utf8');
    const fullDatabase = JSON.parse(rawData);
    const allSymbols = Object.keys(fullDatabase).sort();
    
    console.log(`📊 Found ${allSymbols.length} stocks in database.`);

    let fileIndex = 1;
    for (let i = 0; i < allSymbols.length; i += STOCKS_PER_FILE) {
        const slice = allSymbols.slice(i, i + STOCKS_PER_FILE);
        const chunk = {};
        slice.forEach(sym => chunk[sym] = fullDatabase[sym]);
        
        const fileName = `seed_${fileIndex}.json`;
        fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(chunk));
        console.log(`   ✅ Created ${fileName} (${slice.length} stocks)`);
        fileIndex++;
    }

    console.log(`
🎉 Successfully split into ${fileIndex - 1} files.`);
    console.log("🗑️ You can now safely delete public/data/seed.json");
}

splitData().catch(console.error);
