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

// Generate flat 2D vector SVG candlestick chart data URI with right Y-axis price scale
function generateCandleChartSvg(
  symbol: string,
  tf: string,
  isBullish: boolean,
  yAxisLabels: string[]
): string {
  const candles = isBullish
    ? [
        { o: 2140, h: 2145, l: 2138, c: 2143, g: true },
        { o: 2143, h: 2146, l: 2139, c: 2141, g: false },
        { o: 2141, h: 2144, l: 2135, c: 2136, g: false },
        { o: 2136, h: 2138, l: 2124, c: 2130, g: false }, // SSL Liquidity Sweep
        { o: 2130, h: 2152, l: 2129, c: 2150, g: true }, // Impulsive Displacement & BOS
        { o: 2150, h: 2158, l: 2148, c: 2156, g: true },
        { o: 2156, h: 2157, l: 2144, c: 2145, g: false }, // Retrace into Bullish FVG
        { o: 2145, h: 2151, l: 2142, c: 2149, g: true },
        { o: 2149, h: 2163, l: 2148, c: 2161, g: true },
      ]
    : [
        { o: 68500, h: 68900, l: 68400, c: 68800, g: true },
        { o: 68800, h: 69200, l: 68700, c: 69150, g: true },
        { o: 69150, h: 69650, l: 69000, c: 69400, g: true }, // BSL Liquidity Sweep
        { o: 69400, h: 69450, l: 68050, c: 68150, g: false }, // Heavy displacement CHoCH
        { o: 68150, h: 68400, l: 67700, c: 67800, g: false },
        { o: 67800, h: 68550, l: 67750, c: 68450, g: true }, // Retrace into Bearish OB/FVG
        { o: 68450, h: 68550, l: 67350, c: 67450, g: false },
      ];

  const yPositions = [72, 144, 216, 288, 360, 414];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" style="background:#F8FAFC; font-family:Inter, sans-serif;">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="450" fill="#F8FAFC" />
    <rect width="715" height="450" fill="url(#grid)" />

    <!-- Right Price Scale Y-Axis -->
    <rect x="715" y="0" width="85" height="450" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
    ${yPositions
      .map(
        (y, idx) => `
      <line x1="0" y1="${y}" x2="715" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3,3" />
      <line x1="715" y1="${y}" x2="721" y2="${y}" stroke="#0F172A" stroke-width="1.5" />
      <text x="726" y="${y + 4}" fill="#0F172A" font-size="11" font-weight="700" font-family="monospace">${yAxisLabels[idx] || ''}</text>
    `
      )
      .join('')}
    
    <!-- Header -->
    <text x="26" y="38" fill="#0F172A" font-size="17" font-weight="800" letter-spacing="0.4">${symbol} &bull; ${tf}</text>
    <text x="26" y="58" fill="#475569" font-size="11" font-weight="600">Institutional Price Action &amp; Smart Money Structure</text>

    <!-- Candlesticks rendering -->
    ${candles
      .map((c, i) => {
        const x = 62 + i * 64;
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
    timeframe: '15M',
    category: 'Gold',
    thumbnailUrl: generateCandleChartSvg('XAUUSD', '15M', true, [
      '2695.00',
      '2673.50',
      '2662.00',
      '2652.40',
      '2641.80',
      '2634.00',
    ]),
    mockAnalysis: {
      asset: 'XAUUSD',
      timeframe: '15M',
      bias: 'BULLISH',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 94,
      entry_price: 2652.4,
      stop_loss: 2641.8,
      take_profit_1: 2673.5,
      take_profit_2: 2695.0,
      risk_reward_ratio: '1:4.02',
      key_confluences: [
        'H1 to 15M Top-down Bullish Order Flow alignment',
        'Clean liquidity sweep of Asian session Sell-Side Liquidity ($2,642.50)',
        'Aggressive displacement creating an unmitigated Bullish Fair Value Gap ($2,650.80 - $2,654.20)',
        'Discount pricing mitigation into the 0.618 - 0.786 OTE Fibonacci array during NY Open',
      ],
      invalidation_condition:
        'A 15M candle body close below $2,641.80 invalidates the bullish Order Block and shifts internal structure bearish.',
      analysis_summary:
        'Gold engineered a classic Judas Swing manipulation below Asian session equal lows at $2,642.50 to sweep Sell-Side Liquidity (SSL) before printing an aggressive bullish displacement leg. This impulse caused a clean Break of Structure (BOS) above $2,660.00, leaving behind a high-probability Fair Value Gap (FVG) and institutional Demand Order Block in the discount array.',
      market_mechanics_explanation: {
        current_phase: 'Re-accumulation',
        what_is_happening:
          'Gold engineered a classic Judas Swing manipulation below Asian session equal lows at $2,642.50 to sweep Sell-Side Liquidity (SSL) before printing an aggressive bullish displacement leg. This impulse caused a clean Break of Structure (BOS) above $2,660.00, confirming institutional sponsorship. Price is now retracing into the discount Bullish Fair Value Gap (FVG) and Order Block to rebalance inefficiency before expanding toward external Buy-Side Liquidity.',
        how_it_works_step_by_step: [
          'Step 1: Sell-Side Liquidity (SSL) rested beneath Asian session equal lows at $2,642.50; smart money swept these stops with a sharp manipulation wick down to $2,641.90.',
          'Step 2: Aggressive institutional buy orders triggered an impulsive displacement candle, establishing a Change of Character (CHoCH) and subsequent Break of Structure (BOS) above $2,660.00.',
          'Step 3: Price is pulling back into the unmitigated Bullish FVG ($2,650.80–$2,654.20) aligned with the 0.618–0.786 Optimal Trade Entry (OTE) zone where resting institutional limit orders are expected to defend.',
        ],
      },
      trading_tools_analysis: {
        market_structure:
          'Bullish 15M CHoCH followed by confirmed internal BOS above the $2,660.00 swing high; higher-low protected at $2,641.80.',
        liquidity_zones:
          'Swept SSL below $2,642.50 (Asian Lows); resting internal BSL at $2,673.50 and major external session BSL at $2,695.00.',
        imbalances_and_obs:
          'Active Bullish FVG between $2,650.80 and $2,654.20 sitting directly above the 15M Bullish Order Block ($2,643.00–$2,649.50).',
        fibonacci_or_session_context:
          'Price is retracing into the Discount array (0.618–0.705 OTE retracement of the $2,641.80 to $2,668.00 dealing range) during the London/New York overlap.',
      },
      trade_execution: {
        setup_type: 'BUY SETUP',
        entry_price: 2652.4,
        stop_loss: 2641.8,
        take_profit_1: 2673.5,
        take_profit_2: 2695.0,
        risk_to_reward: '1:4.02',
        invalidation_condition:
          'A 15M candle body close below $2,641.80 invalidates the bullish Order Block and shifts internal structure bearish.',
      },
      visual_proof_annotations: {
        tp2_y_percent: 16,
        tp1_y_percent: 32,
        entry_y_percent: 64,
        stop_loss_y_percent: 80,
        zones: [
          {
            label: 'BOS ↑ ($2,660.00)',
            type: 'BOS',
            x_start_percent: 34,
            y_start_percent: 42,
            x_end_percent: 76,
            y_end_percent: 46,
          },
          {
            label: 'Bullish FVG ($2,650.80 - $2,654.20)',
            type: 'FVG',
            x_start_percent: 36,
            y_start_percent: 58,
            x_end_percent: 82,
            y_end_percent: 68,
          },
          {
            label: 'Demand Order Block ($2,643.00 - $2,649.50)',
            type: 'OB',
            x_start_percent: 22,
            y_start_percent: 70,
            x_end_percent: 74,
            y_end_percent: 78,
          },
          {
            label: 'SSL Liquidity Sweep ($2,642.50)',
            type: 'LIQUIDITY',
            x_start_percent: 14,
            y_start_percent: 79,
            x_end_percent: 42,
            y_end_percent: 85,
          },
        ],
        prediction_path: [
          { x_percent: 68, y_percent: 50, note: 'Current price' },
          { x_percent: 75, y_percent: 64, note: 'Retracement into FVG/OB' },
          { x_percent: 88, y_percent: 16, note: 'Expansion toward TP1/TP2' },
        ],
      },
    },
  },
  {
    id: 'btc-usdt-1h',
    name: 'BTC/USDT Bitcoin (1h Swing Setup)',
    asset: 'BTCUSDT',
    timeframe: '1H',
    category: 'Crypto',
    thumbnailUrl: generateCandleChartSvg('BTCUSDT', '1H', false, [
      '89650.0',
      '88450.0',
      '87200.0',
      '85800.0',
      '84400.0',
      '83200.0',
    ]),
    mockAnalysis: {
      asset: 'BTCUSDT',
      timeframe: '1H',
      bias: 'BEARISH',
      market_bias: 'BEARISH',
      trade_recommendation: 'SELL',
      confidence_score: 92,
      entry_price: 88450.0,
      stop_loss: 89650.0,
      take_profit_1: 85800.0,
      take_profit_2: 83200.0,
      risk_reward_ratio: '1:4.38',
      key_confluences: [
        'Bearish Change of Character (CHoCH) breaking key internal support at $88,000',
        'Premium zone mitigation into 1H Bearish Supply Order Block ($88,350 - $88,900)',
        'Unfilled Bearish Fair Value Gap with heavy institutional sell imbalance',
        'Relative Equal Lows (Sell-Side Liquidity pool) resting at $83,200',
      ],
      invalidation_condition:
        'Hourly candle body closure above $89,650 invalidates the supply Order Block and targets external buy-side liquidity.',
      analysis_summary:
        'Bitcoin swept Buy-Side Liquidity (BSL) above the $89,400 swing high before printing an impulsive bearish displacement leg that broke below internal swing support (CHoCH). Price is now pulling back into the Premium 1H Bearish Order Block and FVG array for a high-probability short continuation.',
      market_mechanics_explanation: {
        current_phase: 'Distribution',
        what_is_happening:
          'Bitcoin engineered an upward manipulation spike above $89,400 to purge late breakout buyers and capture Buy-Side Liquidity (BSL). Immediately following the sweep, institutional supply stepped in with heavy displacement, causing a Bearish Change of Character (CHoCH) below $88,000. Price is now retracing into the premium Bearish Fair Value Gap and Supply Order Block where institutional sell orders remain stacked.',
        how_it_works_step_by_step: [
          'Step 1: Buy-Side Liquidity (BSL) accumulated above equal highs at $89,400; price swept this pool up to $89,600 to fill institutional short liquidity.',
          'Step 2: A violent bearish displacement leg broke beneath the $88,000 swing low, confirming a Bearish CHoCH and leaving an unmitigated Bearish FVG.',
          'Step 3: Price is retracing upward into the 0.618–0.786 premium Fibonacci zone ($88,450) where the Bearish FVG overlaps the Supply Order Block, offering an optimal short entry toward resting SSL.',
        ],
      },
      trading_tools_analysis: {
        market_structure:
          'Bearish 1H CHoCH confirmed below $88,000 after sweeping macro BSL at $89,600; lower-high supply protected at $89,650.',
        liquidity_zones:
          'BSL swept at $89,600; internal Sell-Side Liquidity (SSL) resting at $85,800 and major equal lows SSL pool at $83,200.',
        imbalances_and_obs:
          'Bearish FVG ($88,150–$88,550) overlapping the 1H Bearish Order Block ($88,400–$89,200).',
        fibonacci_or_session_context:
          'Positioned in the Premium dealing range (0.618–0.786 OTE retracement) during New York session distribution.',
      },
      trade_execution: {
        setup_type: 'SELL SETUP',
        entry_price: 88450.0,
        stop_loss: 89650.0,
        take_profit_1: 85800.0,
        take_profit_2: 83200.0,
        risk_to_reward: '1:4.38',
        invalidation_condition:
          'Hourly candle body closure above $89,650 invalidates the supply Order Block and targets external buy-side liquidity.',
      },
      visual_proof_annotations: {
        stop_loss_y_percent: 16,
        entry_y_percent: 32,
        tp1_y_percent: 64,
        tp2_y_percent: 88,
        zones: [
          {
            label: 'BSL Liquidity Sweep ($89,600)',
            type: 'LIQUIDITY',
            x_start_percent: 16,
            y_start_percent: 13,
            x_end_percent: 45,
            y_end_percent: 20,
          },
          {
            label: 'Supply Order Block ($88,400 - $89,200)',
            type: 'OB',
            x_start_percent: 24,
            y_start_percent: 21,
            x_end_percent: 76,
            y_end_percent: 31,
          },
          {
            label: 'Bearish FVG ($88,150 - $88,550)',
            type: 'FVG',
            x_start_percent: 34,
            y_start_percent: 29,
            x_end_percent: 82,
            y_end_percent: 39,
          },
          {
            label: 'CHoCH ↓ ($88,000)',
            type: 'BOS',
            x_start_percent: 28,
            y_start_percent: 48,
            x_end_percent: 72,
            y_end_percent: 52,
          },
        ],
        prediction_path: [
          { x_percent: 64, y_percent: 44, note: 'Current price' },
          { x_percent: 74, y_percent: 32, note: 'Retracement into FVG/OB' },
          { x_percent: 88, y_percent: 88, note: 'Expansion toward TP1/TP2' },
        ],
      },
    },
  },
  {
    id: 'eur-usd-4h',
    name: 'EUR/USD Euro (4h Institutional Trend)',
    asset: 'EURUSD',
    timeframe: '4H',
    category: 'Forex',
    thumbnailUrl: generateCandleChartSvg('EURUSD', '4H', true, [
      '1.0780',
      '1.0695',
      '1.0640',
      '1.0585',
      '1.0535',
      '1.0490',
    ]),
    mockAnalysis: {
      asset: 'EURUSD',
      timeframe: '4H',
      bias: 'BULLISH',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 89,
      entry_price: 1.0585,
      stop_loss: 1.0535,
      take_profit_1: 1.0695,
      take_profit_2: 1.078,
      risk_reward_ratio: '1:3.90',
      key_confluences: [
        '4-Hour internal BOS to the upside with expanding institutional volume',
        'Mitigation of weekly discount Demand Order Block (1.0540 - 1.0575)',
        'Bullish Fair Value Gap (1.0575 - 1.0595) acting as dynamic support',
        'London session Optimal Trade Entry (0.618 - 0.705 Fibonacci discount retracement)',
      ],
      invalidation_condition:
        '4H candle close below 1.0535 invalidates the demand block and resumes the macro downtrend.',
      analysis_summary:
        'EUR/USD swept Sell-Side Liquidity below 1.0545 before launching an impulsive 4H displacement wave that broke structure upward. Price is retracing into the discount 4H Fair Value Gap at 1.0585 for continuation toward 1.0695 and 1.0780.',
      market_mechanics_explanation: {
        current_phase: 'Re-accumulation',
        what_is_happening:
          'EUR/USD conducted a sell-side liquidity raid below the 1.0545 swing low, trapping retail breakdown sellers before reversing sharply. Institutional demand produced a high-momentum 4H displacement leg that broke above internal swing resistance (BOS at 1.0625). Price is now executing a controlled pullback into the 1.0575–1.0595 Bullish FVG to accumulate long orders before targeting higher-timeframe liquidity.',
        how_it_works_step_by_step: [
          'Step 1: Sell-Side Liquidity (SSL) below the 1.0545 double bottom was swept, transferring liquidity to institutional buyers at discount prices.',
          'Step 2: Strong bullish displacement broke the 4H swing high at 1.0625 (BOS), confirming a structural shift to bullish order flow.',
          'Step 3: Price is retracing into the 4H Bullish FVG (1.0575–1.0595) and Order Block where institutional bids are positioned for expansion toward 1.0695 and 1.0780.',
        ],
      },
      trading_tools_analysis: {
        market_structure:
          '4H Bullish BOS above 1.0625 following a liquidity sweep of 1.0545; higher-low structural support anchored at 1.0535.',
        liquidity_zones:
          'Swept SSL below 1.0545; internal BSL target at 1.0695 and external monthly swing high BSL at 1.0780.',
        imbalances_and_obs:
          'Unmitigated 4H Bullish FVG (1.0575–1.0595) stacked directly above the 4H Bullish Order Block (1.0540–1.0575).',
        fibonacci_or_session_context:
          'Discount array 0.618–0.705 OTE retracement aligned with London session institutional accumulation.',
      },
      trade_execution: {
        setup_type: 'BUY SETUP',
        entry_price: 1.0585,
        stop_loss: 1.0535,
        take_profit_1: 1.0695,
        take_profit_2: 1.078,
        risk_to_reward: '1:3.90',
        invalidation_condition:
          '4H candle close below 1.0535 invalidates the demand block and resumes the macro downtrend.',
      },
      visual_proof_annotations: {
        tp2_y_percent: 16,
        tp1_y_percent: 32,
        entry_y_percent: 64,
        stop_loss_y_percent: 80,
        zones: [
          {
            label: '4H BOS ↑ (1.0625)',
            type: 'BOS',
            x_start_percent: 34,
            y_start_percent: 43,
            x_end_percent: 76,
            y_end_percent: 47,
          },
          {
            label: 'Bullish FVG (1.0575 - 1.0595)',
            type: 'FVG',
            x_start_percent: 36,
            y_start_percent: 58,
            x_end_percent: 82,
            y_end_percent: 68,
          },
          {
            label: '4H Demand OB (1.0540 - 1.0575)',
            type: 'OB',
            x_start_percent: 22,
            y_start_percent: 70,
            x_end_percent: 74,
            y_end_percent: 78,
          },
        ],
        prediction_path: [
          { x_percent: 68, y_percent: 50, note: 'Current price' },
          { x_percent: 75, y_percent: 64, note: 'Retracement into FVG/OB' },
          { x_percent: 88, y_percent: 16, note: 'Expansion toward TP1/TP2' },
        ],
      },
    },
  },
  {
    id: 'us30-dow-15m',
    name: 'US30 Dow Jones (15m NY Session Open)',
    asset: 'US30',
    timeframe: '15M',
    category: 'Indices',
    thumbnailUrl: generateCandleChartSvg('US30', '15M', true, [
      '44550.0',
      '44200.0',
      '44010.0',
      '43820.0',
      '43660.0',
      '43500.0',
    ]),
    mockAnalysis: {
      asset: 'US30',
      timeframe: '15M',
      bias: 'BULLISH',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 93,
      entry_price: 43820.0,
      stop_loss: 43660.0,
      take_profit_1: 44200.0,
      take_profit_2: 44550.0,
      risk_reward_ratio: '1:4.56',
      key_confluences: [
        'Judas Swing sweep of pre-market SSL at 9:30 AM EST opening bell (43,680)',
        'Impulsive displacement with wide-range 15M bullish candle breaking structure (BOS)',
        'Clean Bullish FVG and Order Block retest at 43,820 in discount pricing',
        'Relative strength confluence across US indices during NY AM Silver Bullet window',
      ],
      invalidation_condition:
        'Sustained 15M candle close below 43,660 structural swing low voids the setup.',
      analysis_summary:
        'US30 executed an opening bell liquidity sweep below pre-market lows at 43,680 before printing a sharp bullish displacement leg and BOS above 43,980. Price is retracing into the 43,800–43,860 FVG/OB array for expansion toward 44,200 and 44,550.',
      market_mechanics_explanation: {
        current_phase: 'Manipulation',
        what_is_happening:
          'At the 9:30 AM EST New York equity open, US30 engineered a rapid Judas Swing below pre-market lows (43,680) to sweep Sell-Side Liquidity (SSL). Smart money immediately absorbed the sell stops and drove price aggressively higher, creating a 15M Break of Structure (BOS) above 43,980. Price is now retracing into the resulting Fair Value Gap and Order Block at 43,820 before the next expansion wave.',
        how_it_works_step_by_step: [
          'Step 1: Pre-market Sell-Side Liquidity (SSL) resting at 43,680 was swept during the 9:30 AM EST opening bell manipulation.',
          'Step 2: Institutional buying produced an impulsive displacement leg, breaking above the 43,980 swing high (BOS) and leaving a clean FVG.',
          'Step 3: Price is pulling back into the 43,790–43,860 Bullish FVG / Order Block confluence in the OTE discount zone for expansion toward 44,200 and 44,550.',
        ],
      },
      trading_tools_analysis: {
        market_structure:
          '15M Bullish CHoCH & BOS confirmed above 43,980; protected swing low established at 43,660.',
        liquidity_zones:
          'Pre-market SSL swept at 43,680; internal BSL resting at 44,200 and external daily high BSL at 44,550.',
        imbalances_and_obs:
          '15M Bullish FVG (43,790–43,860) directly above the NY Open Bullish Order Block (43,680–43,790).',
        fibonacci_or_session_context:
          'NY AM Session Silver Bullet window (10:00–11:00 AM EST) retracing into the 0.618–0.786 OTE discount zone.',
      },
      trade_execution: {
        setup_type: 'BUY SETUP',
        entry_price: 43820.0,
        stop_loss: 43660.0,
        take_profit_1: 44200.0,
        take_profit_2: 44550.0,
        risk_to_reward: '1:4.56',
        invalidation_condition:
          'Sustained 15M candle close below 43,660 structural swing low voids the setup.',
      },
      visual_proof_annotations: {
        tp2_y_percent: 16,
        tp1_y_percent: 32,
        entry_y_percent: 64,
        stop_loss_y_percent: 80,
        zones: [
          {
            label: '15M BOS ↑ (43,980)',
            type: 'BOS',
            x_start_percent: 34,
            y_start_percent: 42,
            x_end_percent: 76,
            y_end_percent: 46,
          },
          {
            label: 'Bullish FVG (43,790 - 43,860)',
            type: 'FVG',
            x_start_percent: 36,
            y_start_percent: 58,
            x_end_percent: 82,
            y_end_percent: 68,
          },
          {
            label: 'NY Open Order Block (43,680 - 43,790)',
            type: 'OB',
            x_start_percent: 22,
            y_start_percent: 70,
            x_end_percent: 74,
            y_end_percent: 78,
          },
          {
            label: 'Judas Swing SSL Sweep (43,680)',
            type: 'LIQUIDITY',
            x_start_percent: 14,
            y_start_percent: 79,
            x_end_percent: 42,
            y_end_percent: 85,
          },
        ],
        prediction_path: [
          { x_percent: 68, y_percent: 50, note: 'Current price' },
          { x_percent: 75, y_percent: 64, note: 'Retracement into FVG/OB' },
          { x_percent: 88, y_percent: 16, note: 'Expansion toward TP1/TP2' },
        ],
      },
    },
  },
];
