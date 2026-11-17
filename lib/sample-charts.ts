import { SMCSignalOutput } from './types';

export interface SampleChart {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  category: 'Gold' | 'Crypto' | 'Forex' | 'Indices';
  chartType: 'CANDLESTICK' | 'LINE_OR_OVERLAID';
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

// Generate multi-day overlaid line/area spot chart (Kitco-style)
function generateOverlaidLineChartSvg(
  symbol: string,
  tf: string,
  yAxisLabels: string[]
): string {
  const yPositions = [72, 144, 216, 288, 360, 414];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" style="background:#F8FAFC; font-family:Inter, sans-serif;">
    <defs>
      <pattern id="grid-line" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" stroke-width="1"/>
      </pattern>
      <linearGradient id="spotArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1D4ED8" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="#F8FAFC" />
    <rect width="715" height="450" fill="url(#grid-line)" />

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

    <!-- Header & Multi-Session Legend -->
    <text x="26" y="38" fill="#0F172A" font-size="17" font-weight="800" letter-spacing="0.4">${symbol} &bull; ${tf} SPOT OVERLAID LINE</text>
    <text x="26" y="58" fill="#475569" font-size="11" font-weight="600">Macro Price Action &amp; Multi-Day Session Comparison (Kitco Style)</text>

    <!-- Prior Session 2 (2 Days Ago - Slate Dashed) -->
    <polyline fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="5,4"
      points="40,365 110,352 180,360 250,340 320,330 390,342 460,318 530,310 600,302 660,295" />

    <!-- Prior Session 1 (Yesterday - Amber Line) -->
    <polyline fill="none" stroke="#F59E0B" stroke-width="2.5"
      points="40,335 110,320 180,338 250,305 320,285 390,296 460,268 530,278 600,255 660,248" />

    <!-- Active Session Area Fill + Primary Spot Trajectory Line (Cobalt Blue) -->
    <polygon fill="url(#spotArea)"
      points="40,310 110,295 180,332 250,260 320,218 390,228 460,282 520,262 560,235 560,420 40,420" />
    <polyline fill="none" stroke="#1D4ED8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"
      points="40,310 110,295 180,332 250,260 320,218 390,228 460,282 520,262 560,235" />
    <circle cx="560" cy="235" r="5" fill="#1D4ED8" stroke="#0F172A" stroke-width="2" />
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
    chartType: 'CANDLESTICK',
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
      chart_type: 'CANDLESTICK',
      analysis_mode: 'SMC_CANDLESTICK',
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
      current_market_phase: 'Pullback',
      what_is_happening:
        'Gold engineered a classic Judas Swing manipulation below Asian session equal lows at $2,642.50 to sweep Sell-Side Liquidity (SSL) before printing an aggressive bullish displacement leg. Buyers are firmly in institutional control after forcing a Break of Structure (BOS) above $2,660.00. Price is currently executing a controlled pullback into the $2,650.80–$2,654.20 Fair Value Gap and $2,643.00–$2,649.50 Demand Order Block before targeting $2,673.50 and $2,695.00.',
      how_it_works_steps: [
        'Sell-Side Liquidity (SSL) rested beneath Asian session equal lows at $2,642.50; institutional algorithms swept these stops down to $2,641.80 to accumulate discount long positions.',
        'Aggressive buyer displacement drove price impulsively higher, triggering a Change of Character (CHoCH) and confirmed Break of Structure (BOS) above the $2,660.00 swing high.',
        'Unfilled institutional buy limit orders remain stacked inside the 15M Bullish Fair Value Gap ($2,650.80–$2,654.20) and Demand Order Block in the 0.618–0.786 discount zone.',
        'A mitigation touch at $2,652.40 rebalances the inefficiency and triggers the next expansion wave toward resting Buy-Side Liquidity pools at $2,673.50 (TP1) and $2,695.00 (TP2).',
      ],
      entry_y: 64,
      stop_loss_y: 80,
      tp1_y: 32,
      tp2_y: 16,
      zones: [
        {
          label: 'BOS ↑ ($2,660.00)',
          type: 'BOS',
          x_start: 34,
          y_start: 42,
          x_end: 76,
          y_end: 46,
          x_start_percent: 34,
          y_start_percent: 42,
          x_end_percent: 76,
          y_end_percent: 46,
        },
        {
          label: 'Bullish FVG ($2,650.80 - $2,654.20)',
          type: 'FVG',
          x_start: 36,
          y_start: 58,
          x_end: 82,
          y_end: 68,
          x_start_percent: 36,
          y_start_percent: 58,
          x_end_percent: 82,
          y_end_percent: 68,
        },
        {
          label: 'Demand Order Block ($2,643.00 - $2,649.50)',
          type: 'OB',
          x_start: 22,
          y_start: 70,
          x_end: 74,
          y_end: 78,
          x_start_percent: 22,
          y_start_percent: 70,
          x_end_percent: 74,
          y_end_percent: 78,
        },
        {
          label: 'SSL Liquidity Sweep ($2,642.50)',
          type: 'LIQUIDITY',
          x_start: 14,
          y_start: 79,
          x_end: 42,
          y_end: 85,
          x_start_percent: 14,
          y_start_percent: 79,
          x_end_percent: 42,
          y_end_percent: 85,
        },
      ],
      prediction_path: [
        { x: 68, y: 50, label: 'Current Price', x_percent: 68, y_percent: 50, note: 'Current Price' },
        { x: 75, y: 64, label: 'Retrace to FVG ($2,652.40)', x_percent: 75, y_percent: 64, note: 'Retrace to FVG ($2,652.40)' },
        { x: 88, y: 16, label: 'Target Expansion ($2,695.00)', x_percent: 88, y_percent: 16, note: 'Target Expansion ($2,695.00)' },
      ],
      market_mechanics_explanation: {
        current_market_phase: 'Pullback',
        current_phase: 'Pullback',
        what_is_happening:
          'Gold engineered a classic Judas Swing manipulation below Asian session equal lows at $2,642.50 to sweep Sell-Side Liquidity (SSL) before printing an aggressive bullish displacement leg. Buyers are firmly in institutional control after forcing a Break of Structure (BOS) above $2,660.00. Price is currently executing a controlled pullback into the $2,650.80–$2,654.20 Fair Value Gap and $2,643.00–$2,649.50 Demand Order Block before targeting $2,673.50 and $2,695.00.',
        how_it_works_steps: [
          'Sell-Side Liquidity (SSL) rested beneath Asian session equal lows at $2,642.50; institutional algorithms swept these stops down to $2,641.80 to accumulate discount long positions.',
          'Aggressive buyer displacement drove price impulsively higher, triggering a Change of Character (CHoCH) and confirmed Break of Structure (BOS) above the $2,660.00 swing high.',
          'Unfilled institutional buy limit orders remain stacked inside the 15M Bullish Fair Value Gap ($2,650.80–$2,654.20) and Demand Order Block in the 0.618–0.786 discount zone.',
          'A mitigation touch at $2,652.40 rebalances the inefficiency and triggers the next expansion wave toward resting Buy-Side Liquidity pools at $2,673.50 (TP1) and $2,695.00 (TP2).',
        ],
        how_it_works_step_by_step: [
          'Sell-Side Liquidity (SSL) rested beneath Asian session equal lows at $2,642.50; institutional algorithms swept these stops down to $2,641.80 to accumulate discount long positions.',
          'Aggressive buyer displacement drove price impulsively higher, triggering a Change of Character (CHoCH) and confirmed Break of Structure (BOS) above the $2,660.00 swing high.',
          'Unfilled institutional buy limit orders remain stacked inside the 15M Bullish Fair Value Gap ($2,650.80–$2,654.20) and Demand Order Block in the 0.618–0.786 discount zone.',
          'A mitigation touch at $2,652.40 rebalances the inefficiency and triggers the next expansion wave toward resting Buy-Side Liquidity pools at $2,673.50 (TP1) and $2,695.00 (TP2).',
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
        tp2_y: 16,
        tp1_y: 32,
        entry_y: 64,
        stop_loss_y: 80,
        tp2_y_percent: 16,
        tp1_y_percent: 32,
        entry_y_percent: 64,
        stop_loss_y_percent: 80,
        zones: [
          {
            label: 'BOS ↑ ($2,660.00)',
            type: 'BOS',
            x_start: 34,
            y_start: 42,
            x_end: 76,
            y_end: 46,
            x_start_percent: 34,
            y_start_percent: 42,
            x_end_percent: 76,
            y_end_percent: 46,
          },
          {
            label: 'Bullish FVG ($2,650.80 - $2,654.20)',
            type: 'FVG',
            x_start: 36,
            y_start: 58,
            x_end: 82,
            y_end: 68,
            x_start_percent: 36,
            y_start_percent: 58,
            x_end_percent: 82,
            y_end_percent: 68,
          },
          {
            label: 'Demand Order Block ($2,643.00 - $2,649.50)',
            type: 'OB',
            x_start: 22,
            y_start: 70,
            x_end: 74,
            y_end: 78,
            x_start_percent: 22,
            y_start_percent: 70,
            x_end_percent: 74,
            y_end_percent: 78,
          },
          {
            label: 'SSL Liquidity Sweep ($2,642.50)',
            type: 'LIQUIDITY',
            x_start: 14,
            y_start: 79,
            x_end: 42,
            y_end: 85,
            x_start_percent: 14,
            y_start_percent: 79,
            x_end_percent: 42,
            y_end_percent: 85,
          },
        ],
        prediction_path: [
          { x: 68, y: 50, label: 'Current Price', x_percent: 68, y_percent: 50, note: 'Current Price' },
          { x: 75, y: 64, label: 'Retrace to FVG ($2,652.40)', x_percent: 75, y_percent: 64, note: 'Retrace to FVG ($2,652.40)' },
          { x: 88, y: 16, label: 'Target Expansion ($2,695.00)', x_percent: 88, y_percent: 16, note: 'Target Expansion ($2,695.00)' },
        ],
      },
    },
  },
  {
    id: 'kitco-gold-spot-line',
    name: 'XAU/USD Kitco Spot (Multi-Day Overlaid Line)',
    asset: 'XAUUSD',
    timeframe: '1H',
    category: 'Gold',
    chartType: 'LINE_OR_OVERLAID',
    thumbnailUrl: generateOverlaidLineChartSvg('XAUUSD', '1H', [
      '2710.00',
      '2692.00',
      '2675.00',
      '2658.00',
      '2642.00',
      '2628.00',
    ]),
    mockAnalysis: {
      asset: 'XAUUSD',
      timeframe: '1H',
      chart_type: 'LINE_OR_OVERLAID',
      analysis_mode: 'MACRO_PRICE_ACTION',
      bias: 'BULLISH',
      market_bias: 'BULLISH',
      trade_recommendation: 'BUY',
      confidence_score: 91,
      entry_price: 2662.0,
      stop_loss: 2646.0,
      take_profit_1: 2692.0,
      take_profit_2: 2710.0,
      risk_reward_ratio: '1:3.00',
      key_confluences: [
        'Macro Price Action & Trend Structure Mode: Higher highs and higher lows across 3 overlaid sessions',
        'Multi-session positive trajectory spread: Active spot curve trading +$18 above prior 2-day session curves',
        'Successful bullish retest of horizontal resistance-turned-support shelf at $2,658.00 - $2,664.00',
        'Upward momentum inflection following shallow NY pullback, projecting breakout above $2,684.00 swing high',
      ],
      invalidation_condition:
        'A sustained spot break below the $2,646.00 horizontal support shelf and yesterday’s overlaid session trajectory invalidates the macro uptrend.',
      analysis_summary:
        'Switched to Macro Price Action & Trend Structure Mode for this multi-day overlaid spot line chart. Gold maintains a staircase sequence of higher swing highs ($2,684.00) and higher swing lows ($2,658.00), consistently outperforming the two prior daily session trajectories. After a controlled pullback to the $2,658.00–$2,664.00 horizontal support zone, spot momentum has curled upward toward $2,692.00 and $2,710.00.',
      current_market_phase: 'Expansion',
      what_is_happening:
        'On this multi-day overlaid spot chart, buyers control the macro trend as today’s primary curve holds firmly above both yesterday’s and two-days-ago session baselines. Price surged to a session swing high near $2,684.00 before executing a healthy corrective pullback into the $2,658.00–$2,664.00 horizontal support shelf. Spot price is now curling higher at $2,668.00 with renewed upward slope, signaling buyer absorption ahead of a breakout toward $2,692.00 and $2,710.00.',
      how_it_works_steps: [
        'Multi-session trajectory comparison confirms institutional accumulation: each consecutive daily curve opens and holds higher than the previous session baseline ($2,642.00 -> $2,658.00).',
        'Price reacted precisely at the $2,658.00–$2,664.00 horizontal support shelf—the former intraday resistance ceiling that flipped into structural demand.',
        'Resting buy orders along the $2,662.00 support pivot absorbed midday profit-taking without breaching yesterday’s overlaid session curve.',
        'Reclaiming the $2,684.00 swing high triggers momentum breakout continuation toward the $2,692.00 measured move (TP1) and $2,710.00 macro target (TP2).',
      ],
      entry_y: 58,
      stop_loss_y: 74,
      tp1_y: 30,
      tp2_y: 16,
      zones: [
        {
          label: 'Swing High Resistance ($2,684.00 - $2,692.00)',
          type: 'RESISTANCE',
          x_start: 35,
          y_start: 28,
          x_end: 84,
          y_end: 36,
          x_start_percent: 35,
          y_start_percent: 28,
          x_end_percent: 84,
          y_end_percent: 36,
        },
        {
          label: 'Key Support Shelf ($2,658.00 - $2,664.00)',
          type: 'SUPPORT',
          x_start: 28,
          y_start: 55,
          x_end: 84,
          y_end: 64,
          x_start_percent: 28,
          y_start_percent: 55,
          x_end_percent: 84,
          y_end_percent: 64,
        },
        {
          label: 'Multi-Session Baseline Support ($2,642.00)',
          type: 'SUPPLY_DEMAND',
          x_start: 18,
          y_start: 71,
          x_end: 72,
          y_end: 79,
          x_start_percent: 18,
          y_start_percent: 71,
          x_end_percent: 72,
          y_end_percent: 79,
        },
      ],
      prediction_path: [
        { x: 70, y: 52, label: 'Current Spot ($2,668)', x_percent: 70, y_percent: 52, note: 'Current Spot ($2,668)' },
        { x: 76, y: 58, label: 'Support Retest ($2,662)', x_percent: 76, y_percent: 58, note: 'Support Retest ($2,662)' },
        { x: 89, y: 16, label: 'Breakout Target ($2,710)', x_percent: 89, y_percent: 16, note: 'Breakout Target ($2,710)' },
      ],
      market_mechanics_explanation: {
        current_market_phase: 'Expansion',
        current_phase: 'Expansion',
        what_is_happening:
          'On this multi-day overlaid spot chart, buyers control the macro trend as today’s primary curve holds firmly above both yesterday’s and two-days-ago session baselines. Price surged to a session swing high near $2,684.00 before executing a healthy corrective pullback into the $2,658.00–$2,664.00 horizontal support shelf. Spot price is now curling higher at $2,668.00 with renewed upward slope, signaling buyer absorption ahead of a breakout toward $2,692.00 and $2,710.00.',
        how_it_works_steps: [
          'Multi-session trajectory comparison confirms institutional accumulation: each consecutive daily curve opens and holds higher than the previous session baseline ($2,642.00 -> $2,658.00).',
          'Price reacted precisely at the $2,658.00–$2,664.00 horizontal support shelf—the former intraday resistance ceiling that flipped into structural demand.',
          'Resting buy orders along the $2,662.00 support pivot absorbed midday profit-taking without breaching yesterday’s overlaid session curve.',
          'Reclaiming the $2,684.00 swing high triggers momentum breakout continuation toward the $2,692.00 measured move (TP1) and $2,710.00 macro target (TP2).',
        ],
        how_it_works_step_by_step: [
          'Multi-session trajectory comparison confirms institutional accumulation: each consecutive daily curve opens and holds higher than the previous session baseline ($2,642.00 -> $2,658.00).',
          'Price reacted precisely at the $2,658.00–$2,664.00 horizontal support shelf—the former intraday resistance ceiling that flipped into structural demand.',
          'Resting buy orders along the $2,662.00 support pivot absorbed midday profit-taking without breaching yesterday’s overlaid session curve.',
          'Reclaiming the $2,684.00 swing high triggers momentum breakout continuation toward the $2,692.00 measured move (TP1) and $2,710.00 macro target (TP2).',
        ],
      },
      trading_tools_analysis: {
        market_structure:
          'Macro Price Action Uptrend: Higher swing high at $2,684.00 and defended higher swing low at $2,658.00.',
        liquidity_zones:
          'Horizontal Support Shelf at $2,658.00–$2,664.00; upside breakout targets at $2,692.00 and $2,710.00.',
        imbalances_and_obs:
          'Flip Zone Support ($2,658.00–$2,664.00) acting as primary demand floor above prior daily session curves.',
        fibonacci_or_session_context:
          'Multi-session positive divergence with active NY session trajectory holding +0.68% above 48-hour composite mean.',
      },
      trade_execution: {
        setup_type: 'BUY SETUP',
        entry_price: 2662.0,
        stop_loss: 2646.0,
        take_profit_1: 2692.0,
        take_profit_2: 2710.0,
        risk_to_reward: '1:3.00',
        invalidation_condition:
          'A sustained spot break below the $2,646.00 horizontal support shelf and yesterday’s overlaid session trajectory invalidates the macro uptrend.',
      },
      visual_proof_annotations: {
        tp2_y: 16,
        tp1_y: 30,
        entry_y: 58,
        stop_loss_y: 74,
        tp2_y_percent: 16,
        tp1_y_percent: 30,
        entry_y_percent: 58,
        stop_loss_y_percent: 74,
        zones: [
          {
            label: 'Swing High Resistance ($2,684.00 - $2,692.00)',
            type: 'RESISTANCE',
            x_start: 35,
            y_start: 28,
            x_end: 84,
            y_end: 36,
            x_start_percent: 35,
            y_start_percent: 28,
            x_end_percent: 84,
            y_end_percent: 36,
          },
          {
            label: 'Key Support Shelf ($2,658.00 - $2,664.00)',
            type: 'SUPPORT',
            x_start: 28,
            y_start: 55,
            x_end: 84,
            y_end: 64,
            x_start_percent: 28,
            y_start_percent: 55,
            x_end_percent: 84,
            y_end_percent: 64,
          },
          {
            label: 'Multi-Session Baseline Support ($2,642.00)',
            type: 'SUPPLY_DEMAND',
            x_start: 18,
            y_start: 71,
            x_end: 72,
            y_end: 79,
            x_start_percent: 18,
            y_start_percent: 71,
            x_end_percent: 72,
            y_end_percent: 79,
          },
        ],
        prediction_path: [
          { x: 70, y: 52, label: 'Current Spot ($2,668)', x_percent: 70, y_percent: 52, note: 'Current Spot ($2,668)' },
          { x: 76, y: 58, label: 'Support Retest ($2,662)', x_percent: 76, y_percent: 58, note: 'Support Retest ($2,662)' },
          { x: 89, y: 16, label: 'Breakout Target ($2,710)', x_percent: 89, y_percent: 16, note: 'Breakout Target ($2,710)' },
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
    chartType: 'CANDLESTICK',
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
      chart_type: 'CANDLESTICK',
      analysis_mode: 'SMC_CANDLESTICK',
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
      current_market_phase: 'Pullback',
      what_is_happening:
        'Bitcoin engineered an upward manipulation spike above $89,400 to purge late breakout buyers and capture Buy-Side Liquidity (BSL). Sellers took decisive control with a heavy displacement leg that forced a Bearish Change of Character (CHoCH) below $88,000. Price is now executing a low-volume relief pullback into the $88,150–$88,550 Bearish FVG and Supply Order Block before expanding downward toward $85,800 and $83,200.',
      how_it_works_steps: [
        'Buy-Side Liquidity (BSL) accumulated above equal highs at $89,400; institutional sellers swept this level up to $89,600 to fill large short positions.',
        'A violent bearish displacement impulse broke beneath the $88,000 internal swing low, confirming a Bearish CHoCH and leaving an unmitigated Bearish FVG.',
        'Institutional sell limit orders are stacked in the 0.618–0.786 premium Fibonacci zone ($88,450) where the Bearish FVG overlaps the 1H Supply Order Block.',
        'Rejection from the $88,450 entry zone triggers markdown continuation toward resting Sell-Side Liquidity pools at $85,800 (TP1) and $83,200 (TP2).',
      ],
      entry_y: 32,
      stop_loss_y: 16,
      tp1_y: 64,
      tp2_y: 88,
      zones: [
        {
          label: 'BSL Liquidity Sweep ($89,600)',
          type: 'LIQUIDITY',
          x_start: 16,
          y_start: 13,
          x_end: 45,
          y_end: 20,
          x_start_percent: 16,
          y_start_percent: 13,
          x_end_percent: 45,
          y_end_percent: 20,
        },
        {
          label: 'Supply Order Block ($88,400 - $89,200)',
          type: 'OB',
          x_start: 24,
          y_start: 21,
          x_end: 76,
          y_end: 31,
          x_start_percent: 24,
          y_start_percent: 21,
          x_end_percent: 76,
          y_end_percent: 31,
        },
        {
          label: 'Bearish FVG ($88,150 - $88,550)',
          type: 'FVG',
          x_start: 34,
          y_start: 29,
          x_end: 82,
          y_end: 39,
          x_start_percent: 34,
          y_start_percent: 29,
          x_end_percent: 82,
          y_end_percent: 39,
        },
        {
          label: 'CHoCH ↓ ($88,000)',
          type: 'BOS',
          x_start: 28,
          y_start: 48,
          x_end: 72,
          y_end: 52,
          x_start_percent: 28,
          y_start_percent: 48,
          x_end_percent: 72,
          y_end_percent: 52,
        },
      ],
      prediction_path: [
        { x: 64, y: 44, label: 'Current Price', x_percent: 64, y_percent: 44, note: 'Current Price' },
        { x: 74, y: 32, label: 'Retrace to Supply OB ($88,450)', x_percent: 74, y_percent: 32, note: 'Retrace to Supply OB ($88,450)' },
        { x: 88, y: 88, label: 'Markdown to SSL ($83,200)', x_percent: 88, y_percent: 88, note: 'Markdown to SSL ($83,200)' },
      ],
      market_mechanics_explanation: {
        current_market_phase: 'Pullback',
        current_phase: 'Pullback',
        what_is_happening:
          'Bitcoin engineered an upward manipulation spike above $89,400 to purge late breakout buyers and capture Buy-Side Liquidity (BSL). Sellers took decisive control with a heavy displacement leg that forced a Bearish Change of Character (CHoCH) below $88,000. Price is now executing a low-volume relief pullback into the $88,150–$88,550 Bearish FVG and Supply Order Block before expanding downward toward $85,800 and $83,200.',
        how_it_works_steps: [
          'Buy-Side Liquidity (BSL) accumulated above equal highs at $89,400; institutional sellers swept this level up to $89,600 to fill large short positions.',
          'A violent bearish displacement impulse broke beneath the $88,000 internal swing low, confirming a Bearish CHoCH and leaving an unmitigated Bearish FVG.',
          'Institutional sell limit orders are stacked in the 0.618–0.786 premium Fibonacci zone ($88,450) where the Bearish FVG overlaps the 1H Supply Order Block.',
          'Rejection from the $88,450 entry zone triggers markdown continuation toward resting Sell-Side Liquidity pools at $85,800 (TP1) and $83,200 (TP2).',
        ],
        how_it_works_step_by_step: [
          'Buy-Side Liquidity (BSL) accumulated above equal highs at $89,400; institutional sellers swept this level up to $89,600 to fill large short positions.',
          'A violent bearish displacement impulse broke beneath the $88,000 internal swing low, confirming a Bearish CHoCH and leaving an unmitigated Bearish FVG.',
          'Institutional sell limit orders are stacked in the 0.618–0.786 premium Fibonacci zone ($88,450) where the Bearish FVG overlaps the 1H Supply Order Block.',
          'Rejection from the $88,450 entry zone triggers markdown continuation toward resting Sell-Side Liquidity pools at $85,800 (TP1) and $83,200 (TP2).',
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
        stop_loss_y: 16,
        entry_y: 32,
        tp1_y: 64,
        tp2_y: 88,
        stop_loss_y_percent: 16,
        entry_y_percent: 32,
        tp1_y_percent: 64,
        tp2_y_percent: 88,
        zones: [
          {
            label: 'BSL Liquidity Sweep ($89,600)',
            type: 'LIQUIDITY',
            x_start: 16,
            y_start: 13,
            x_end: 45,
            y_end: 20,
            x_start_percent: 16,
            y_start_percent: 13,
            x_end_percent: 45,
            y_end_percent: 20,
          },
          {
            label: 'Supply Order Block ($88,400 - $89,200)',
            type: 'OB',
            x_start: 24,
            y_start: 21,
            x_end: 76,
            y_end: 31,
            x_start_percent: 24,
            y_start_percent: 21,
            x_end_percent: 76,
            y_end_percent: 31,
          },
          {
            label: 'Bearish FVG ($88,150 - $88,550)',
            type: 'FVG',
            x_start: 34,
            y_start: 29,
            x_end: 82,
            y_end: 39,
            x_start_percent: 34,
            y_start_percent: 29,
            x_end_percent: 82,
            y_end_percent: 39,
          },
          {
            label: 'CHoCH ↓ ($88,000)',
            type: 'BOS',
            x_start: 28,
            y_start: 48,
            x_end: 72,
            y_end: 52,
            x_start_percent: 28,
            y_start_percent: 48,
            x_end_percent: 72,
            y_end_percent: 52,
          },
        ],
        prediction_path: [
          { x: 64, y: 44, label: 'Current Price', x_percent: 64, y_percent: 44, note: 'Current Price' },
          { x: 74, y: 32, label: 'Retrace to Supply OB ($88,450)', x_percent: 74, y_percent: 32, note: 'Retrace to Supply OB ($88,450)' },
          { x: 88, y: 88, label: 'Markdown to SSL ($83,200)', x_percent: 88, y_percent: 88, note: 'Markdown to SSL ($83,200)' },
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
    chartType: 'CANDLESTICK',
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
      chart_type: 'CANDLESTICK',
      analysis_mode: 'SMC_CANDLESTICK',
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
      current_market_phase: 'Accumulation',
      what_is_happening:
        'EUR/USD conducted a sell-side liquidity raid below the 1.0545 swing low, trapping breakdown sellers before reversing sharply higher. Institutional buyers asserted control with a high-momentum 4H displacement leg that broke above internal swing resistance (BOS at 1.0625). Price is now pulling back into the 1.0575–1.0595 Bullish FVG to accumulate long orders before targeting 1.0695 and 1.0780.',
      how_it_works_steps: [
        'Sell-Side Liquidity (SSL) below the 1.0545 double bottom was swept, transferring liquidity to institutional buyers at discount prices.',
        'Strong bullish displacement broke the 4H swing high at 1.0625 (BOS), confirming a structural shift to buyer control.',
        'Resting institutional limit bids sit inside the 4H Bullish FVG (1.0575–1.0595) stacked directly above the 1.0540–1.0575 Demand Order Block.',
        'Price mitigation at 1.0585 triggers the bullish continuation wave toward internal BSL at 1.0695 (TP1) and external swing BSL at 1.0780 (TP2).',
      ],
      entry_y: 64,
      stop_loss_y: 80,
      tp1_y: 32,
      tp2_y: 16,
      zones: [
        {
          label: '4H BOS ↑ (1.0625)',
          type: 'BOS',
          x_start: 34,
          y_start: 43,
          x_end: 76,
          y_end: 47,
          x_start_percent: 34,
          y_start_percent: 43,
          x_end_percent: 76,
          y_end_percent: 47,
        },
        {
          label: 'Bullish FVG (1.0575 - 1.0595)',
          type: 'FVG',
          x_start: 36,
          y_start: 58,
          x_end: 82,
          y_end: 68,
          x_start_percent: 36,
          y_start_percent: 58,
          x_end_percent: 82,
          y_end_percent: 68,
        },
        {
          label: '4H Demand OB (1.0540 - 1.0575)',
          type: 'OB',
          x_start: 22,
          y_start: 70,
          x_end: 74,
          y_end: 78,
          x_start_percent: 22,
          y_start_percent: 70,
          x_end_percent: 74,
          y_end_percent: 78,
        },
      ],
      prediction_path: [
        { x: 68, y: 50, label: 'Current Price', x_percent: 68, y_percent: 50, note: 'Current Price' },
        { x: 75, y: 64, label: 'Retrace to 4H FVG (1.0585)', x_percent: 75, y_percent: 64, note: 'Retrace to 4H FVG (1.0585)' },
        { x: 88, y: 16, label: 'Expansion to TP2 (1.0780)', x_percent: 88, y_percent: 16, note: 'Expansion to TP2 (1.0780)' },
      ],
      market_mechanics_explanation: {
        current_market_phase: 'Accumulation',
        current_phase: 'Accumulation',
        what_is_happening:
          'EUR/USD conducted a sell-side liquidity raid below the 1.0545 swing low, trapping breakdown sellers before reversing sharply higher. Institutional buyers asserted control with a high-momentum 4H displacement leg that broke above internal swing resistance (BOS at 1.0625). Price is now pulling back into the 1.0575–1.0595 Bullish FVG to accumulate long orders before targeting 1.0695 and 1.0780.',
        how_it_works_steps: [
          'Sell-Side Liquidity (SSL) below the 1.0545 double bottom was swept, transferring liquidity to institutional buyers at discount prices.',
          'Strong bullish displacement broke the 4H swing high at 1.0625 (BOS), confirming a structural shift to buyer control.',
          'Resting institutional limit bids sit inside the 4H Bullish FVG (1.0575–1.0595) stacked directly above the 1.0540–1.0575 Demand Order Block.',
          'Price mitigation at 1.0585 triggers the bullish continuation wave toward internal BSL at 1.0695 (TP1) and external swing BSL at 1.0780 (TP2).',
        ],
        how_it_works_step_by_step: [
          'Sell-Side Liquidity (SSL) below the 1.0545 double bottom was swept, transferring liquidity to institutional buyers at discount prices.',
          'Strong bullish displacement broke the 4H swing high at 1.0625 (BOS), confirming a structural shift to buyer control.',
          'Resting institutional limit bids sit inside the 4H Bullish FVG (1.0575–1.0595) stacked directly above the 1.0540–1.0575 Demand Order Block.',
          'Price mitigation at 1.0585 triggers the bullish continuation wave toward internal BSL at 1.0695 (TP1) and external swing BSL at 1.0780 (TP2).',
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
        tp2_y: 16,
        tp1_y: 32,
        entry_y: 64,
        stop_loss_y: 80,
        tp2_y_percent: 16,
        tp1_y_percent: 32,
        entry_y_percent: 64,
        stop_loss_y_percent: 80,
        zones: [
          {
            label: '4H BOS ↑ (1.0625)',
            type: 'BOS',
            x_start: 34,
            y_start: 43,
            x_end: 76,
            y_end: 47,
            x_start_percent: 34,
            y_start_percent: 43,
            x_end_percent: 76,
            y_end_percent: 47,
          },
          {
            label: 'Bullish FVG (1.0575 - 1.0595)',
            type: 'FVG',
            x_start: 36,
            y_start: 58,
            x_end: 82,
            y_end: 68,
            x_start_percent: 36,
            y_start_percent: 58,
            x_end_percent: 82,
            y_end_percent: 68,
          },
          {
            label: '4H Demand OB (1.0540 - 1.0575)',
            type: 'OB',
            x_start: 22,
            y_start: 70,
            x_end: 74,
            y_end: 78,
            x_start_percent: 22,
            y_start_percent: 70,
            x_end_percent: 74,
            y_end_percent: 78,
          },
        ],
        prediction_path: [
          { x: 68, y: 50, label: 'Current Price', x_percent: 68, y_percent: 50, note: 'Current Price' },
          { x: 75, y: 64, label: 'Retrace to 4H FVG (1.0585)', x_percent: 75, y_percent: 64, note: 'Retrace to 4H FVG (1.0585)' },
          { x: 88, y: 16, label: 'Expansion to TP2 (1.0780)', x_percent: 88, y_percent: 16, note: 'Expansion to TP2 (1.0780)' },
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
    chartType: 'CANDLESTICK',
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
      chart_type: 'CANDLESTICK',
      analysis_mode: 'SMC_CANDLESTICK',
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
      current_market_phase: 'Expansion',
      what_is_happening:
        'At the 9:30 AM EST New York equity open, US30 engineered a rapid Judas Swing below pre-market lows (43,680) to sweep Sell-Side Liquidity (SSL). Institutional buyers immediately absorbed the sell stops and drove price aggressively higher, creating a 15M Break of Structure (BOS) above 43,980. Price is now pulling back into the 43,790–43,860 Fair Value Gap and Order Block at 43,820 before expanding toward 44,200 and 44,550.',
      how_it_works_steps: [
        'Pre-market Sell-Side Liquidity (SSL) resting at 43,680 was swept during the 9:30 AM EST opening bell manipulation.',
        'Institutional buying produced an impulsive displacement leg, breaking above the 43,980 swing high (BOS) and leaving a clean FVG.',
        'Resting institutional limit bids sit inside the 43,790–43,860 Bullish FVG and NY Open Order Block in the OTE discount zone.',
        'Mitigation at 43,820 triggers upside expansion toward internal liquidity at 44,200 (TP1) and the external session high at 44,550 (TP2).',
      ],
      entry_y: 64,
      stop_loss_y: 80,
      tp1_y: 32,
      tp2_y: 16,
      zones: [
        {
          label: '15M BOS ↑ (43,980)',
          type: 'BOS',
          x_start: 34,
          y_start: 42,
          x_end: 76,
          y_end: 46,
          x_start_percent: 34,
          y_start_percent: 42,
          x_end_percent: 76,
          y_end_percent: 46,
        },
        {
          label: 'Bullish FVG (43,790 - 43,860)',
          type: 'FVG',
          x_start: 36,
          y_start: 58,
          x_end: 82,
          y_end: 68,
          x_start_percent: 36,
          y_start_percent: 58,
          x_end_percent: 82,
          y_end_percent: 68,
        },
        {
          label: 'NY Open Order Block (43,680 - 43,790)',
          type: 'OB',
          x_start: 22,
          y_start: 70,
          x_end: 74,
          y_end: 78,
          x_start_percent: 22,
          y_start_percent: 70,
          x_end_percent: 74,
          y_end_percent: 78,
        },
        {
          label: 'Judas Swing SSL Sweep (43,680)',
          type: 'LIQUIDITY',
          x_start: 14,
          y_start: 79,
          x_end: 42,
          y_end: 85,
          x_start_percent: 14,
          y_start_percent: 79,
          x_end_percent: 42,
          y_end_percent: 85,
        },
      ],
      prediction_path: [
        { x: 68, y: 50, label: 'Current Price', x_percent: 68, y_percent: 50, note: 'Current Price' },
        { x: 75, y: 64, label: 'Retrace to FVG (43,820)', x_percent: 75, y_percent: 64, note: 'Retrace to FVG (43,820)' },
        { x: 88, y: 16, label: 'Expansion to TP2 (44,550)', x_percent: 88, y_percent: 16, note: 'Expansion to TP2 (44,550)' },
      ],
      market_mechanics_explanation: {
        current_market_phase: 'Expansion',
        current_phase: 'Expansion',
        what_is_happening:
          'At the 9:30 AM EST New York equity open, US30 engineered a rapid Judas Swing below pre-market lows (43,680) to sweep Sell-Side Liquidity (SSL). Institutional buyers immediately absorbed the sell stops and drove price aggressively higher, creating a 15M Break of Structure (BOS) above 43,980. Price is now pulling back into the 43,790–43,860 Fair Value Gap and Order Block at 43,820 before expanding toward 44,200 and 44,550.',
        how_it_works_steps: [
          'Pre-market Sell-Side Liquidity (SSL) resting at 43,680 was swept during the 9:30 AM EST opening bell manipulation.',
          'Institutional buying produced an impulsive displacement leg, breaking above the 43,980 swing high (BOS) and leaving a clean FVG.',
          'Resting institutional limit bids sit inside the 43,790–43,860 Bullish FVG and NY Open Order Block in the OTE discount zone.',
          'Mitigation at 43,820 triggers upside expansion toward internal liquidity at 44,200 (TP1) and the external session high at 44,550 (TP2).',
        ],
        how_it_works_step_by_step: [
          'Pre-market Sell-Side Liquidity (SSL) resting at 43,680 was swept during the 9:30 AM EST opening bell manipulation.',
          'Institutional buying produced an impulsive displacement leg, breaking above the 43,980 swing high (BOS) and leaving a clean FVG.',
          'Resting institutional limit bids sit inside the 43,790–43,860 Bullish FVG and NY Open Order Block in the OTE discount zone.',
          'Mitigation at 43,820 triggers upside expansion toward internal liquidity at 44,200 (TP1) and the external session high at 44,550 (TP2).',
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
        tp2_y: 16,
        tp1_y: 32,
        entry_y: 64,
        stop_loss_y: 80,
        tp2_y_percent: 16,
        tp1_y_percent: 32,
        entry_y_percent: 64,
        stop_loss_y_percent: 80,
        zones: [
          {
            label: '15M BOS ↑ (43,980)',
            type: 'BOS',
            x_start: 34,
            y_start: 42,
            x_end: 76,
            y_end: 46,
            x_start_percent: 34,
            y_start_percent: 42,
            x_end_percent: 76,
            y_end_percent: 46,
          },
          {
            label: 'Bullish FVG (43,790 - 43,860)',
            type: 'FVG',
            x_start: 36,
            y_start: 58,
            x_end: 82,
            y_end: 68,
            x_start_percent: 36,
            y_start_percent: 58,
            x_end_percent: 82,
            y_end_percent: 68,
          },
          {
            label: 'NY Open Order Block (43,680 - 43,790)',
            type: 'OB',
            x_start: 22,
            y_start: 70,
            x_end: 74,
            y_end: 78,
            x_start_percent: 22,
            y_start_percent: 70,
            x_end_percent: 74,
            y_end_percent: 78,
          },
          {
            label: 'Judas Swing SSL Sweep (43,680)',
            type: 'LIQUIDITY',
            x_start: 14,
            y_start: 79,
            x_end: 42,
            y_end: 85,
            x_start_percent: 14,
            y_start_percent: 79,
            x_end_percent: 42,
            y_end_percent: 85,
          },
        ],
        prediction_path: [
          { x: 68, y: 50, label: 'Current Price', x_percent: 68, y_percent: 50, note: 'Current Price' },
          { x: 75, y: 64, label: 'Retrace to FVG (43,820)', x_percent: 75, y_percent: 64, note: 'Retrace to FVG (43,820)' },
          { x: 88, y: 16, label: 'Expansion to TP2 (44,550)', x_percent: 88, y_percent: 16, note: 'Expansion to TP2 (44,550)' },
        ],
      },
    },
  },
];
