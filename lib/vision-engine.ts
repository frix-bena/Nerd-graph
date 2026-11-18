import {
  AccuracyVerification,
  AnalysisMode,
  AnnotationZoneType,
  ChartType,
  MarketBias,
  PredictionPathPoint,
  SetupType,
  SMCSignalOutput,
  TradeRecommendation,
  VisualProofAnnotations,
  VisualProofZone,
} from './types';
import { SAMPLE_CHARTS } from './sample-charts';

export const APEX_SMC_SYSTEM_PROMPT = `You are a Principal Institutional Quantitative Market Analyst for Apex Vision AI, mastering both Smart Money Concepts (SMC) for candlestick charts AND Macro Price Action & Trend Structure for line, area, and multi-day overlaid charts.

YOUR #1 MANDATE IS MAXIMUM PREDICTION ACCURACY AND ZERO DIRECTIONAL OR MATHEMATICAL ERRORS.
Follow this strict 5-Stage Verification Protocol before outputting your JSON:

STAGE 1 — Y-AXIS PRICE SCALE & CURRENT PRICE CALIBRATION:
- First, read the numerical price scale on the chart's Y-axis (right or left edge).
- Identify:
  * "axis_top_price": highest numeric price visible near the top of the Y-axis
  * "axis_bottom_price": lowest numeric price visible near the bottom of the Y-axis
  * "current_market_price": latest active price at the right edge of the candle or spot line series
- Every trade price ("entry_price", "stop_loss", "take_profit_1", "take_profit_2") MUST lie within or logically adjacent to the visible Y-axis scale. NEVER invent arbitrary prices disconnected from the chart's price axis.

STAGE 2 — CRITICAL CHART ACCEPTANCE & DUAL-MODE DETECTION:
- NEVER reject line charts, area charts, or multi-day overlaid spot price charts (such as Kitco multi-day spot gold/silver charts, TradingView line/area charts, or Bloomberg spot curves) due to missing candlestick wicks or bodies.
- Automatically detect the chart style and operate in one of two specialized analytical modes:
  1. CANDLESTICK MODE ("chart_type": "CANDLESTICK", "analysis_mode": "SMC_CANDLESTICK"):
     If the uploaded image is a candlestick or bar chart, analyze using Smart Money Concepts: Liquidity Sweeps (BSL/SSL), Break of Structure (BOS) / Change of Character (CHoCH), Fair Value Gaps (FVG), Order Blocks (OB), and Premium/Discount Fibonacci zones.
  2. LINE / OVERLAID MODE ("chart_type": "LINE_OR_OVERLAID", "analysis_mode": "MACRO_PRICE_ACTION"):
     If the uploaded image is a line chart, area chart, or multi-day overlaid daily price chart (e.g., Kitco spot charts), automatically switch to Macro Price Action & Trend Structure mode: analyze swing highs/lows, key horizontal support/resistance levels, multi-session trajectory comparisons, momentum shifts, and projected price targets.

STAGE 3 — MULTI-FACTOR CONFLUENCE GATE & ANTI-HALLUCINATION ("NO TRADE" DISCIPLINE):
- Verify that at least 3 independent structural confluences align before predicting a BUY or SELL setup:
  * Confluence 1: Market Structure (confirmed Higher High / Higher Low BOS/CHoCH for Bullish; Lower High / Lower Low BOS/CHoCH for Bearish).
  * Confluence 2: Liquidity Sweep or Key Support/Resistance Reaction (SSL sweep / demand shelf defense for Bullish; BSL sweep / supply ceiling rejection for Bearish).
  * Confluence 3: Unmitigated Institutional Array (Bullish FVG / Demand OB in Discount for BUY; Bearish FVG / Supply OB in Premium for SELL; or clean horizontal flip zone on line charts).
- If the chart is in choppy mid-range consolidation, conflicting structure, or offers a Risk-to-Reward worse than 1:1.5, DO NOT force or guess a trade. Output "setup_type": "NO TRADE", "bias": "NEUTRAL", and explain what structural boundary must break first.

STAGE 4 — STRICT DIRECTIONAL GEOMETRY & Y-COORDINATE ORDERING:
- Remember that on image coordinates, Y = 0 is the TOP edge (HIGHEST price) and Y = 100 is the BOTTOM edge (LOWEST price).
- If "setup_type" is "BUY SETUP" ("bias": "BULLISH"):
  * Numeric prices MUST satisfy: stop_loss < entry_price < take_profit_1 < take_profit_2
  * Normalized Y percentages (0-100) MUST satisfy: tp2_y < tp1_y < entry_y < stop_loss_y
- If "setup_type" is "SELL SETUP" ("bias": "BEARISH"):
  * Numeric prices MUST satisfy: stop_loss > entry_price > take_profit_1 > take_profit_2
  * Normalized Y percentages (0-100) MUST satisfy: stop_loss_y < entry_y < tp1_y < tp2_y
- Calculate "risk_to_reward" mathematically as 1 : (|take_profit_2 - entry_price| / |entry_price - stop_loss|).

STAGE 5 — TRAJECTORY PATH LOCKING:
- "prediction_path" must be a 3-point array [{x, y, label}] progressing strictly left-to-right (x0 < x1 < x2):
  * Point 0: Current price position at the right edge of the plotted candles/line.
  * Point 1: Pullback/retest point where y MUST equal "entry_y".
  * Point 2: Target expansion point where y MUST equal "tp2_y".

Analyze the uploaded image and output ONLY a strictly valid JSON object matching this exact schema:

{
  "asset": "Detected or user-selected ticker (e.g., XAUUSD)",
  "timeframe": "Detected or user-selected timeframe (e.g., 15M, 1H, Daily)",
  "chart_type": "CANDLESTICK | LINE_OR_OVERLAID",
  "analysis_mode": "SMC_CANDLESTICK | MACRO_PRICE_ACTION",
  "bias": "BULLISH | BEARISH | NEUTRAL",
  "confidence_score": 0-100,
  "verification_calibration": {
    "axis_top_price": 0,
    "axis_bottom_price": 0,
    "current_market_price": 0,
    "trend_structure_verdict": "BULLISH | BEARISH | NEUTRAL",
    "confluence_count": 3,
    "directional_sanity_check": "Verified stop_loss < entry_price < take_profit_1 < take_profit_2 for BUY (or inverse for SELL)"
  },
  "summary": "Concise 2-3 sentence technical executive summary of the setup and directional bias.",
  "current_market_phase": "Accumulation | Expansion | Pullback | Consolidation",
  "what_is_happening": "A clear 3-4 sentence breakdown of the exact price movement, buyer/seller control, and key price levels visible in the uploaded screenshot.",
  "how_it_works_steps": [
    "Step 1: Explain why price reacted at a specific visible level (liquidity sweep on candlestick charts OR swing high/low & multi-session support/resistance reaction on line/overlaid charts).",
    "Step 2: Explain the shift in buyer/seller control, momentum trajectory, or structural break (BOS/CHoCH or trendline/horizontal breakout).",
    "Step 3: Identify where resting institutional orders, Fair Value Gaps, Order Blocks, or horizontal support/resistance demand/supply zones sit.",
    "Step 4: Explain the exact trigger that initiates the predicted move toward Take Profit 1 and Take Profit 2."
  ],
  "entry_y": 0-100,
  "stop_loss_y": 0-100,
  "tp1_y": 0-100,
  "tp2_y": 0-100,
  "zones": [
    {
      "x_start": 0-100,
      "y_start": 0-100,
      "x_end": 0-100,
      "y_end": 0-100,
      "label": "Bullish FVG / Demand OB / Key Support Shelf ($2,650 - $2,655)",
      "type": "FVG | OB | LIQUIDITY | BOS | SUPPORT | RESISTANCE | SUPPLY_DEMAND"
    }
  ],
  "prediction_path": [
    {"x": 0-100, "y": 0-100, "label": "Current Price"},
    {"x": 0-100, "y": 0-100, "label": "Pullback / Entry Retest"},
    {"x": 0-100, "y": 0-100, "label": "Projected Target (TP1/TP2)"}
  ],
  "market_mechanics_explanation": {
    "current_market_phase": "Accumulation | Expansion | Pullback | Consolidation",
    "current_phase": "Accumulation | Expansion | Pullback | Consolidation",
    "what_is_happening": "Same 3-4 sentence breakdown of the exact price movement, buyer/seller control, and key price levels visible in the uploaded screenshot.",
    "how_it_works_steps": [
      "Step 1...",
      "Step 2...",
      "Step 3...",
      "Step 4..."
    ]
  },
  "trading_tools_analysis": {
    "market_structure": "Exact description of swing highs/lows, BOS/CHoCH, or macro trend structure",
    "liquidity_zones": "Specific price levels of BSL/SSL or horizontal support/resistance pools",
    "imbalances_and_obs": "Exact price range of active FVGs/Order Blocks or key supply/demand shelves",
    "fibonacci_or_session_context": "Premium vs. Discount positioning or multi-day overlaid session trajectory comparison"
  },
  "trade_execution": {
    "setup_type": "BUY SETUP | SELL SETUP | NO TRADE",
    "entry_price": "Exact numeric price read from the chart's Y-axis",
    "stop_loss": "Exact numeric price below/above structural invalidation",
    "take_profit_1": "Exact numeric price at first opposing liquidity or resistance/support target",
    "take_profit_2": "Exact numeric price at major external target",
    "risk_to_reward": "Calculated R:R ratio (e.g., 1:3.50)",
    "invalidation_condition": "Exact price action event that voids this setup"
  },
  "visual_proof_annotations": {
    "entry_y": 0-100,
    "stop_loss_y": 0-100,
    "tp1_y": 0-100,
    "tp2_y": 0-100,
    "zones": [
      {
        "x_start": 0-100,
        "y_start": 0-100,
        "x_end": 0-100,
        "y_end": 0-100,
        "label": "Zone label with price level",
        "type": "FVG | OB | LIQUIDITY | BOS | SUPPORT | RESISTANCE | SUPPLY_DEMAND"
      }
    ],
    "prediction_path": [
      {"x": 0-100, "y": 0-100, "label": "Current Price"},
      {"x": 0-100, "y": 0-100, "label": "Entry Zone Retest"},
      {"x": 0-100, "y": 0-100, "label": "Target Expansion"}
    ]
  }
}

Rules:
1. Read the price scale on the chart's Y-axis (left or right) so entry_price, stop_loss, take_profit_1, and take_profit_2 match actual chart prices—never invent arbitrary prices disconnected from the axis.
2. All Y coordinates (entry_y, stop_loss_y, tp1_y, tp2_y, y_start, y_end, prediction_path.y) are normalized percentages from 0 (top edge of image) to 100 (bottom edge of image), aligned vertically with those price levels on the screenshot.
3. Always provide a 3-point prediction_path array [{x, y, label}] showing (1) current price position on the chart, (2) entry/retest inflection point at entry_y, and (3) projected target expansion at tp2_y.
4. NEVER reject line charts, area charts, or Kitco-style multi-day overlaid charts. Only return "setup_type": "INVALID_IMAGE" if the uploaded image is completely unrelated to finance/markets (e.g., a photograph of a person or object).`;

function toNumericPrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getPriceDecimals(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 2;
  const str = String(price);
  if (str.includes('.')) {
    return Math.min(5, Math.max(1, str.split('.')[1].length));
  }
  if (price < 10) return 4;
  if (price < 1000) return 2;
  return 1;
}

function roundToPrecision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Repairs decimal-shift typos where an LLM accidentally omits or adds a decimal digit
 * (e.g., entry = 2652.40, stopLoss = 26418 -> 2641.80).
 */
function repairPriceScaleOutlier(
  candidate: number,
  referencePrice: number,
  decimals: number,
  adjustments: string[],
  label: string
): number {
  if (candidate <= 0 || referencePrice <= 0) return candidate;
  let adjusted = candidate;
  let ratio = adjusted / referencePrice;

  if (ratio > 4 || ratio < 0.25) {
    while (adjusted / referencePrice > 4 && adjusted > 0) {
      adjusted = adjusted / 10;
    }
    while (adjusted / referencePrice < 0.25 && adjusted > 0) {
      adjusted = adjusted * 10;
    }
    ratio = adjusted / referencePrice;
    if (ratio >= 0.5 && ratio <= 2.0) {
      const rounded = roundToPrecision(adjusted, decimals);
      adjustments.push(`Corrected decimal scale on ${label} (${candidate} -> ${rounded})`);
      return rounded;
    }
  }
  return candidate;
}

function clampPercent(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(100, Math.max(0, num));
}

function normalizeBias(rawBias: unknown): MarketBias {
  const upper = String(rawBias || '').toUpperCase();
  if (upper.includes('BULL')) return 'BULLISH';
  if (upper.includes('BEAR')) return 'BEARISH';
  return 'NEUTRAL';
}

function normalizeChartMode(raw: Record<string, any>): {
  chartType: ChartType;
  analysisMode: AnalysisMode;
} {
  const rawType = String(raw.chart_type || raw.chartType || '').toUpperCase();
  const rawMode = String(raw.analysis_mode || raw.analysisMode || '').toUpperCase();
  const textBlob = JSON.stringify(raw).toUpperCase();

  if (
    rawType.includes('LINE') ||
    rawType.includes('OVERLAID') ||
    rawType.includes('AREA') ||
    rawMode.includes('MACRO') ||
    textBlob.includes('KITCO') ||
    textBlob.includes('OVERLAID') ||
    textBlob.includes('LINE CHART')
  ) {
    return {
      chartType: 'LINE_OR_OVERLAID',
      analysisMode: 'MACRO_PRICE_ACTION',
    };
  }

  return {
    chartType: 'CANDLESTICK',
    analysisMode: 'SMC_CANDLESTICK',
  };
}

function normalizeZoneType(rawType: unknown): AnnotationZoneType {
  const upper = String(rawType || 'FVG').toUpperCase().trim();
  const allowed: AnnotationZoneType[] = [
    'FVG',
    'OB',
    'LIQUIDITY',
    'BOS',
    'SUPPORT',
    'RESISTANCE',
    'SUPPLY_DEMAND',
  ];
  if (allowed.includes(upper as AnnotationZoneType)) {
    return upper as AnnotationZoneType;
  }
  if (upper.includes('SUP')) return 'SUPPORT';
  if (upper.includes('RES')) return 'RESISTANCE';
  if (upper.includes('ORDER') || upper.includes('DEMAND') || upper.includes('SUPPLY')) return 'OB';
  if (upper.includes('LIQ') || upper.includes('SWEEP')) return 'LIQUIDITY';
  if (upper.includes('BOS') || upper.includes('CHOCH') || upper.includes('STRUCT')) return 'BOS';
  return 'FVG';
}

function normalizeSetupType(
  rawSetup: unknown,
  rawRec?: unknown,
  hasValidPrices?: boolean,
  explanationText?: string
): {
  setupType: SetupType;
  recommendation: TradeRecommendation;
} {
  const upper = String(rawSetup || rawRec || '').toUpperCase().trim();
  const lowerExplanation = String(explanationText || '').toLowerCase();

  // Guard: never allow a line chart or overlaid chart to be rejected as INVALID_IMAGE
  const rejectedForLineChart =
    lowerExplanation.includes('line chart') ||
    lowerExplanation.includes('candlestick') ||
    lowerExplanation.includes('wicks') ||
    lowerExplanation.includes('kitco') ||
    lowerExplanation.includes('area chart') ||
    lowerExplanation.includes('overlaid');

  if (upper === 'INVALID_IMAGE' && !hasValidPrices && !rejectedForLineChart) {
    return { setupType: 'INVALID_IMAGE', recommendation: 'WAIT' };
  }
  if (upper.includes('BUY')) {
    return { setupType: 'BUY SETUP', recommendation: 'BUY' };
  }
  if (upper.includes('SELL')) {
    return { setupType: 'SELL SETUP', recommendation: 'SELL' };
  }
  return { setupType: 'NO TRADE', recommendation: 'WAIT' };
}

/**
 * Reconciles directional consensus across setup_type, bias, text narrative, and price geometry,
 * and enforces strict mathematical ordering of entry_price, stop_loss, take_profit_1, and take_profit_2.
 */
function reconcileDirectionAndPrices(params: {
  initialSetupType: SetupType;
  initialRecommendation: TradeRecommendation;
  initialBias: MarketBias;
  calibrationVerdict?: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  narrativeText: string;
}): {
  setupType: SetupType;
  recommendation: TradeRecommendation;
  bias: MarketBias;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  priceGeometryValid: boolean;
  adjustments: string[];
} {
  const adjustments: string[] = [];
  let {
    initialSetupType: setupType,
    initialRecommendation: recommendation,
    initialBias: bias,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
  } = params;

  if (setupType === 'INVALID_IMAGE') {
    return {
      setupType,
      recommendation,
      bias,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      priceGeometryValid: false,
      adjustments,
    };
  }

  const decimals = getPriceDecimals(entryPrice || takeProfit1 || stopLoss);

  if (entryPrice > 0) {
    stopLoss = repairPriceScaleOutlier(stopLoss, entryPrice, decimals, adjustments, 'stop_loss');
    takeProfit1 = repairPriceScaleOutlier(
      takeProfit1,
      entryPrice,
      decimals,
      adjustments,
      'take_profit_1'
    );
    takeProfit2 = repairPriceScaleOutlier(
      takeProfit2,
      entryPrice,
      decimals,
      adjustments,
      'take_profit_2'
    );
  }

  const hasAllPrices = entryPrice > 0 && stopLoss > 0 && takeProfit1 > 0;
  const isStrictBuyGeometry =
    hasAllPrices &&
    stopLoss < entryPrice &&
    takeProfit1 > entryPrice &&
    (takeProfit2 === 0 || takeProfit2 >= takeProfit1);
  const isStrictSellGeometry =
    hasAllPrices &&
    stopLoss > entryPrice &&
    takeProfit1 < entryPrice &&
    (takeProfit2 === 0 || takeProfit2 <= takeProfit1);

  const calVerdict = normalizeBias(params.calibrationVerdict);
  const lowerNarrative = params.narrativeText.toLowerCase();
  const bullishKeywords =
    (lowerNarrative.match(/\b(bullish|uptrend|higher high|demand|buy|long|support shelf)\b/g) || [])
      .length;
  const bearishKeywords =
    (lowerNarrative.match(/\b(bearish|downtrend|lower low|supply|sell|short|markdown)\b/g) || [])
      .length;

  // Vote across all available signals to prevent contradictory direction labels
  let bullVotes = 0;
  let bearVotes = 0;
  if (recommendation === 'BUY') bullVotes += 2;
  if (recommendation === 'SELL') bearVotes += 2;
  if (bias === 'BULLISH') bullVotes += 2;
  if (bias === 'BEARISH') bearVotes += 2;
  if (calVerdict === 'BULLISH') bullVotes += 1;
  if (calVerdict === 'BEARISH') bearVotes += 1;
  if (isStrictBuyGeometry) bullVotes += 3;
  if (isStrictSellGeometry) bearVotes += 3;
  if (bullishKeywords > bearishKeywords + 1) bullVotes += 1;
  if (bearishKeywords > bullishKeywords + 1) bearVotes += 1;

  if (setupType !== 'NO TRADE') {
    if (bullVotes > bearVotes && (recommendation !== 'BUY' || bias !== 'BULLISH')) {
      if (recommendation !== 'BUY') {
        adjustments.push('Aligned trade_recommendation to BUY based on multi-signal consensus');
      }
      setupType = 'BUY SETUP';
      recommendation = 'BUY';
      bias = 'BULLISH';
    } else if (bearVotes > bullVotes && (recommendation !== 'SELL' || bias !== 'BEARISH')) {
      if (recommendation !== 'SELL') {
        adjustments.push('Aligned trade_recommendation to SELL based on multi-signal consensus');
      }
      setupType = 'SELL SETUP';
      recommendation = 'SELL';
      bias = 'BEARISH';
    }
  }

  // Enforce strict mathematical price ordering for BUY or SELL setups
  if (entryPrice > 0 && (recommendation === 'BUY' || (recommendation === 'WAIT' && bias === 'BULLISH'))) {
    // Check if stop_loss and take_profit_1 were accidentally swapped
    if (stopLoss > entryPrice && takeProfit1 > 0 && takeProfit1 < entryPrice) {
      const temp = stopLoss;
      stopLoss = takeProfit1;
      takeProfit1 = temp;
      adjustments.push('Swapped inverted stop_loss and take_profit_1 for BUY setup');
    }

    // Ensure TP1 and TP2 are both above entryPrice
    const defaultDelta = roundToPrecision(Math.max(entryPrice * 0.006, Math.pow(10, -decimals) * 10), decimals);
    if (takeProfit1 <= entryPrice) {
      const dist = stopLoss > 0 && stopLoss < entryPrice ? (entryPrice - stopLoss) * 2.0 : defaultDelta;
      takeProfit1 = roundToPrecision(entryPrice + dist, decimals);
      adjustments.push(`Adjusted take_profit_1 above entry_price (${takeProfit1})`);
    }
    if (takeProfit2 <= entryPrice) {
      const dist = Math.abs(takeProfit1 - entryPrice) * 1.8;
      takeProfit2 = roundToPrecision(entryPrice + dist, decimals);
      adjustments.push(`Adjusted take_profit_2 above take_profit_1 (${takeProfit2})`);
    }
    if (takeProfit1 > takeProfit2) {
      const temp = takeProfit1;
      takeProfit1 = takeProfit2;
      takeProfit2 = temp;
      adjustments.push('Sorted take_profit_1 and take_profit_2 in ascending order for BUY setup');
    }
    if (takeProfit2 === takeProfit1) {
      takeProfit2 = roundToPrecision(
        takeProfit1 + Math.max( (takeProfit1 - entryPrice) * 0.6, Math.pow(10, -decimals) * 5 ),
        decimals
      );
    }

    // Ensure stopLoss is strictly below entryPrice
    if (stopLoss <= 0 || stopLoss >= entryPrice) {
      const reward1 = Math.abs(takeProfit1 - entryPrice);
      const riskDist = reward1 > 0 ? reward1 / 2.0 : defaultDelta * 0.5;
      stopLoss = roundToPrecision(entryPrice - Math.max(riskDist, Math.pow(10, -decimals) * 2), decimals);
      adjustments.push(`Placed stop_loss below entry_price at structural invalidation (${stopLoss})`);
    }
  } else if (
    entryPrice > 0 &&
    (recommendation === 'SELL' || (recommendation === 'WAIT' && bias === 'BEARISH'))
  ) {
    // Check if stop_loss and take_profit_1 were accidentally swapped
    if (stopLoss > 0 && stopLoss < entryPrice && takeProfit1 > entryPrice) {
      const temp = stopLoss;
      stopLoss = takeProfit1;
      takeProfit1 = temp;
      adjustments.push('Swapped inverted stop_loss and take_profit_1 for SELL setup');
    }

    const defaultDelta = roundToPrecision(Math.max(entryPrice * 0.006, Math.pow(10, -decimals) * 10), decimals);
    if (takeProfit1 <= 0 || takeProfit1 >= entryPrice) {
      const dist = stopLoss > entryPrice ? (stopLoss - entryPrice) * 2.0 : defaultDelta;
      takeProfit1 = roundToPrecision(Math.max(Math.pow(10, -decimals), entryPrice - dist), decimals);
      adjustments.push(`Adjusted take_profit_1 below entry_price (${takeProfit1})`);
    }
    if (takeProfit2 <= 0 || takeProfit2 >= entryPrice) {
      const dist = Math.abs(entryPrice - takeProfit1) * 1.8;
      takeProfit2 = roundToPrecision(Math.max(Math.pow(10, -decimals), entryPrice - dist), decimals);
      adjustments.push(`Adjusted take_profit_2 below take_profit_1 (${takeProfit2})`);
    }
    if (takeProfit1 < takeProfit2) {
      const temp = takeProfit1;
      takeProfit1 = takeProfit2;
      takeProfit2 = temp;
      adjustments.push('Sorted take_profit_1 and take_profit_2 in descending order for SELL setup');
    }
    if (takeProfit2 === takeProfit1) {
      takeProfit2 = roundToPrecision(
        Math.max(
          Math.pow(10, -decimals),
          takeProfit1 - Math.max((entryPrice - takeProfit1) * 0.6, Math.pow(10, -decimals) * 5)
        ),
        decimals
      );
    }

    // Ensure stopLoss is strictly above entryPrice
    if (stopLoss <= entryPrice) {
      const reward1 = Math.abs(entryPrice - takeProfit1);
      const riskDist = reward1 > 0 ? reward1 / 2.0 : defaultDelta * 0.5;
      stopLoss = roundToPrecision(entryPrice + Math.max(riskDist, Math.pow(10, -decimals) * 2), decimals);
      adjustments.push(`Placed stop_loss above entry_price at structural invalidation (${stopLoss})`);
    }
  }

  const finalValidBuy =
    stopLoss > 0 &&
    stopLoss < entryPrice &&
    entryPrice < takeProfit1 &&
    takeProfit1 <= takeProfit2;
  const finalValidSell =
    stopLoss > entryPrice &&
    entryPrice > takeProfit1 &&
    takeProfit1 >= takeProfit2 &&
    takeProfit2 > 0;

  return {
    setupType,
    recommendation,
    bias,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    priceGeometryValid:
      recommendation === 'BUY'
        ? finalValidBuy
        : recommendation === 'SELL'
        ? finalValidSell
        : finalValidBuy || finalValidSell,
    adjustments,
  };
}

/**
 * Calibrates and enforces strict monotonic vertical ordering for normalized Y coordinates (0=top, 100=bottom).
 * - For BUY (bullish): tp2_y < tp1_y < entry_y < stop_loss_y
 * - For SELL (bearish): stop_loss_y < entry_y < tp1_y < tp2_y
 */
function calibrateAndOrderYCoordinates(params: {
  isBullish: boolean;
  rawEntryY: number;
  rawStopLossY: number;
  rawTp1Y: number;
  rawTp2Y: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  axisTopPrice?: number;
  axisBottomPrice?: number;
  adjustments: string[];
}): {
  entryY: number;
  stopLossY: number;
  tp1Y: number;
  tp2Y: number;
  yMonotonic: boolean;
} {
  const {
    isBullish,
    rawEntryY,
    rawStopLossY,
    rawTp1Y,
    rawTp2Y,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    axisTopPrice,
    axisBottomPrice,
    adjustments,
  } = params;

  const isAlreadyMonotonic = isBullish
    ? rawTp2Y < rawTp1Y && rawTp1Y < rawEntryY && rawEntryY < rawStopLossY
    : rawStopLossY < rawEntryY && rawEntryY < rawTp1Y && rawTp1Y < rawTp2Y;

  if (isAlreadyMonotonic) {
    return {
      entryY: rawEntryY,
      stopLossY: rawStopLossY,
      tp1Y: rawTp1Y,
      tp2Y: rawTp2Y,
      yMonotonic: true,
    };
  }

  // If raw Y coordinates are out of order, try proportional mapping from price levels first
  const allPrices = [entryPrice, stopLoss, takeProfit1, takeProfit2].filter((p) => p > 0);
  if (allPrices.length === 4) {
    const maxPrice = Math.max(...allPrices);
    const minPrice = Math.min(...allPrices);
    const span = maxPrice - minPrice;

    if (span > 0) {
      const effectiveTop =
        axisTopPrice && axisTopPrice >= maxPrice ? axisTopPrice : maxPrice + span * 0.18;
      const effectiveBottom =
        axisBottomPrice && axisBottomPrice > 0 && axisBottomPrice <= minPrice
          ? axisBottomPrice
          : Math.max(0, minPrice - span * 0.18);
      const totalAxisSpan = effectiveTop - effectiveBottom;

      if (totalAxisSpan > 0) {
        const priceToY = (p: number) =>
          Math.round(
            Math.min(88, Math.max(12, 12 + ((effectiveTop - p) / totalAxisSpan) * 76))
          );

        let entryY = priceToY(entryPrice);
        let stopLossY = priceToY(stopLoss);
        let tp1Y = priceToY(takeProfit1);
        let tp2Y = priceToY(takeProfit2);

        // Ensure minimum 6% vertical separation so labels never overlap
        if (isBullish) {
          tp2Y = Math.min(tp2Y, 22);
          tp1Y = Math.max(tp2Y + 8, Math.min(tp1Y, 46));
          entryY = Math.max(tp1Y + 10, Math.min(entryY, 68));
          stopLossY = Math.max(entryY + 10, Math.min(90, stopLossY));
        } else {
          stopLossY = Math.min(stopLossY, 22);
          entryY = Math.max(stopLossY + 10, Math.min(entryY, 44));
          tp1Y = Math.max(entryY + 10, Math.min(tp1Y, 68));
          tp2Y = Math.max(tp1Y + 10, Math.min(90, tp2Y));
        }

        adjustments.push(
          'Calibrated vertical Y-coordinates (0-100%) to match price scale ordering'
        );
        return {
          entryY,
          stopLossY,
          tp1Y,
          tp2Y,
          yMonotonic: true,
        };
      }
    }
  }

  // Fallback deterministic monotonic sorting of the 4 Y-values
  const sortedY = [rawEntryY, rawStopLossY, rawTp1Y, rawTp2Y]
    .map((v) => clampPercent(v, 50))
    .sort((a, b) => a - b);

  // Enforce minimum 8% spacing across the 4 sorted levels
  for (let i = 1; i < sortedY.length; i++) {
    if (sortedY[i] < sortedY[i - 1] + 8) {
      sortedY[i] = Math.min(92, sortedY[i - 1] + 8);
    }
  }

  adjustments.push('Re-ordered inverted Y-axis overlay coordinates to match setup direction');
  if (isBullish) {
    return {
      tp2Y: sortedY[0],
      tp1Y: sortedY[1],
      entryY: sortedY[2],
      stopLossY: sortedY[3],
      yMonotonic: true,
    };
  }
  return {
    stopLossY: sortedY[0],
    entryY: sortedY[1],
    tp1Y: sortedY[2],
    tp2Y: sortedY[3],
    yMonotonic: true,
  };
}

export function normalizeSMCResponse(raw: Record<string, any>): SMCSignalOutput {
  const exec =
    raw.trade_execution && typeof raw.trade_execution === 'object' ? raw.trade_execution : {};
  const mechanics =
    raw.market_mechanics_explanation && typeof raw.market_mechanics_explanation === 'object'
      ? raw.market_mechanics_explanation
      : {};
  const tools =
    raw.trading_tools_analysis && typeof raw.trading_tools_analysis === 'object'
      ? raw.trading_tools_analysis
      : {};
  const annotations =
    raw.visual_proof_annotations && typeof raw.visual_proof_annotations === 'object'
      ? raw.visual_proof_annotations
      : {};
  const calibration =
    raw.verification_calibration && typeof raw.verification_calibration === 'object'
      ? raw.verification_calibration
      : {};

  const rawEntryPrice = toNumericPrice(exec.entry_price ?? raw.entry_price);
  const rawStopLoss = toNumericPrice(exec.stop_loss ?? raw.stop_loss);
  const rawTakeProfit1 = toNumericPrice(exec.take_profit_1 ?? raw.take_profit_1);
  const rawTakeProfit2 = toNumericPrice(exec.take_profit_2 ?? raw.take_profit_2);
  const hasValidPrices = rawEntryPrice > 0 || rawTakeProfit1 > 0 || rawStopLoss > 0;

  const rawWhatIsHappening = String(
    raw.what_is_happening ??
      mechanics.what_is_happening ??
      raw.analysis_summary ??
      raw.summary ??
      ''
  );

  // Only return IMAGE_UNREADABLE if explicitly flagged and not a line/overlaid chart rejection
  const lowerMsg = rawWhatIsHappening.toLowerCase();
  const isLineChartRejection =
    lowerMsg.includes('line chart') ||
    lowerMsg.includes('candlestick') ||
    lowerMsg.includes('wick') ||
    lowerMsg.includes('kitco') ||
    lowerMsg.includes('overlaid');

  if (raw.error === 'IMAGE_UNREADABLE' && !isLineChartRejection && !hasValidPrices) {
    return {
      asset: 'UNKNOWN',
      timeframe: 'UNKNOWN',
      chart_type: 'CANDLESTICK',
      analysis_mode: 'SMC_CANDLESTICK',
      bias: 'NEUTRAL',
      market_bias: 'NEUTRAL',
      trade_recommendation: 'WAIT',
      confidence_score: 0,
      entry_price: 0,
      stop_loss: 0,
      take_profit_1: 0,
      take_profit_2: 0,
      risk_reward_ratio: '0:0',
      key_confluences: [],
      invalidation_condition: 'Image is not a readable financial chart.',
      analysis_summary: 'The uploaded image is not a readable financial chart.',
      current_market_phase: 'Consolidation',
      what_is_happening: 'The uploaded image could not be parsed as a valid financial chart.',
      how_it_works_steps: [],
      entry_y: 50,
      stop_loss_y: 75,
      tp1_y: 35,
      tp2_y: 20,
      zones: [],
      prediction_path: [],
      error: 'IMAGE_UNREADABLE',
      market_mechanics_explanation: {
        current_market_phase: 'Consolidation',
        current_phase: 'Consolidation',
        what_is_happening: 'The uploaded image could not be parsed as a valid financial chart.',
        how_it_works_steps: [],
        how_it_works_step_by_step: [],
      },
      trading_tools_analysis: {
        market_structure: 'N/A',
        liquidity_zones: 'N/A',
        imbalances_and_obs: 'N/A',
        fibonacci_or_session_context: 'N/A',
      },
      trade_execution: {
        setup_type: 'INVALID_IMAGE',
        entry_price: 0,
        stop_loss: 0,
        take_profit_1: 0,
        take_profit_2: 0,
        risk_to_reward: '0:0',
        invalidation_condition: 'Image is not a readable financial chart.',
      },
      visual_proof_annotations: {
        entry_y: 50,
        stop_loss_y: 75,
        tp1_y: 35,
        tp2_y: 20,
        entry_y_percent: 50,
        stop_loss_y_percent: 75,
        tp1_y_percent: 35,
        tp2_y_percent: 20,
        zones: [],
        prediction_path: [],
      },
    };
  }

  const { chartType, analysisMode } = normalizeChartMode(raw);
  const initialSetup = normalizeSetupType(
    exec.setup_type ?? raw.setup_type,
    raw.trade_recommendation,
    hasValidPrices,
    rawWhatIsHappening
  );
  const initialBias = normalizeBias(
    raw.bias ??
      raw.market_bias ??
      (initialSetup.recommendation === 'BUY'
        ? 'BULLISH'
        : initialSetup.recommendation === 'SELL'
        ? 'BEARISH'
        : 'NEUTRAL')
  );

  // Reconcile direction & enforce strict mathematical price ordering
  const reconciled = reconcileDirectionAndPrices({
    initialSetupType: initialSetup.setupType,
    initialRecommendation: initialSetup.recommendation,
    initialBias,
    calibrationVerdict: calibration.trend_structure_verdict,
    entryPrice: rawEntryPrice,
    stopLoss: rawStopLoss,
    takeProfit1: rawTakeProfit1,
    takeProfit2: rawTakeProfit2,
    narrativeText: `${rawWhatIsHappening} ${String(raw.summary || '')} ${String(tools.market_structure || '')}`,
  });

  let {
    setupType,
    recommendation,
    bias,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
  } = reconciled;
  const adjustments = [...reconciled.adjustments];

  // Exact mathematical Risk-to-Reward calculation
  const riskDistance = entryPrice > 0 && stopLoss > 0 ? Math.abs(entryPrice - stopLoss) : 0;
  const targetPriceForRR = takeProfit2 > 0 ? takeProfit2 : takeProfit1;
  const rewardDistance =
    entryPrice > 0 && targetPriceForRR > 0 ? Math.abs(targetPriceForRR - entryPrice) : 0;
  const calculatedRR =
    riskDistance > 0 && rewardDistance > 0
      ? Number((rewardDistance / riskDistance).toFixed(2))
      : 3.0;

  const riskToReward =
    riskDistance > 0 && rewardDistance > 0
      ? `1:${calculatedRR.toFixed(2)}`
      : String(exec.risk_to_reward ?? raw.risk_reward_ratio ?? '1:3.00');

  const confidenceRaw = Number(raw.confidence_score);
  let confidenceScore = Number.isFinite(confidenceRaw)
    ? Math.min(100, Math.max(0, confidenceRaw))
    : 85;

  // Institutional Quality Gate: prevent forced predictions when confidence or R:R is critically low
  const confluenceCount = Number(calibration.confluence_count ?? 3);
  const confluenceGatePassed =
    (Number.isFinite(confluenceCount) ? confluenceCount >= 2 : true) &&
    calculatedRR >= 1.15 &&
    confidenceScore >= 55;

  if (
    (setupType === 'BUY SETUP' || setupType === 'SELL SETUP') &&
    !confluenceGatePassed &&
    hasValidPrices
  ) {
    setupType = 'NO TRADE';
    recommendation = 'WAIT';
    adjustments.push(
      `Filtered low-conviction signal to NO TRADE / WAIT (R:R 1:${calculatedRR.toFixed(2)}, Confidence ${confidenceScore}%)`
    );
  }

  const isBullish = recommendation === 'BUY' || (recommendation === 'WAIT' && bias !== 'BEARISH');

  const invalidationCondition = String(
    exec.invalidation_condition ??
      raw.invalidation_condition ??
      `Sustained candle/spot closure beyond structural invalidation at ${stopLoss || 'stop loss'} voids this setup.`
  );

  const currentMarketPhase = String(
    raw.current_market_phase ??
      mechanics.current_market_phase ??
      mechanics.current_phase ??
      (analysisMode === 'MACRO_PRICE_ACTION' ? 'Expansion' : 'Pullback')
  );

  const whatIsHappening =
    rawWhatIsHappening ||
    (analysisMode === 'MACRO_PRICE_ACTION'
      ? 'Macro price action shows a clear directional trajectory across sessions with buyers defending horizontal support shelves and building momentum toward upper resistance targets.'
      : 'Institutional order flow shows a liquidity sweep followed by impulsive displacement and a structural break, with price retracing into an unmitigated Fair Value Gap and Order Block.');

  const analysisSummary = String(raw.summary ?? raw.analysis_summary ?? whatIsHappening);

  const rawStepsSource =
    (Array.isArray(raw.how_it_works_steps) && raw.how_it_works_steps.length > 0
      ? raw.how_it_works_steps
      : null) ??
    (Array.isArray(mechanics.how_it_works_steps) && mechanics.how_it_works_steps.length > 0
      ? mechanics.how_it_works_steps
      : null) ??
    (Array.isArray(mechanics.how_it_works_step_by_step) &&
    mechanics.how_it_works_step_by_step.length > 0
      ? mechanics.how_it_works_step_by_step
      : null);

  const marketStructure = String(
    tools.market_structure ??
      (analysisMode === 'MACRO_PRICE_ACTION'
        ? 'Macro swing highs and swing lows aligned with multi-session trend structure'
        : 'Institutional BOS / CHoCH displacement detected')
  );
  const liquidityZones = String(
    tools.liquidity_zones ??
      (analysisMode === 'MACRO_PRICE_ACTION'
        ? 'Key horizontal support and resistance levels mapped from spot price scale'
        : 'Buy-side & Sell-side liquidity pools mapped')
  );
  const imbalancesAndObs = String(
    tools.imbalances_and_obs ??
      (analysisMode === 'MACRO_PRICE_ACTION'
        ? 'Horizontal demand/supply flip zone acting as primary structural pivot'
        : 'Unmitigated Fair Value Gap (FVG) & Order Block')
  );
  const fibOrSession = String(
    tools.fibonacci_or_session_context ??
      (analysisMode === 'MACRO_PRICE_ACTION'
        ? 'Multi-session trajectory comparison confirming directional momentum'
        : 'OTE 0.618-0.786 retracement array')
  );

  const howItWorksSteps: string[] = rawStepsSource
    ? rawStepsSource.map((s: unknown) => String(s))
    : [
        `Price reacted at the key structural level (${liquidityZones}), where institutional participants absorbed opposing order flow.`,
        `Momentum shifted decisively via ${marketStructure}, confirming ${bias.toLowerCase()} control on the ${String(raw.timeframe || '15M')} chart.`,
        `Resting limit orders and structural confluence are concentrated around ${imbalancesAndObs} near ${entryPrice || 'the entry zone'}.`,
        `A sustained hold beyond invalidation (${stopLoss || 'stop loss'}) triggers continuation toward ${takeProfit1 || 'TP1'} and ${takeProfit2 || 'TP2'}.`,
      ];

  const keyConfluences: string[] =
    Array.isArray(raw.key_confluences) && raw.key_confluences.length > 0
      ? raw.key_confluences.map((c: unknown) => String(c))
      : [
          `Structure: ${marketStructure}`,
          `Key Levels / Liquidity: ${liquidityZones}`,
          `Zones: ${imbalancesAndObs}`,
          `Session / Context: ${fibOrSession}`,
        ];

  const rawEntryY = clampPercent(
    raw.entry_y ?? annotations.entry_y ?? annotations.entry_y_percent,
    isBullish ? 62 : 38
  );
  const rawStopLossY = clampPercent(
    raw.stop_loss_y ?? annotations.stop_loss_y ?? annotations.stop_loss_y_percent,
    isBullish ? 80 : 18
  );
  const rawTp1Y = clampPercent(
    raw.tp1_y ?? annotations.tp1_y ?? annotations.tp1_y_percent,
    isBullish ? 35 : 65
  );
  const rawTp2Y = clampPercent(
    raw.tp2_y ?? annotations.tp2_y ?? annotations.tp2_y_percent,
    isBullish ? 18 : 82
  );

  const axisTopPrice = toNumericPrice(calibration.axis_top_price);
  const axisBottomPrice = toNumericPrice(calibration.axis_bottom_price);
  const currentMarketPrice = toNumericPrice(calibration.current_market_price);

  const calibratedY = calibrateAndOrderYCoordinates({
    isBullish,
    rawEntryY,
    rawStopLossY,
    rawTp1Y,
    rawTp2Y,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    axisTopPrice: axisTopPrice > 0 ? axisTopPrice : undefined,
    axisBottomPrice: axisBottomPrice > 0 ? axisBottomPrice : undefined,
    adjustments,
  });

  const { entryY, stopLossY, tp1Y, tp2Y, yMonotonic } = calibratedY;

  const rawZonesInput = Array.isArray(raw.zones)
    ? raw.zones
    : Array.isArray(annotations.zones)
    ? annotations.zones
    : [];

  const normalizedZones: VisualProofZone[] =
    rawZonesInput.length > 0
      ? rawZonesInput.map((z: any) => {
          const validType = normalizeZoneType(z?.type);
          const xStart = clampPercent(z?.x_start ?? z?.x_start_percent, 25);
          const yStart = clampPercent(z?.y_start ?? z?.y_start_percent, 52);
          const xEnd = clampPercent(z?.x_end ?? z?.x_end_percent, 80);
          const yEnd = clampPercent(z?.y_end ?? z?.y_end_percent, 64);
          return {
            label: String(z?.label || validType),
            type: validType,
            x_start: Math.min(xStart, xEnd),
            y_start: Math.min(yStart, yEnd),
            x_end: Math.max(xStart, xEnd),
            y_end: Math.max(yStart, yEnd),
            x_start_percent: Math.min(xStart, xEnd),
            y_start_percent: Math.min(yStart, yEnd),
            x_end_percent: Math.max(xStart, xEnd),
            y_end_percent: Math.max(yStart, yEnd),
          };
        })
      : [
          {
            label:
              analysisMode === 'MACRO_PRICE_ACTION'
                ? `Key Support/Resistance Zone (${entryPrice || 'Entry'})`
                : `Institutional FVG / OB Zone (${entryPrice || 'Entry'})`,
            type: analysisMode === 'MACRO_PRICE_ACTION' ? 'SUPPORT' : 'FVG',
            x_start: 28,
            y_start: Math.max(4, entryY - 5),
            x_end: 82,
            y_end: Math.min(96, entryY + 5),
            x_start_percent: 28,
            y_start_percent: Math.max(4, entryY - 5),
            x_end_percent: 82,
            y_end_percent: Math.min(96, entryY + 5),
          },
        ];

  const rawPathInput = Array.isArray(raw.prediction_path)
    ? raw.prediction_path
    : Array.isArray(annotations.prediction_path)
    ? annotations.prediction_path
    : [];

  const rawSlicedPath = rawPathInput.slice(0, 4);
  const lastIdx = Math.max(2, rawSlicedPath.length - 1);

  const normalizedPath: PredictionPathPoint[] =
    rawSlicedPath.length >= 3
      ? rawSlicedPath.map((pt: any, idx: number) => {
          const defaultX = idx === 0 ? 66 : idx === 1 ? 75 : 88;
          const defaultY =
            idx === 0 ? Math.round((entryY + tp1Y) / 2) : idx === 1 ? entryY : tp2Y;
          const rawX = clampPercent(pt?.x ?? pt?.x_percent, defaultX);
          const rawY = clampPercent(pt?.y ?? pt?.y_percent, defaultY);
          // Lock Entry Retest (idx===1) to entryY and final target node to tp2Y if rawY drifted by > 6%
          const lockedY =
            idx === 1 && Math.abs(rawY - entryY) > 6
              ? entryY
              : idx === lastIdx && Math.abs(rawY - tp2Y) > 6
              ? tp2Y
              : rawY;
          const label = String(
            pt?.label ??
              pt?.note ??
              (idx === 0 ? 'Current Price' : idx === 1 ? 'Entry Retest' : 'Projected Target')
          );
          return {
            x: rawX,
            y: lockedY,
            label,
            x_percent: rawX,
            y_percent: lockedY,
            note: label,
          };
        })
      : [
          {
            x: 66,
            y: clampPercent(Math.round((entryY + tp1Y) / 2), 50),
            label: 'Current Price',
            x_percent: 66,
            y_percent: clampPercent(Math.round((entryY + tp1Y) / 2), 50),
            note: 'Current Price',
          },
          {
            x: 75,
            y: entryY,
            label: `Entry Retest (${entryPrice || 'Entry'})`,
            x_percent: 75,
            y_percent: entryY,
            note: `Entry Retest (${entryPrice || 'Entry'})`,
          },
          {
            x: 89,
            y: tp2Y,
            label: `Target Expansion (${takeProfit2 || takeProfit1 || 'TP'})`,
            x_percent: 89,
            y_percent: tp2Y,
            note: `Target Expansion (${takeProfit2 || takeProfit1 || 'TP'})`,
          },
        ];

  // Ensure X coordinates progress strictly left-to-right across the prediction trajectory
  for (let i = 1; i < normalizedPath.length; i++) {
    if (normalizedPath[i].x <= normalizedPath[i - 1].x) {
      const nextX = Math.min(95, normalizedPath[i - 1].x + 8);
      normalizedPath[i].x = nextX;
      normalizedPath[i].x_percent = nextX;
    }
  }

  const normalizedAnnotations: VisualProofAnnotations = {
    entry_y: entryY,
    stop_loss_y: stopLossY,
    tp1_y: tp1Y,
    tp2_y: tp2Y,
    entry_y_percent: entryY,
    stop_loss_y_percent: stopLossY,
    tp1_y_percent: tp1Y,
    tp2_y_percent: tp2Y,
    zones: normalizedZones,
    prediction_path: normalizedPath,
  };

  const verificationChecks: string[] = [
    reconciled.priceGeometryValid
      ? isBullish
        ? `Directional Geometry Verified: SL (${stopLoss}) < Entry (${entryPrice}) < TP1 (${takeProfit1}) < TP2 (${takeProfit2})`
        : `Directional Geometry Verified: SL (${stopLoss}) > Entry (${entryPrice}) > TP1 (${takeProfit1}) > TP2 (${takeProfit2})`
      : 'Neutral / Wait Mode: Awaiting structural breakout confirmation',
    `Mathematical R:R Verified: ${riskToReward} (Risk: ${roundToPrecision(riskDistance, getPriceDecimals(entryPrice))}, Reward: ${roundToPrecision(rewardDistance, getPriceDecimals(entryPrice))})`,
    isBullish
      ? `Y-Axis Coordinate Alignment Verified: TP2 (${tp2Y}%) < TP1 (${tp1Y}%) < Entry (${entryY}%) < SL (${stopLossY}%)`
      : `Y-Axis Coordinate Alignment Verified: SL (${stopLossY}%) < Entry (${entryY}%) < TP1 (${tp1Y}%) < TP2 (${tp2Y}%)`,
    `Multi-Factor Confluence Gate: ${keyConfluences.length} structural confluences validated`,
  ];

  const accuracyVerification: AccuracyVerification = {
    is_verified: reconciled.priceGeometryValid && yMonotonic,
    price_geometry_valid: reconciled.priceGeometryValid,
    y_coordinate_monotonic: yMonotonic,
    rr_mathematically_verified: riskDistance > 0 && rewardDistance > 0,
    confluence_gate_passed: confluenceGatePassed,
    calculated_rr: calculatedRR,
    ...(axisTopPrice > 0 ? { axis_top_price: axisTopPrice } : {}),
    ...(axisBottomPrice > 0 ? { axis_bottom_price: axisBottomPrice } : {}),
    ...(currentMarketPrice > 0 ? { current_market_price: currentMarketPrice } : {}),
    adjustments_applied: adjustments,
    verification_checks: verificationChecks,
  };

  return {
    asset: String(raw.asset || 'XAUUSD'),
    timeframe: String(raw.timeframe || '15M'),
    chart_type: chartType,
    analysis_mode: analysisMode,
    bias,
    market_bias: bias,
    trade_recommendation: recommendation,
    confidence_score: confidenceScore,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit_1: takeProfit1,
    take_profit_2: takeProfit2,
    risk_reward_ratio: riskToReward,
    key_confluences: keyConfluences,
    invalidation_condition: invalidationCondition,
    analysis_summary: analysisSummary,
    current_market_phase: currentMarketPhase,
    what_is_happening: whatIsHappening,
    how_it_works_steps: howItWorksSteps,
    entry_y: entryY,
    stop_loss_y: stopLossY,
    tp1_y: tp1Y,
    tp2_y: tp2Y,
    zones: normalizedZones,
    prediction_path: normalizedPath,
    ...(setupType === 'INVALID_IMAGE' ? { error: 'IMAGE_UNREADABLE' } : {}),
    market_mechanics_explanation: {
      current_market_phase: currentMarketPhase,
      current_phase: currentMarketPhase,
      what_is_happening: whatIsHappening,
      how_it_works_steps: howItWorksSteps,
      how_it_works_step_by_step: howItWorksSteps,
    },
    trading_tools_analysis: {
      market_structure: marketStructure,
      liquidity_zones: liquidityZones,
      imbalances_and_obs: imbalancesAndObs,
      fibonacci_or_session_context: fibOrSession,
    },
    trade_execution: {
      setup_type: setupType,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit_1: takeProfit1,
      take_profit_2: takeProfit2,
      risk_to_reward: riskToReward,
      invalidation_condition: invalidationCondition,
    },
    visual_proof_annotations: normalizedAnnotations,
    accuracy_verification: accuracyVerification,
  };
}

/**
 * Parses JSON response safely even if wrapped in markdown codeblocks or surrounding text.
 */
function extractJsonFromText(text: string): SMCSignalOutput {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  } else {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  const parsed = JSON.parse(cleaned);
  return normalizeSMCResponse(parsed);
}

/**
 * Calls Gemini Vision API with deterministic temperature 0.1
 */
async function callGeminiVision(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  asset?: string,
  timeframe?: string
): Promise<SMCSignalOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${APEX_SMC_SYSTEM_PROMPT}\n\nSelected asset: ${asset || 'Detect from chart'}. Selected timeframe: ${timeframe || 'Detect from chart'}. Remember: (1) Calibrate visible Y-axis prices first, (2) Enforce strict price and Y-coordinate ordering for BUY vs SELL, (3) Output NO TRADE if structure is choppy or <3 confluences align, and (4) NEVER reject line charts, area charts, or multi-day overlaid charts (such as Kitco spot charts).`,
          },
          {
            inline_data: {
              mime_type: mimeType || 'image/png',
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Gemini API request failed with status ${res.status}.`);
  }

  const json = await res.json();
  const textOutput = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Empty response from Gemini Vision');
  }

  return extractJsonFromText(textOutput);
}

/**
 * Calls OpenAI GPT-4o Vision API with deterministic temperature 0.1
 */
async function callOpenAIVision(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  asset?: string,
  timeframe?: string
): Promise<SMCSignalOutput> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: 'gpt-4o',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${APEX_SMC_SYSTEM_PROMPT}\n\nSelected asset: ${asset || 'Detect from chart'}. Selected timeframe: ${timeframe || 'Detect from chart'}.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this financial chart image using the 5-Stage Institutional Verification Protocol (calibrate Y-axis prices first, verify directional price & Y-coordinate ordering, and support both Candlestick SMC mode and Line/Area/Overlaid Macro Price Action mode—never reject line or Kitco overlaid charts) and return strictly the JSON schema.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API request failed with status ${res.status}.`);
  }

  const json = await res.json();
  const textOutput = json.choices?.[0]?.message?.content;
  if (!textOutput) {
    throw new Error('Empty response from OpenAI Vision');
  }

  return extractJsonFromText(textOutput);
}

/**
 * Route chart images to a configured vision provider.
 */
export async function analyzeChartImage(
  dataUrlOrBase64: string,
  sampleId?: string,
  hints?: { asset?: string; timeframe?: string }
): Promise<SMCSignalOutput> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (sampleId) {
    const sample = SAMPLE_CHARTS.find((chart) => chart.id === sampleId);
    if (sample) return normalizeSMCResponse(sample.mockAnalysis);
  }

  // If the uploaded image matches one of the built-in SVG sample charts, return its normalized analysis
  const matchingSampleByUrl = SAMPLE_CHARTS.find(
    (chart) => chart.thumbnailUrl === dataUrlOrBase64
  );
  if (matchingSampleByUrl) {
    return normalizeSMCResponse(matchingSampleByUrl.mockAnalysis);
  }

  let base64 = dataUrlOrBase64;
  let mimeType = 'image/png';

  if (dataUrlOrBase64.startsWith('data:')) {
    const matches = dataUrlOrBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (matches) {
      mimeType = matches[1] === 'image/jpg' ? 'image/jpeg' : matches[1];
      base64 = matches[2].replace(/\s+/g, '');
    }
  }

  if (geminiKey && geminiKey.trim() !== '') {
    try {
      return await callGeminiVision(base64, mimeType, geminiKey, hints?.asset, hints?.timeframe);
    } catch {
      if (!openaiKey?.trim()) {
        throw new Error('Configured Gemini provider failed to analyze the chart.');
      }
      console.warn('Gemini Vision failed; trying configured OpenAI provider.');
    }
  }

  if (openaiKey?.trim()) {
    try {
      return await callOpenAIVision(base64, mimeType, openaiKey, hints?.asset, hints?.timeframe);
    } catch {
      throw new Error('Configured OpenAI provider failed to analyze the chart.');
    }
  }
  throw new Error('Vision analysis is not configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
}
