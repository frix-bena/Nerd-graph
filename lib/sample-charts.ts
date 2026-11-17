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

// Generate flat 2D vector SVG candlestick chart data URI matching the modern SaaS UI palette
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" style="background:#F8FAFC; font-family:Inter, sans-serif;">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="450" fill="#F8FAFC" />
    <rect width="800" height="450" fill="url(#grid)" />
    
    <!-- Header -->
    <text x="30" y="42" fill="#0F172A" font-size="18" font-weight="800" letter-spacing="0.5">APEX VISION AI &bull; ${symbol}</text>
    <text x="30" y="64" fill="#475569" font-size="12" font-weight="600">${tf} &bull; Smart Money Concepts (SMC) Vector Engine</text>
    
    <rect x="635" y="24" width="135" height="44" rx="8" fill="#EFF6FF" stroke="#0F172A" stroke-width="1.5"/>
    <text x="648" y="43" fill="#1D4ED8" font-size="12" font-weight="bold" font-family="monospace">BID: 2652.40</text>
    <text x="648" y="60" fill="#EF4444" font-size="12" font-weight="bold" font-family="monospace">ASK: 2652.65</text>
    
    <!-- SMC Markups -->
    <rect x="250" y="160" width="210" height="46" rx="6" fill="#DBEAFE" fill-opacity="0.85" stroke="#1D4ED8" stroke-dasharray="4,4" stroke-width="2"/>
    <text x="264" y="187" fill="#1D4ED8" font-size="11" font-weight="bold" font-family="monospace">Bullish FVG (Fair Value Gap)</text>
    
    <rect x="170" y="270" width="165" height="38" rx="6" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>
    <text x="184" y="293" fill="#0F172A" font-size="11" font-weight="bold" font-family="monospace">Demand Order Block (OB)</text>

    <!-- Break of Structure Line -->
    <line x1="280" y1="120" x2="620" y2="120" stroke="#0F172A" stroke-width="2" stroke-dasharray="4,4"/>
    <text x="415" y="112" fill="#0F172A" font-size="11" font-weight="bold" font-family="monospace">BOS (Break of Structure) &uarr;</text>

    <!-- Candlesticks rendering -->
    ${candles
      .map((c, i) => {
        const x = 70 + i * 58;
        const fill = c.g ? '#1D4ED8' : '#EF4444';
        const bodyTop = Math.min(400 - (c.o % 300) * 0.9, 400 - (c.c % 300) * 0.9);
        const bodyH = Math.max(10, Math.abs((c.o % 300) - (c.c % 300)) * 0.9);
        const wickTop = 400 - (c.h % 300) * 0.9;
        const wickBottom = 400 - (c.l % 300) * 0.9;
        return `
          <line x1="${x + 12}" y1="${wickTop}" x2="${x + 12}" y2="${wickBottom}" stroke="#0F172A" stroke-width="2" />
          <rect x="${x}" y="${bodyTop}" width="24" height="${bodyH}" fill="${fill}" rx="3" stroke="#0F172A" stroke-width="2"/>
        `;
      })
      .join('')}
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
