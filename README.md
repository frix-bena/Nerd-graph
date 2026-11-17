# Apex Vision AI — Institutional SMC Financial Chart Analysis & MT5 Signal Copilot

**Apex Vision AI** is an AI-powered financial chart analysis engine and automated signal copilot built for institutional and retail traders. It enables users to upload or paste financial chart screenshots (Forex, Crypto, Gold, Indices), receive instant technical analysis grounded in **Smart Money Concepts (SMC)**, view exact trade setups (Entry, Stop Loss, TP1, TP2, RRR), and auto-execute trades on MetaTrader 4 and 5 via a high-speed webhook bridge and MQL5 Expert Advisor.

---

## 🎨 Luxury Dark-Theme Design System
Apex Vision AI is styled strictly according to an institutional luxury palette:
- **Primary Background:** Deep Matte Black (`#0B0B0B`)
- **Card & Section Containers:** Dark Chocolate Brown (`#2A1810` / `#1E120C`) with subtle 1px Warm Amber Gold borders (`#D4A373` at 20% opacity)
- **Primary Text:** Warm Off-White (`#F5EBE6`)
- **Secondary Text / Labels:** Muted Tan (`#A8968D`)
- **Action Buttons:** Gradient from Chocolate Brown (`#3D2314`) to Deep Bronze (`#5A341E`) with gold hover borders (`#D4A373`)
- **Bullish / Buy Highlights:** Emerald Green (`#10B981`)
- **Bearish / Sell Highlights:** Crimson Red (`#EF4444`)

---

## 🚀 Key Features

### 1. Chart Upload & Scan Panel
- **Drag-and-Drop:** Intuitive file upload zone styled in chocolate brown and amber gold.
- **Clipboard Paste (`Ctrl+V`):** Paste screenshots directly from TradingView, MT4/5, or screen clippings.
- **One-Click Instant Presets:** Pre-loaded high-resolution chart setups for Gold (XAU/USD 15m), Bitcoin (BTC/USDT 1h), Euro (EUR/USD 4h), and Dow Jones (US30 15m).
- **Interactive Scanning Animation:** Real-time progress bar simulating structural scanning, FVG detection, and RRR calculation.

### 2. Smart Money Concepts (SMC) Signal Engine
Strictly adheres to institutional SMC principles:
- **Market Structure:** Internal & Swing Break of Structure (BOS) / Change of Character (CHOCH).
- **Imbalances:** Fair Value Gaps (FVGs) and Liquidity Voids.
- **Order Blocks (OBs):** Mitigation of demand and supply blocks at Optimal Trade Entry (OTE).
- **Asymmetric Risk-to-Reward:** Strictly guarantees a minimum Risk-to-Reward Ratio of **1:2** or higher.
- **Invalidation Conditions:** Exact price triggers that negate the trade idea.

### 3. Interactive Chart Overlays & Split Layout
- Side-by-side split layout comparing the chart with the AI analysis breakdown.
- Visual overlays rendered over the chart image: Entry, Stop Loss, TP1, TP2, and SMC grid toggle.
- 9 Key Metric Cards: Asset, Timeframe, Bias, Action, Confidence (%), Entry, SL, TP1, TP2, and RRR.

### 4. Interactive Demo & Onboarding Video Section
- Positioned in every core view inside a Chocolate Brown container titled:
  `🎥 How It Works: Watch 60s Demo`.
- Custom styled HTML5 video player modal with fallback play button, progress timeline, and step-by-step interactive workflow walkthrough.

### 5. Automated MT5 Webhook Bridge & Downloadable MQL5 EA
- **Signal Storage:** Every analyzed signal is saved to PostgreSQL / SQLite via Prisma ORM.
- **MQL5 EA Download:** 1-click download of `ApexVisionAI_Copilot.mq5`, pre-configured with your webhook URL, secret token, and automated lot sizing.
- **Copy Webhook API Endpoint:** Standardized JSON payload receiver at `/api/mt5/webhook`.
- **Live Test Execution:** Simulate dispatching orders directly to MetaQuotes-Demo terminals.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend API Routes:** Next.js App Router API (`/api/analyze-chart`, `/api/signals`, `/api/mt5/webhook`, `/api/mt5/ea`, `/api/user`).
- **Database:** Prisma ORM with SQLite (swappable to PostgreSQL via `DATABASE_URL`).
- **AI Integration:** Google Gemini 1.5/2.0 Flash / Pro & OpenAI GPT-4o Vision API with temperature set to `0.2` for strict numeric precision, backed by an intelligent local heuristic SMC fallback for zero-dependency testing.
- **Billing & Tiers:** Free, Pro ($99/mo), and Institutional ($299/mo) plans.

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── analyze-chart/route.ts   # AI Vision chart analysis endpoint
│   │   ├── signals/route.ts         # Signal log & history endpoint
│   │   ├── mt5/webhook/route.ts     # MT5 Webhook receiver & executor
│   │   ├── mt5/ea/route.ts          # MQL5 EA download route
│   │   └── user/route.ts            # Profile & terminal settings
│   ├── globals.css                  # Custom luxury dark-theme palette & animations
│   ├── layout.tsx                   # Root metadata & dark wrapper
│   └── page.tsx                     # Main Dashboard view
├── components/
│   ├── Navbar.tsx                   # Logo, live status, MT5 connection badge, profile
│   ├── ChartUpload.tsx              # Drag-drop upload, Ctrl+V paste, instant presets
│   ├── SignalDashboard.tsx          # Split layout, metrics cards, SMC confluences
│   ├── InteractiveChartOverlay.tsx  # Dynamic price line annotations on chart
│   ├── SignalHistory.tsx            # Historical signals table with filters
│   ├── VideoDemoSection.tsx         # 🎥 How It Works: Watch 60s Demo & modal
│   ├── ExecutionModal.tsx           # MT5 Bridge, Webhook copy, MQL5 EA download
│   └── TierModal.tsx                # Subscription & billing modal (Free / Pro / VIP)
├── lib/
│   ├── prisma.ts                    # Prisma ORM client
│   ├── types.ts                     # TypeScript definitions for SMC signals & MT5
│   ├── sample-charts.ts             # Realistic candlestick SVG presets
│   ├── vision-engine.ts             # Vision API handler with temperature 0.2 & prompt
│   └── mql5-generator.ts            # Dynamic MQL5 Expert Advisor code builder
├── prisma/
│   ├── schema.prisma                # User, Signal, and ExecutionLog schema
│   └── seed.ts                      # Initial seed data with 4 sample signals
├── .env                             # Environment configuration
└── package.json
```

---

## 🚦 Getting Started

### 1. Installation & Database Sync
```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
```

### 2. Environment Variables (`.env`)
```env
DATABASE_URL="file:./dev.db"

# Optional: Add your live Vision API keys
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"

# MT5 Webhook Secret
MT5_WEBHOOK_SECRET="apex_live_sec_9934af89"
```

### 3. Run Development Server
```bash
npm run dev
# or build & start production
npm run build
npm run start
```
Visit `http://localhost:3000` in your browser.

---

## 🤖 AI Vision Prompt & Rules (Verbatim)

```
You are Apex Vision AI, an expert technical analysis engine specializing in Smart Money Concepts (SMC).
Analyze the uploaded chart screenshot and return data strictly in this JSON schema:

{
  "asset": "STRING",
  "timeframe": "STRING",
  "market_bias": "BULLISH | BEARISH | NEUTRAL",
  "trade_recommendation": "BUY | SELL | WAIT",
  "confidence_score": NUMBER,
  "entry_price": NUMBER,
  "stop_loss": NUMBER,
  "take_profit_1": NUMBER,
  "take_profit_2": NUMBER,
  "risk_reward_ratio": "STRING",
  "key_confluences": ["STRING"],
  "invalidation_condition": "STRING",
  "analysis_summary": "STRING"
}

Rules:
1. Identify Market Structure (BOS / CHOCH), Fair Value Gaps (FVGs), and Order Blocks (OBs).
2. Never output a Risk-to-Reward Ratio lower than 1:2.
3. If the image is blurry or not a chart, return: {"error": "IMAGE_UNREADABLE"}.
```
