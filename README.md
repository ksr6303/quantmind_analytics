# QuantMind Analytics

**QuantMind Analytics** is a professional-grade, quantitative stock analysis dashboard built for traders and investors. It combines real-time data visualization, advanced technical indicators, and AI-driven insights into a single, privacy-focused web application.

![QuantMind Analytics Screenshot](https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1920&auto=format&fit=crop)

## 🚀 Key Features

### 1. Market Analysis Dashboard
*   **Interactive Charts:** View price history, volume, and trends for any stock (IND/US).
*   **AI Recommendations:** Get "Buy", "Sell", or "Hold" ratings with detailed reasoning powered by Google Gemini AI.
*   **Technical Score:** A proprietary 0-100 score based on 17+ technical indicators (RSI, MACD, Bollinger Bands, etc.).
*   **News Sentiment:** Real-time news analysis to gauge market sentiment (Bullish/Bearish).

### 2. Stock Scanner
*   **Smart Filtering:** Filter stocks by Sector, Price, Trend, or Strategy Score.
*   **Batch Analysis:** Instantly see the technical health of 400+ stocks at a glance.
*   **Export:** Download your scan results to CSV for offline analysis.

### 3. Strategy Stackathon (Backtester)
*   **Simulate Strategies:** Test trading models like "Golden Cross", "RSI Pullback", or "TTM Squeeze" against 10 years of historical data.
*   **Deep Dive Mode:** Analyze a single strategy's performance across *every possible threshold* (1-99) to find the perfect sensitivity.
*   **Compare:** Pit two strategies against each other to see which performs better.

### 4. Portfolio Tracker
*   **Privacy-First:** Your portfolio is stored **only on your device**. No data is sent to any server.
*   **Performance Tracking:** Track your P/L, total value, and daily changes.

### 5. Multi-Device Sync (Seed Data)
*   **Instant Load:** The app downloads a pre-built "Seed Database" from GitHub so you don't have to wait for data to fetch on your phone.
*   **Incremental Sync:** Updates only fetch the missing days, making refreshes lightning fast.

---

## 🛠️ Installation & Deployment

This app is designed to be hosted for free on **GitHub Pages**.

### Prerequisites
*   Node.js (v18 or higher)
*   A GitHub Account
*   A Google Gemini API Key (Free) - [Get one here](https://aistudio.google.com/app/apikey)

### 1. Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/YOUR_USERNAME/quantmind_analytics.git
cd quantmind_analytics
npm install
```

### 2. Add Your Custom Stocks (Optional)
Want to track a specific stock that isn't in the default list? Add it permanently:
```bash
# Example: Adding Zomato (India)
npm run add:stock ZOMATO.NS "Zomato Ltd" Technology IND

# Example: Adding Coinbase (US)
npm run add:stock COIN "Coinbase Global" Financial US
```

### 3. Generate Data (Daily Routine)
To ensure your phone/web app has the latest data instantly, run this script on your PC once a day. It fetches 10 years of history for all stocks and prepares it for upload.
```bash
npm run build:data
```

### 4. Deploy to GitHub
Push your code and the new data to the live website:
```bash
# 1. Save changes to git
git add .
git commit -m "Daily data update"
git push origin main

# 2. Build and Deploy
npm run deploy
```
*Note: You may need to enter your GitHub Personal Access Token (PAT) if asked for a password.*

---

## 📱 Using the App on Mobile

1.  **Open the URL:** Go to `https://YOUR_USERNAME.github.io/quantmind_analytics/`
2.  **Add API Key:**
    *   Go to the **Settings** tab.
    *   Paste your Gemini API Key.
    *   Click "Save Changes". (This is stored securely on your phone).
3.  **Sync Data:**
    *   Click the **Update Data** button in the sidebar.
    *   The app will download the "Seed Data" you generated on your PC, instantly populating your charts.

---

## 🧠 Strategy Models Included

The app evaluates stocks using these models:
*   **Golden Cross:** Trend following (SMA 50 > SMA 200).
*   **Smart RSI:** Buys dips (Oversold) only when the long-term trend is UP.
*   **TTM Squeeze:** Detects explosive volatility breakouts.
*   **Volume Breakout:** Finds price surges accompanied by massive volume.
*   **Stochastic Trend:** Momentum oscillator filtered by trend direction.
*   ...and 12 more!

---

## 🔒 Privacy & Security

*   **No Backend:** This is a 100% client-side application.
*   **Local Storage:** Your portfolio, API key, and custom settings live in your browser's memory (`localStorage` / `IndexedDB`).
*   **Open Source:** You control the code. No hidden trackers.

---

## ⚠️ Disclaimer
*This tool is for informational purposes only. Trading stocks involves risk. The AI and algorithmic recommendations are based on mathematical models and do not guarantee future results. Always do your own research.*