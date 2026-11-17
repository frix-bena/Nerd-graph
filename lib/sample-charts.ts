import { SMCSignalOutput } from './types';

export interface SampleChart {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  category: 'Gold' | 'Crypto' | 'Forex' | 'Indices';
  thumbnailUrl: string;
  mockAnalysis: SMCSignalOutput;
}

// Generate realistic SVG candlestick chart data URI for immediate testing
function generateCandleChartSvg(symbol: string, tf: string, isBullish: boolean): string {
  const candles = isBullish
    ? [
        { o: 2140, h: 2145, l: 2138, c: 2143, g: true },
        { o: 2143, h: 2146, l: 2139, c: 2141, g: false },
        { o: 2141, h: 2144, l: 2135, c: 2136, g: false },
        { o: 2136, h: 2138, l: 2130, c: 2132, g: false }, // Sweep
        { o: 2132, h: 2148, l: 2131, c: 2147, g: true }, // Impulsive BOS
        { o: 2147, h: 2154, l: 2146, c: 2152, g: true },
        { o: 2152, h: 2155, l: 2145, c: 2146, g: false }, // Retrace into FVG
        { o: 2146, h: 2150, l: 2144, c: 2149, g: true },
        { o: 2149, h: 2162, l: 2148, c: 2160, g: true },
        { o: 2160, h: 2165, l: 2156, c: 2158, g: false },
        { o: 2158, h: 2170, l: 2157, c: 2168, g: true },
      ]
    : [
        { o: 68500, h: 68900, l: 68400, c: 68800, g: true },
        { o: 68800, h: 69200, l: 68700, c: 69150, g: true },
        { o: 69150, h: 69500, l: 69000, c: 69400, g: true }, // Liquidity Grab
        { o: 69400, h: 69450, l: 68100, c: 68200, g: false }, // Heavy displacement CHOCH
        { o: 68200, h: 68400, l: 67700, c: 67800, g: false },
        { o: 67800, h: 68500, l: 67750, c: 68450, g: true }, // Pullback into Bearish OB
        { o: 68450, h: 68550, l: 67200, c: 67300, g: false },
        { o: 67300, h: 67500, l: 66800, c: 66900, g: false },
      ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" style="background:#0E0805; font-family:sans-serif;">
    <defs>
      <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E120C" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0B0B0B" stop-opacity="0.95"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2A1810" stroke-width="0.75" stroke-opacity="0.5"/>
      </pattern>
    </defs>
    <rect width="800" height="450" fill="url(#gridGrad)" />
    <rect width="800" height="450" fill="url(#grid)" />
    
    <!-- Watermark / Header -->
    <text x="30" y="45" fill="#D4A373" font-size="20" font-weight="bold" letter-spacing="1.5">APEX VISION AI &bull; ${symbol}</text>
    <text x="30" y="70" fill="#A8968D" font-size="13">${tf} &bull; Smart Money Concepts (SMC) Engine</text>
    <text x="650" y="45" fill="#10B981" font-size="13" font-family="monospace">BID: 2168.40</text>
    <text x="650" y="65" fill="#EF4444" font-size="13" font-family="monospace">ASK: 2168.65</text>
    
    <!-- SMC Markups -->
    <rect x="250" y="160" width="180" height="45" fill="#D4A373" fill-opacity="0.12" stroke="#D4A373" stroke-dasharray="3,3" stroke-width="1.2"/>
    <text x="260" y="185" fill="#D4A373" font-size="11" font-weight="bold">Bullish FVG (Fair Value Gap)</text>
    
    <rect x="180" y="270" width="140" height="35" fill="#10B981" fill-opacity="0.15" stroke="#10B981" stroke-width="1"/>
    <text x="190" y="292" fill="#10B981" font-size="11" font-weight="bold">Demand Order Block (OB)</text>

    <!-- Break of Structure Line -->
    <line x1="280" y1="120" x2="620" y2="120" stroke="#D4A373" stroke-width="1.5" stroke-dasharray="4,4"/>
    <text x="430" y="112" fill="#D4A373" font-size="11" font-weight="bold">BOS (Break of Structure) &uarr;</text>

    <!-- Candlesticks rendering -->
    ${candles
      .map((c, i) => {
        const x = 70 + i * 58;
        const color = c.g ? '#10B981' : '#EF4444';
        const bodyTop = Math.min(400 - (c.o % 300) * 0.9, 400 - (c.c % 300) * 0.9);
        const bodyH = Math.max(8, Math.abs((c.o % 300) - (c.c % 300)) * 0.9);
        const wickTop = 400 - (c.h % 300) * 0.9;
        const wickBottom = 400 - (c.l % 300) * 0.9;
        return `
          <line x1="${x + 12}" y1="${wickTop}" x2="${x + 12}" y2="${wickBottom}" stroke="${color}" stroke-width="1.5" />
          <rect x="${x}" y="${bodyTop}" width="24" height="${bodyH}" fill="${color}" rx="2" stroke="${color}" stroke-width="1"/>
        `;
      })
      .join('')}

    <!-- Target Labels -->
    <line x1="40" y1="80" x2="760" y2="80" stroke="#10B981" stroke-width="1" stroke-dasharray="2,2"/>
    <text x="700" y="75" fill="#10B981" font-size="11">TP2: 2,185.00</text>
    <line x1="40" y1="140" x2="760" y2="140" stroke="#34D399" stroke-width="1" stroke-dasharray="2,2"/>
    <text x="700" y="135" fill="#34D399" font-size="11">TP1: 2,172.50</text>
    <line x1="40" y1="230" x2="760" y2="230" stroke="#D4A373" stroke-width="1.5"/>
    <text x="700" y="225" fill="#D4A373" font-size="11">Entry: 2,152.00</text>
    <line x1="40" y1="310" x2="760" y2="310" stroke="#EF4444" stroke-width="1.5"/>
    <text x="700" y="305" fill="#EF4444" font-size="11">SL: 2,141.50</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_CHARTS: SampleChart[] = [
  {
    id: 'gold-xauusd-15m',
    name: 'XAU/USD Gold (15m Intraday Setup)',
    asset: 'XAUUSD',
    timeframe: '15m',
    category: 'Gold',
    thumbnailUrl: generateCandleChartSvg('XAUUSD', '15m', true),
    mockAnalysis: {
      asset: 'XAUUSD',
      timeframe: '15m',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 94.2,
      entry_price: 2652.4,
      stop_loss: 2641.8,
      take_profit_1: 2673.5,
      take_profit_2: 2695.0,
      risk_reward_ratio: '1:4.02',
      key_confluences: [
        'H1 to 15m Top-down Bullish Order Flow alignment',
        'Clean liquidity sweep of Asian session lows ($2,642.50)',
        'Displacement creating a high-probability Bullish Fair Value Gap (FVG)',
        'Discount pricing mitigation into the 0.618 - 0.705 OTE fibonacci zone',
      ],
      invalidation_condition:
        'Candle close below $2,641.80 invalidates the demand block and shifts structure bearish.',
      analysis_summary:
        'Gold executed a classic New York open liquidity sweep below Asian lows followed by aggressive impulsive displacement breaking the 15m swing high (BOS). Price is currently retracing into the unmitigated bullish FVG and order block. High probability long with strong risk-to-reward.',
    },
  },
  {
    id: 'btc-usdt-1h',
    name: 'BTC/USDT Bitcoin (1h Swing Setup)',
    asset: 'BTCUSDT',
    timeframe: '1h',
    category: 'Crypto',
    thumbnailUrl: generateCandleChartSvg('BTCUSDT', '1h', false),
    mockAnalysis: {
      asset: 'BTCUSDT',
      timeframe: '1h',
      market_bias: 'BEARISH',
      trade_recommendation: 'SELL',
      confidence_score: 91.5,
      entry_price: 88450.0,
      stop_loss: 89650.0,
      take_profit_1: 85800.0,
      take_profit_2: 83200.0,
      risk_reward_ratio: '1:4.38',
      key_confluences: [
        'Bearish Change of Character (CHOCH) breaking key support at $88,600',
        'Premium zone mitigation into 1h Bearish Supply Order Block ($88,400 - $88,700)',
        'Unfilled Bearish Fair Value Gap with heavy institutional volume sell imbalance',
        'Relative Equal Lows (sell-side liquidity pool) resting at $83,500',
      ],
      invalidation_condition:
        'Hourly body closure above $89,650 invalidates the supply block and targets external buy-side liquidity.',
      analysis_summary:
        'Bitcoin tested upper boundary resistance, grabbed buy-side liquidity above $89,500, and violently reversed with high volume displacement down. A CHOCH has confirmed institutional distribution. Entry is targeted at the retest of the bearish breaker block.',
    },
  },
  {
    id: 'eur-usd-4h',
    name: 'EUR/USD Euro (4h Institutional Trend)',
    asset: 'EURUSD',
    timeframe: '4h',
    category: 'Forex',
    thumbnailUrl: generateCandleChartSvg('EURUSD', '4h', true),
    mockAnalysis: {
      asset: 'EURUSD',
      timeframe: '4h',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 88.8,
      entry_price: 1.0585,
      stop_loss: 1.0535,
      take_profit_1: 1.0695,
      take_profit_2: 1.078,
      risk_reward_ratio: '1:3.90',
      key_confluences: [
        '4-Hour Internal BOS to the upside with expanding volatility',
        'Mitigation of institutional weekly discount demand block',
        'Bullish Inversion Fair Value Gap acting as dynamic support',
        'DXY (US Dollar Index) breaking internal market structure downward',
      ],
      invalidation_condition:
        '4h candle close below 1.0535 invalidates the structure and resumes the HTF macro downtrend.',
      analysis_summary:
        'EUR/USD defended the macro support shelf with an aggressive buying surge, leaving an unmitigated 4H imbalance. Anticipating continuation towards previous monthly swing highs as liquidity targets.',
    },
  },
  {
    id: 'us30-dow-15m',
    name: 'US30 Dow Jones (15m NY Session Open)',
    asset: 'US30',
    timeframe: '15m',
    category: 'Indices',
    thumbnailUrl: generateCandleChartSvg('US30', '15m', true),
    mockAnalysis: {
      asset: 'US30',
      timeframe: '15m',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 93.0,
      entry_price: 43820.0,
      stop_loss: 43660.0,
      take_profit_1: 44200.0,
      take_profit_2: 44550.0,
      risk_reward_ratio: '1:4.56',
      key_confluences: [
        'Judas Swing sweep of pre-market low at 9:30 AM EST bell',
        'Instant impulsive displacement with massive 15m green candle body',
        'Clean bullish Order Block retest at 43,820 with strong wick rejection',
        'Confluence with S&P 500 (ES) and Nasdaq (NQ) synchronized rallies',
      ],
      invalidation_condition:
        'Sustained 15m bar close below 43,660 structure low.',
      analysis_summary:
        'US30 conducted an opening bell liquidity run into discount before printing a sharp CHOCH and BOS. Ideal setup for quick session expansion into buy-side liquidity.',
    },
  },
];
