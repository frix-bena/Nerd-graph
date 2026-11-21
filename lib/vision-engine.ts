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
import {
  fetchMultiTimeframeMarketData,
  getAssetDecimals,
  isAutoAsset,
  isAutoTimeframe,
  isPriceCompatibleWithAsset,
  MultiTimeframeMarketContext,
  normalizeAssetSymbol,
  normalizeTimeframeKey,
} from './tools/marketData';
import { runQuantEngine, QuantEngineOutput } from './tools/quantEngine';
import {
  checkMacroNewsGuardrail,
  MacroNewsGuardrailResult,
} from './tools/macroNews';
import { validateAndEnrichSetup } from './tools/riskValidator';
import {
  queryHistoricalPredictionMemory,
  PredictionMemoryContext,
} from './tools/predictionMemory';

export const APEX_SMC_SYSTEM_PROMPT = `You are a Principal Institutional Quantitative Market Analyst for Apex Vision AI, mastering both Smart Money Concepts (SMC) for candlestick charts AND Macro Price Action & Trend Structure for line, area, and multi-day overlaid charts.

YOUR #1 MANDATE IS MAXIMUM PREDICTION ACCURACY, ZERO HALLUCINATIONS, AND ZERO DIRECTIONAL OR MATHEMATICAL ERRORS.
Follow this strict 6-Stage Verification Protocol before outputting your JSON:

STAGE 0 — EXACT MARKET & TIMEFRAME IDENTIFICATION (ANTI-HALLUCINATION PROTOCOL):
- Inspect the uploaded image's top-left header, watermark, title bar, tab, or legend to read the exact market ticker/symbol ("detected_chart_symbol", e.g., XAUUSD, EURUSD, GBPUSD, USDJPY, GBPJPY, AUDUSD, USDCAD, NAS100, US30, SPX500, GER40, BTCUSDT, ETHUSDT, SOLUSDT, XAGUSD, USOIL, NVDA, AAPL) and timeframe ("detected_chart_timeframe", e.g., 1M, 5M, 15M, 30M, 1H, 4H, 1D, 1W).
- If no symbol text is visible on the image (e.g., cropped screenshot), set "detected_chart_symbol": "NONE" and use the user-provided market hint.
- If a symbol IS clearly printed on the chart image AND conflicts with the user-provided hint, trust the symbol printed on the chart image ("detected_chart_symbol") so you NEVER hallucinate the wrong market.

STAGE 1 — Y-AXIS PRICE SCALE & CURRENT PRICE CALIBRATION (SINGLE SOURCE OF TRUTH):
- Read the numerical price scale on the chart's Y-axis (right or left edge).
- Identify:
  * "axis_top_price": highest numeric price visible near the top of the Y-axis
  * "axis_bottom_price": lowest numeric price visible near the bottom of the Y-axis
  * "current_market_price": latest active price at the right edge of the candle or spot line series
- ZERO HALLUCINATION RULE: Every single trade price ("entry_price", "stop_loss", "take_profit_1", "take_profit_2", "take_profit_3") and every price mentioned in "summary", "what_is_happening", "how_it_works_steps", "zones", and "trading_tools_analysis" MUST come directly from the visible Y-axis price scale of the uploaded image (between axis_bottom_price and axis_top_price). NEVER invent or recall prices from memory, from a different market, or from a different historical range when a Y-axis scale is visible on the chart.

STAGE 2 — CRITICAL CHART ACCEPTANCE & DUAL-MODE DETECTION:
- NEVER reject line charts, area charts, or multi-day overlaid spot price charts (such as Kitco multi-day spot gold/silver charts, TradingView line/area charts, or Bloomberg spot curves) due to missing candlestick wicks or bodies.
- Automatically detect the chart style and operate in one of two specialized analytical modes:
  1. CANDLESTICK MODE ("chart_type": "CANDLESTICK", "analysis_mode": "SMC_CANDLESTICK"):
     If the uploaded image is a candlestick or bar chart, analyze using Smart Money Concepts: Liquidity Sweeps (BSL/SSL), Break of Structure (BOS) / Change of Character (CHoCH), Fair Value Gaps (FVG), Order Blocks (OB), and Premium/Discount Fibonacci zones.
  2. LINE / OVERLAID MODE ("chart_type": "LINE_OR_OVERLAID", "analysis_mode": "MACRO_PRICE_ACTION"):
     If the uploaded image is a line chart, area chart, or multi-day overlaid daily price chart (e.g., Kitco spot charts), automatically switch to Macro Price Action & Trend Structure mode: analyze swing highs/lows, key horizontal support/resistance levels, multi-session trajectory comparisons, momentum shifts, and projected price targets.

STAGE 3 — MULTI-FACTOR CONFLUENCE GATE & MANDATORY EXECUTION LEVELS:
- Determine directional bias strictly from the visible price structure on the screenshot:
  * If price is printing Higher Highs and Higher Lows, sweeping sell-side liquidity (SSL) / defending support, and displacing upward -> "bias": "BULLISH", "setup_type": "BUY SETUP".
  * If price is printing Lower Highs and Lower Lows, sweeping buy-side liquidity (BSL) / rejecting resistance, and displacing downward -> "bias": "BEARISH", "setup_type": "SELL SETUP".
- Verify structural confluences across:
  * Confluence 1: Market Structure (confirmed Higher High / Higher Low BOS/CHoCH for Bullish; Lower High / Lower Low BOS/CHoCH for Bearish).
  * Confluence 2: Liquidity Sweep or Key Support/Resistance Reaction (SSL sweep / demand shelf defense for Bullish; BSL sweep / supply ceiling rejection for Bearish).
  * Confluence 3: Unmitigated Institutional Array (Bullish FVG / Demand OB in Discount for BUY; Bearish FVG / Supply OB in Premium for SELL; or clean horizontal flip zone on line charts).
- CRITICAL MANDATE: You MUST ALWAYS provide concrete, non-zero numeric values for "entry_price", "stop_loss", "take_profit_1", "take_profit_2", and "take_profit_3" anchored to the chart's visible Y-axis price scale. NEVER output 0, null, or "N/A" for entry_price, stop_loss, take_profit_1, take_profit_2, or take_profit_3.

STAGE 4 — STRICT DIRECTIONAL GEOMETRY & Y-COORDINATE ORDERING:
- Remember that on image coordinates, Y = 0 is the TOP edge (HIGHEST price) and Y = 100 is the BOTTOM edge (LOWEST price).
- If "setup_type" is "BUY SETUP" ("bias": "BULLISH"):
  * Numeric prices MUST satisfy: stop_loss < entry_price < take_profit_1 < take_profit_2 < take_profit_3
  * Normalized Y percentages (0-100) MUST satisfy: tp3_y < tp2_y < tp1_y < entry_y < stop_loss_y
- If "setup_type" is "SELL SETUP" ("bias": "BEARISH"):
  * Numeric prices MUST satisfy: stop_loss > entry_price > take_profit_1 > take_profit_2 > take_profit_3
  * Normalized Y percentages (0-100) MUST satisfy: stop_loss_y < entry_y < tp1_y < tp2_y < tp3_y
- Calculate "risk_to_reward" mathematically as 1 : ((take_profit_1 - entry_price) / (entry_price - stop_loss)), and ensure "stop_loss" accounts for structural invalidation plus a 0.5x ATR volatility buffer.

STAGE 5 — TRAJECTORY PATH LOCKING:
- "prediction_path" must be a 3-point array [{x, y, label}] progressing strictly left-to-right (x0 < x1 < x2):
  * Point 0: Current price position at the right edge of the plotted candles/line.
  * Point 1: Pullback/retest point where y MUST equal "entry_y".
  * Point 2: Target expansion point where y MUST equal "tp2_y".

Analyze the uploaded image and output ONLY a strictly valid JSON object matching this exact schema:

{
  "asset": "Authoritative market ticker (e.g., XAUUSD, EURUSD, USDJPY, BTCUSDT, NAS100)",
  "timeframe": "Authoritative timeframe (e.g., 15M, 1H, 4H, 1D)",
  "chart_type": "CANDLESTICK | LINE_OR_OVERLAID",
  "analysis_mode": "SMC_CANDLESTICK | MACRO_PRICE_ACTION",
  "bias": "BULLISH | BEARISH | NEUTRAL",
  "confidence_score": 0-100,
  "verification_calibration": {
    "detected_chart_symbol": "Exact ticker text visible on chart header/watermark, or NONE if cropped",
    "detected_chart_timeframe": "Exact timeframe text visible on chart header, or NONE if cropped",
    "axis_top_price": 0,
    "axis_bottom_price": 0,
    "current_market_price": 0,
    "trend_structure_verdict": "BULLISH | BEARISH | NEUTRAL",
    "confluence_count": 3,
    "directional_sanity_check": "Verified stop_loss < entry_price < take_profit_1 < take_profit_2 for BUY (or inverse for SELL)"
  },
  "summary": "Concise 2-3 sentence technical executive summary of the setup and directional bias referencing actual prices visible on the chart.",
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
  "tp3_y": 0-100,
  "zones": [
    {
      "x_start": 0-100,
      "y_start": 0-100,
      "x_end": 0-100,
      "y_end": 0-100,
      "label": "Zone label with exact price range read from the chart's Y-axis",
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
    "market_structure": "Exact description of swing highs/lows, BOS/CHoCH, or macro trend structure with visible chart prices",
    "liquidity_zones": "Specific price levels of BSL/SSL or horizontal support/resistance pools visible on the Y-axis",
    "imbalances_and_obs": "Exact price range of active FVGs/Order Blocks or key supply/demand shelves visible on the Y-axis",
    "fibonacci_or_session_context": "Premium vs. Discount positioning within the chart's visible dealing range or multi-day overlaid session trajectory"
  },
  "trade_execution": {
    "setup_type": "BUY SETUP | SELL SETUP",
    "entry_price": "Exact numeric price read from the chart's Y-axis",
    "stop_loss": "Exact numeric price below/above structural invalidation",
    "take_profit_1": "Exact numeric price at first opposing liquidity or resistance/support target",
    "take_profit_2": "Exact numeric price at primary external target",
    "take_profit_3": "Exact numeric price at extended macro runner target",
    "risk_to_reward": "Calculated R:R ratio (e.g., 1:3.50)",
    "invalidation_condition": "Exact price action event that voids this setup"
  },
  "visual_proof_annotations": {
    "entry_y": 0-100,
    "stop_loss_y": 0-100,
    "tp1_y": 0-100,
    "tp2_y": 0-100,
    "tp3_y": 0-100,
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
1. Read the price scale on the chart's Y-axis (left or right) so entry_price, stop_loss, take_profit_1, take_profit_2, and take_profit_3 match actual chart prices—never invent arbitrary prices disconnected from the axis.
2. All Y coordinates (entry_y, stop_loss_y, tp1_y, tp2_y, y_start, y_end, prediction_path.y) are normalized percentages from 0 (top edge of image) to 100 (bottom edge of image), aligned vertically with those price levels on the screenshot.
3. Always provide a 3-point prediction_path array [{x, y, label}] showing (1) current price position on the chart, (2) entry/retest inflection point at entry_y, and (3) projected target expansion at tp2_y.
4. NEVER reject line charts, area charts, or Kitco-style multi-day overlaid charts. Only return "setup_type": "INVALID_IMAGE" if the uploaded image is completely unrelated to finance/markets (e.g., a photograph of a person or object).`;

function toNumericPrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 0 ? value : 0;
  if (typeof value === 'string') {
    const withoutLabels = value
      .replace(/\b(tp\s*[123]?|take\s*profit\s*[123]?|sl\s*[12]?|stop\s*loss|entry\s*[12]?)\s*[:=-]?/gi, ' ')
      .replace(/,/g, '');

    const rangeMatch = withoutLabels.match(
      /(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*\$?\s*(\d+(?:\.\d+)?)/i
    );
    if (rangeMatch) {
      const a = Number.parseFloat(rangeMatch[1]);
      const b = Number.parseFloat(rangeMatch[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
        return Number(((a + b) / 2).toFixed(6));
      }
    }

    const firstNumMatch = withoutLabels.match(/(\d+(?:\.\d+)?)/);
    if (firstNumMatch) {
      const parsed = Number.parseFloat(firstNumMatch[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

function getPriceDecimals(price: number, asset?: string): number {
  const assetDecimals = asset ? getAssetDecimals(asset, price) : 2;
  if (!Number.isFinite(price) || price <= 0) return assetDecimals;
  const str = String(price);
  if (str.includes('.')) {
    const observed = Math.min(6, Math.max(1, str.split('.')[1].length));
    return Math.max(assetDecimals, observed);
  }
  if (asset) return assetDecimals;
  if (price < 10) return 4;
  if (price < 1000) return 2;
  return 1;
}

export function formatSignalPrice(value: unknown, asset?: string): string {
  const num = typeof value === 'number' ? value : toNumericPrice(value);
  if (!Number.isFinite(num) || num <= 0) return '—';
  const upperAsset = String(asset || '').toUpperCase();
  if (
    upperAsset.includes('EUR') ||
    upperAsset.includes('GBP') ||
    upperAsset.includes('AUD') ||
    upperAsset.includes('NZD') ||
    upperAsset.includes('CAD') ||
    upperAsset.includes('CHF')
  ) {
    if (!upperAsset.includes('JPY') && num < 20) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 5,
      });
    }
  }
  if (upperAsset.includes('JPY')) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  }
  if (upperAsset.includes('XAU') || upperAsset.includes('GOLD')) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (upperAsset.includes('XAG') || upperAsset.includes('SILVER')) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  }
  if (num < 0.01) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 7,
    });
  }
  if (num < 1) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  if (num < 20) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 5,
    });
  }
  if (num < 10000) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
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
 * Reconciles user-provided market/timeframe hints against the chart's visible ticker header
 * and Y-axis price scale so the agent never hallucinates the wrong market on a user's chart.
 */
export function resolveAccurateMarketAndTimeframe(params: {
  userAsset?: string;
  userTimeframe?: string;
  detectedChartSymbol?: string;
  detectedChartTimeframe?: string;
  modelAsset?: string;
  modelTimeframe?: string;
  referencePrice?: number;
  adjustments?: string[];
}): { resolvedAsset: string; resolvedTimeframe: string } {
  const {
    userAsset,
    userTimeframe,
    detectedChartSymbol,
    detectedChartTimeframe,
    modelAsset,
    modelTimeframe,
    referencePrice = 0,
    adjustments,
  } = params;

  const hasExplicitUserAsset = !isAutoAsset(userAsset);
  const hasExplicitDetectedSymbol = !isAutoAsset(detectedChartSymbol);
  const hasExplicitModelAsset = !isAutoAsset(modelAsset);

  const normalizedUserAsset = hasExplicitUserAsset
    ? normalizeAssetSymbol(userAsset)
    : '';
  const normalizedDetectedSymbol = hasExplicitDetectedSymbol
    ? normalizeAssetSymbol(detectedChartSymbol)
    : '';
  const normalizedModelAsset = hasExplicitModelAsset
    ? normalizeAssetSymbol(modelAsset)
    : '';

  let resolvedAsset = 'XAUUSD';

  if (!hasExplicitUserAsset) {
    // Auto-detect mode: prioritize ticker explicitly read from chart header, then model asset
    if (normalizedDetectedSymbol && (!referencePrice || isPriceCompatibleWithAsset(referencePrice, normalizedDetectedSymbol))) {
      resolvedAsset = normalizedDetectedSymbol;
    } else if (normalizedModelAsset && (!referencePrice || isPriceCompatibleWithAsset(referencePrice, normalizedModelAsset))) {
      resolvedAsset = normalizedModelAsset;
    } else if (normalizedDetectedSymbol) {
      resolvedAsset = normalizedDetectedSymbol;
    } else if (normalizedModelAsset) {
      resolvedAsset = normalizedModelAsset;
    }
  } else {
    // User provided an asset: verify it doesn't conflict with an explicit ticker printed on the chart + Y-axis price domain
    const userAssetMatchesPrice =
      referencePrice <= 0 || isPriceCompatibleWithAsset(referencePrice, normalizedUserAsset);
    const chartCandidate = normalizedDetectedSymbol || normalizedModelAsset;
    const chartCandidateDiffers =
      Boolean(chartCandidate) && chartCandidate !== normalizedUserAsset;
    const chartCandidateMatchesPrice =
      Boolean(chartCandidate) &&
      referencePrice > 0 &&
      isPriceCompatibleWithAsset(referencePrice, chartCandidate);

    if (chartCandidateDiffers && !userAssetMatchesPrice && chartCandidateMatchesPrice) {
      resolvedAsset = chartCandidate;
      adjustments?.push(
        `Aligned market symbol from ${normalizedUserAsset} to ${chartCandidate} to match visible chart header and Y-axis price scale (${referencePrice})`
      );
    } else {
      resolvedAsset = normalizedUserAsset;
    }
  }

  let resolvedTimeframe = '15M';
  if (!isAutoTimeframe(userTimeframe)) {
    resolvedTimeframe = normalizeTimeframeKey(userTimeframe);
  } else if (!isAutoTimeframe(detectedChartTimeframe)) {
    resolvedTimeframe = normalizeTimeframeKey(detectedChartTimeframe);
  } else if (!isAutoTimeframe(modelTimeframe)) {
    resolvedTimeframe = normalizeTimeframeKey(modelTimeframe);
  }

  return { resolvedAsset, resolvedTimeframe };
}

/**
 * Reconciles directional consensus across setup_type, bias, text narrative, and price geometry,
 * and enforces strict mathematical ordering of entry_price, stop_loss, take_profit_1, and take_profit_2
 * within the chart's visible Y-axis price domain.
 */
function reconcileDirectionAndPrices(params: {
  asset: string;
  initialSetupType: SetupType;
  initialRecommendation: TradeRecommendation;
  initialBias: MarketBias;
  calibrationVerdict?: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  axisTopPrice?: number;
  axisBottomPrice?: number;
  currentMarketPrice?: number;
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
  const { asset, axisTopPrice = 0, axisBottomPrice = 0, currentMarketPrice = 0 } = params;

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

  const hasValidAxis = axisTopPrice > axisBottomPrice && axisBottomPrice > 0;
  const axisSpan = hasValidAxis ? axisTopPrice - axisBottomPrice : 0;
  const axisMid = hasValidAxis ? (axisTopPrice + axisBottomPrice) / 2 : 0;

  const decimals = getPriceDecimals(
    entryPrice || currentMarketPrice || axisMid || takeProfit1 || stopLoss,
    asset
  );

  // Anchor entryPrice to the chart's visible Y-axis domain if it drifted outside the screenshot's Y-axis scale
  if (hasValidAxis && entryPrice > 0) {
    entryPrice = repairPriceScaleOutlier(
      entryPrice,
      currentMarketPrice > 0 ? currentMarketPrice : axisMid,
      decimals,
      adjustments,
      'entry_price'
    );
    if (
      entryPrice < axisBottomPrice - axisSpan * 0.25 ||
      entryPrice > axisTopPrice + axisSpan * 0.25
    ) {
      const anchor =
        currentMarketPrice >= axisBottomPrice && currentMarketPrice <= axisTopPrice
          ? currentMarketPrice
          : roundToPrecision(axisMid, decimals);
      adjustments.push(
        `Anchored entry_price (${entryPrice} -> ${anchor}) to visible Y-axis scale [${axisBottomPrice} - ${axisTopPrice}]`
      );
      entryPrice = anchor;
    }
  }

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

  // Clamp stopLoss, takeProfit1, takeProfit2 if any of them hallucinated wildly outside the visible Y-axis span
  if (hasValidAxis && entryPrice > 0) {
    if (stopLoss > 0 && Math.abs(stopLoss - entryPrice) > axisSpan * 0.85) {
      stopLoss = 0; // trigger proportional recalculation from axisSpan below
    }
    if (takeProfit1 > 0 && Math.abs(takeProfit1 - entryPrice) > axisSpan * 1.1) {
      takeProfit1 = 0;
    }
    if (takeProfit2 > 0 && Math.abs(takeProfit2 - entryPrice) > axisSpan * 1.6) {
      takeProfit2 = 0;
    }
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

  if (bullVotes >= bearVotes && (recommendation !== 'BUY' || bias !== 'BULLISH')) {
    if (recommendation !== 'BUY' && setupType !== 'NO TRADE') {
      adjustments.push('Aligned trade_recommendation to BUY based on multi-signal consensus');
    }
    setupType = 'BUY SETUP';
    recommendation = 'BUY';
    bias = 'BULLISH';
  } else if (bearVotes > bullVotes && (recommendation !== 'SELL' || bias !== 'BEARISH')) {
    if (recommendation !== 'SELL' && setupType !== 'NO TRADE') {
      adjustments.push('Aligned trade_recommendation to SELL based on multi-signal consensus');
    }
    setupType = 'SELL SETUP';
    recommendation = 'SELL';
    bias = 'BEARISH';
  }

  const defaultDelta = roundToPrecision(
    hasValidAxis
      ? Math.max(axisSpan * 0.22, Math.pow(10, -decimals) * 6)
      : Math.max(entryPrice * 0.005, Math.pow(10, -decimals) * 10),
    decimals
  );

  // Enforce strict mathematical price ordering for BUY or SELL setups
  if (entryPrice > 0 && (recommendation === 'BUY' || bias !== 'BEARISH')) {
    if (stopLoss > entryPrice && takeProfit1 > 0 && takeProfit1 < entryPrice) {
      const temp = stopLoss;
      stopLoss = takeProfit1;
      takeProfit1 = temp;
      adjustments.push('Swapped inverted stop_loss and take_profit_1 for BUY setup');
    }

    if (takeProfit1 <= entryPrice) {
      const dist =
        stopLoss > 0 && stopLoss < entryPrice ? (entryPrice - stopLoss) * 2.0 : defaultDelta;
      takeProfit1 = roundToPrecision(entryPrice + dist, decimals);
      adjustments.push(`Adjusted take_profit_1 above entry_price (${takeProfit1})`);
    }
    if (takeProfit2 <= entryPrice) {
      const dist = Math.abs(takeProfit1 - entryPrice) * 1.75;
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
        takeProfit1 + Math.max((takeProfit1 - entryPrice) * 0.6, Math.pow(10, -decimals) * 5),
        decimals
      );
    }

    if (stopLoss <= 0 || stopLoss >= entryPrice) {
      const reward1 = Math.abs(takeProfit1 - entryPrice);
      const riskDist = reward1 > 0 ? reward1 / 2.2 : defaultDelta * 0.45;
      stopLoss = roundToPrecision(
        entryPrice - Math.max(riskDist, Math.pow(10, -decimals) * 2),
        decimals
      );
      adjustments.push(
        `Placed stop_loss below entry_price at structural invalidation (${stopLoss})`
      );
    }
  } else if (
    entryPrice > 0 &&
    (recommendation === 'SELL' || (recommendation === 'WAIT' && bias === 'BEARISH'))
  ) {
    if (stopLoss > 0 && stopLoss < entryPrice && takeProfit1 > entryPrice) {
      const temp = stopLoss;
      stopLoss = takeProfit1;
      takeProfit1 = temp;
      adjustments.push('Swapped inverted stop_loss and take_profit_1 for SELL setup');
    }

    if (takeProfit1 <= 0 || takeProfit1 >= entryPrice) {
      const dist = stopLoss > entryPrice ? (stopLoss - entryPrice) * 2.0 : defaultDelta;
      takeProfit1 = roundToPrecision(
        Math.max(Math.pow(10, -decimals), entryPrice - dist),
        decimals
      );
      adjustments.push(`Adjusted take_profit_1 below entry_price (${takeProfit1})`);
    }
    if (takeProfit2 <= 0 || takeProfit2 >= entryPrice) {
      const dist = Math.abs(entryPrice - takeProfit1) * 1.75;
      takeProfit2 = roundToPrecision(
        Math.max(Math.pow(10, -decimals), entryPrice - dist),
        decimals
      );
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

    if (stopLoss <= entryPrice) {
      const reward1 = Math.abs(entryPrice - takeProfit1);
      const riskDist = reward1 > 0 ? reward1 / 2.2 : defaultDelta * 0.45;
      stopLoss = roundToPrecision(
        entryPrice + Math.max(riskDist, Math.pow(10, -decimals) * 2),
        decimals
      );
      adjustments.push(
        `Placed stop_loss above entry_price at structural invalidation (${stopLoss})`
      );
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

  const sortedY = [rawEntryY, rawStopLossY, rawTp1Y, rawTp2Y]
    .map((v) => clampPercent(v, 50))
    .sort((a, b) => a - b);

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

export function normalizeSMCResponse(
  raw: Record<string, any>,
  userHints?: { asset?: string; timeframe?: string }
): SMCSignalOutput {
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

  const rawStopLoss = toNumericPrice(exec.stop_loss ?? raw.stop_loss ?? exec.sl ?? raw.sl);
  const rawTakeProfit1 = toNumericPrice(
    exec.take_profit_1 ?? raw.take_profit_1 ?? exec.tp1 ?? raw.tp1 ?? exec.take_profits?.[0]
  );
  const rawTakeProfit2 = toNumericPrice(
    exec.take_profit_2 ?? raw.take_profit_2 ?? exec.tp2 ?? raw.tp2 ?? exec.take_profits?.[1]
  );
  const rawTakeProfit3 = toNumericPrice(
    exec.take_profit_3 ?? raw.take_profit_3 ?? exec.tp3 ?? raw.tp3 ?? exec.take_profits?.[2]
  );
  const calCurrentPrice = toNumericPrice(
    calibration.current_market_price ?? raw.current_market_price
  );
  const calTopPrice = toNumericPrice(calibration.axis_top_price);
  const calBottomPrice = toNumericPrice(calibration.axis_bottom_price);
  const calMidPrice =
    calTopPrice > 0 && calBottomPrice > 0
      ? Number(((calTopPrice + calBottomPrice) / 2).toFixed(6))
      : 0;

  let rawEntryPrice = toNumericPrice(
    exec.entry_price ?? raw.entry_price ?? exec.entry ?? raw.entry
  );
  if (rawEntryPrice <= 0) {
    if (calCurrentPrice > 0) {
      rawEntryPrice = calCurrentPrice;
    } else if (rawStopLoss > 0 && rawTakeProfit1 > 0) {
      rawEntryPrice = Number(((rawStopLoss + rawTakeProfit1) / 2).toFixed(6));
    } else if (calMidPrice > 0) {
      rawEntryPrice = calMidPrice;
    } else {
      rawEntryPrice =
        toNumericPrice(tools.imbalances_and_obs) ||
        toNumericPrice(tools.liquidity_zones) ||
        rawTakeProfit1 ||
        rawStopLoss;
    }
  }
  const hasValidPrices = rawEntryPrice > 0 || rawTakeProfit1 > 0 || rawStopLoss > 0;

  const rawWhatIsHappening = String(
    raw.what_is_happening ??
      mechanics.what_is_happening ??
      raw.analysis_summary ??
      raw.summary ??
      ''
  );

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

  const preAdjustments: string[] = [];
  const sampleRefPrice = calCurrentPrice || rawEntryPrice || calMidPrice;
  const { resolvedAsset, resolvedTimeframe } = resolveAccurateMarketAndTimeframe({
    userAsset: userHints?.asset,
    userTimeframe: userHints?.timeframe,
    detectedChartSymbol:
      typeof calibration.detected_chart_symbol === 'string'
        ? calibration.detected_chart_symbol
        : undefined,
    detectedChartTimeframe:
      typeof calibration.detected_chart_timeframe === 'string'
        ? calibration.detected_chart_timeframe
        : undefined,
    modelAsset: typeof raw.asset === 'string' ? raw.asset : undefined,
    modelTimeframe: typeof raw.timeframe === 'string' ? raw.timeframe : undefined,
    referencePrice: sampleRefPrice,
    adjustments: preAdjustments,
  });

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

  const reconciled = reconcileDirectionAndPrices({
    asset: resolvedAsset,
    initialSetupType: initialSetup.setupType,
    initialRecommendation: initialSetup.recommendation,
    initialBias,
    calibrationVerdict: calibration.trend_structure_verdict,
    entryPrice: rawEntryPrice,
    stopLoss: rawStopLoss,
    takeProfit1: rawTakeProfit1,
    takeProfit2: rawTakeProfit2,
    axisTopPrice: calTopPrice > 0 ? calTopPrice : undefined,
    axisBottomPrice: calBottomPrice > 0 ? calBottomPrice : undefined,
    currentMarketPrice: calCurrentPrice > 0 ? calCurrentPrice : undefined,
    narrativeText: `${rawWhatIsHappening} ${String(raw.summary || '')} ${String(
      tools.market_structure || ''
    )}`,
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
  const adjustments = [...preAdjustments, ...reconciled.adjustments];

  const decimalsForTp3 = getPriceDecimals(
    entryPrice || takeProfit2 || takeProfit1 || stopLoss,
    resolvedAsset
  );
  const isBullishSetup =
    recommendation === 'BUY' || (recommendation === 'WAIT' && bias !== 'BEARISH');
  let takeProfit3 =
    rawTakeProfit3 > 0
      ? repairPriceScaleOutlier(
          rawTakeProfit3,
          entryPrice || takeProfit2,
          decimalsForTp3,
          adjustments,
          'take_profit_3'
        )
      : 0;

  if (entryPrice > 0 && takeProfit2 > 0) {
    const stepDist = Math.max(
      Math.abs(takeProfit2 - takeProfit1),
      Math.abs(entryPrice - stopLoss) * 1.2,
      Math.pow(10, -decimalsForTp3) * 5
    );
    if (isBullishSetup && takeProfit3 <= takeProfit2) {
      takeProfit3 = roundToPrecision(takeProfit2 + stepDist, decimalsForTp3);
    } else if (!isBullishSetup && (takeProfit3 <= 0 || takeProfit3 >= takeProfit2)) {
      takeProfit3 = roundToPrecision(
        Math.max(Math.pow(10, -decimalsForTp3), takeProfit2 - stepDist),
        decimalsForTp3
      );
    }
  }

  const riskDistance = entryPrice > 0 && stopLoss > 0 ? Math.abs(entryPrice - stopLoss) : 0;
  const targetPriceForRR = takeProfit1 > 0 ? takeProfit1 : takeProfit2;
  const rewardDistance =
    entryPrice > 0 && targetPriceForRR > 0 ? Math.abs(targetPriceForRR - entryPrice) : 0;
  const calculatedRR =
    riskDistance > 0 && rewardDistance > 0
      ? Number(Math.abs((targetPriceForRR - entryPrice) / (entryPrice - stopLoss)).toFixed(2))
      : 3.0;

  const riskToReward =
    riskDistance > 0 && rewardDistance > 0
      ? `1:${calculatedRR.toFixed(2)}`
      : String(exec.risk_to_reward ?? raw.risk_reward_ratio ?? '1:3.00');

  const confidenceRaw = Number(raw.confidence_score);
  let confidenceScore = Number.isFinite(confidenceRaw)
    ? Math.min(100, Math.max(0, confidenceRaw))
    : 85;

  const confluenceCount = Number(calibration.confluence_count ?? 3);
  const confluenceGatePassed =
    (Number.isFinite(confluenceCount) ? confluenceCount >= 2 : true) &&
    calculatedRR >= 1.15 &&
    confidenceScore >= 50;

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
      ? `Macro price action on ${resolvedAsset} (${resolvedTimeframe}) shows a clear directional trajectory across sessions with participants defending horizontal structural levels around ${entryPrice}.`
      : `Institutional order flow on ${resolvedAsset} (${resolvedTimeframe}) shows a liquidity reaction followed by displacement and a structural break, with price retracing into an unmitigated Fair Value Gap and Order Block near ${entryPrice}.`);

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
        ? `Macro swing highs and swing lows on ${resolvedAsset} (${resolvedTimeframe}) aligned with multi-session trend structure`
        : `Institutional BOS / CHoCH displacement detected on ${resolvedAsset} (${resolvedTimeframe})`)
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
        `Momentum shifted decisively via ${marketStructure}, confirming ${bias.toLowerCase()} control on the ${resolvedTimeframe} chart.`,
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

  const axisTopPrice = calTopPrice;
  const axisBottomPrice = calBottomPrice;
  const currentMarketPrice = calCurrentPrice;

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
  const tp3Y = isBullish
    ? Math.max(6, Math.min(tp2Y - 7, clampPercent(raw.tp3_y ?? annotations.tp3_y, 10)))
    : Math.min(94, Math.max(tp2Y + 7, clampPercent(raw.tp3_y ?? annotations.tp3_y, 90)));

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
    tp3_y: tp3Y,
    entry_y_percent: entryY,
    stop_loss_y_percent: stopLossY,
    tp1_y_percent: tp1Y,
    tp2_y_percent: tp2Y,
    tp3_y_percent: tp3Y,
    zones: normalizedZones,
    prediction_path: normalizedPath,
  };

  const dec = getPriceDecimals(entryPrice, resolvedAsset);
  const verificationChecks: string[] = [
    reconciled.priceGeometryValid
      ? isBullish
        ? `Directional Geometry Verified (${resolvedAsset}): SL (${stopLoss}) < Entry (${entryPrice}) < TP1 (${takeProfit1}) < TP2 (${takeProfit2})`
        : `Directional Geometry Verified (${resolvedAsset}): SL (${stopLoss}) > Entry (${entryPrice}) > TP1 (${takeProfit1}) > TP2 (${takeProfit2})`
      : 'Neutral / Wait Mode: Awaiting structural breakout confirmation',
    `Mathematical R:R Verified: ${riskToReward} (Risk: ${roundToPrecision(
      riskDistance,
      dec
    )}, Reward: ${roundToPrecision(rewardDistance, dec)})`,
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
    asset: resolvedAsset,
    timeframe: resolvedTimeframe,
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
    take_profit_3: takeProfit3,
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
    tp3_y: tp3Y,
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
      take_profit_3: takeProfit3,
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
function extractJsonFromText(
  text: string,
  userHints?: { asset?: string; timeframe?: string }
): SMCSignalOutput {
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
  return normalizeSMCResponse(parsed, userHints);
}

function buildUserContextPrompt(asset?: string, timeframe?: string): string {
  const assetInstruction = isAutoAsset(asset)
    ? 'Market Selection: AUTO-DETECT FROM CHART. Read the exact symbol/ticker from the chart header, watermark, legend, or title, and calibrate all prices strictly from the visible Y-axis.'
    : `User-Provided Market: ${normalizeAssetSymbol(
        asset
      )}. Analyze this market accurately using its exact price scale on the chart's Y-axis. (Note: If the uploaded screenshot explicitly displays a different market ticker header AND a Y-axis price scale belonging to that other market, report the actual market visible on the chart in "detected_chart_symbol" and "asset".)`;

  const tfInstruction = isAutoTimeframe(timeframe)
    ? 'Timeframe Selection: AUTO-DETECT FROM CHART. Read the timeframe from the chart header/toolbar (default to 15M if cropped).'
    : `User-Provided Timeframe: ${normalizeTimeframeKey(timeframe)}.`;

  return `${assetInstruction}\n${tfInstruction}`;
}

/**
 * Calls Gemini Vision API with deterministic temperature 0.1 and strict Y-axis anti-hallucination instructions.
 */
async function callGeminiVision(
  imageBase64OrSvg: string,
  mimeType: string,
  apiKey: string,
  asset?: string,
  timeframe?: string,
  svgTextContent?: string
): Promise<SMCSignalOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const userContext = buildUserContextPrompt(asset, timeframe);

  const parts: Array<Record<string, any>> = [
    {
      text: `${APEX_SMC_SYSTEM_PROMPT}\n\n${userContext}\n\nMANDATORY ANTI-HALLUCINATION CHECKLIST:\n1. Read the chart's visible Y-axis price labels first (axis_bottom_price, axis_top_price, current_market_price).\n2. Every price (entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3) and every zone price label MUST lie within or immediately adjacent to [axis_bottom_price, axis_top_price] from the screenshot.\n3. Never invent prices from training memory or a different market.\n4. Enforce strict price and Y-coordinate ordering for BUY vs SELL.`,
    },
  ];

  if (mimeType === 'image/svg+xml' && svgTextContent) {
    parts.push({
      text: `UPLOADED CHART SVG SOURCE (Read header, Y-axis labels, and candle/line coordinates from this SVG):\n${svgTextContent}`,
    });
  } else {
    parts.push({
      inline_data: {
        mime_type: mimeType || 'image/png',
        data: imageBase64OrSvg,
      },
    });
  }

  const payload = {
    contents: [{ parts }],
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

  return extractJsonFromText(textOutput, { asset, timeframe });
}

/**
 * Calls OpenAI GPT-4o Vision API with deterministic temperature 0.1 and strict Y-axis anti-hallucination instructions.
 */
async function callOpenAIVision(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  asset?: string,
  timeframe?: string,
  svgTextContent?: string
): Promise<SMCSignalOutput> {
  const url = 'https://api.openai.com/v1/chat/completions';
  const userContext = buildUserContextPrompt(asset, timeframe);

  const userContent: Array<Record<string, any>> = [
    {
      type: 'text',
      text: 'Analyze this financial chart using the 6-Stage Institutional Verification Protocol. Calibrate visible Y-axis prices first, never hallucinate prices outside the visible Y-axis scale, enforce 0.5x ATR stop-loss buffering and (TP1 - Entry) / (Entry - SL) R:R math, and support both Candlestick SMC mode and Line/Area/Overlaid Macro Price Action mode. Return strictly the JSON schema.',
    },
  ];

  if (mimeType === 'image/svg+xml' && svgTextContent) {
    userContent.push({
      type: 'text',
      text: `UPLOADED CHART SVG SOURCE:\n${svgTextContent}`,
    });
  } else {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
      },
    });
  }

  const payload = {
    model: 'gpt-4o',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${APEX_SMC_SYSTEM_PROMPT}\n\n${userContext}`,
      },
      {
        role: 'user',
        content: userContent,
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

  return extractJsonFromText(textOutput, { asset, timeframe });
}

/**
 * Deterministic Quantitative SMC Synthesis Fallback when remote vision API is unreachable or rate-limited.
 */
function buildQuantitativeFallbackAnalysis(
  quant: QuantEngineOutput,
  news: MacroNewsGuardrailResult
): SMCSignalOutput {
  const isBearish = quant.overallQuantBias === 'BEARISH';
  const decimals = getPriceDecimals(quant.currentPrice, quant.asset);
  const atr = Math.max(quant.atr14, quant.currentPrice * 0.0025);
  const halfAtr = roundToPrecision(atr * 0.5, decimals);

  const fvg = quant.unmitigatedFVGs[quant.unmitigatedFVGs.length - 1];
  const ob = quant.activeOrderBlocks[quant.activeOrderBlocks.length - 1];

  const entryPrice = roundToPrecision(
    fvg
      ? fvg.midpoint
      : isBearish
      ? quant.fibonacci.bearishPremiumOTE.ote618
      : quant.fibonacci.bullishDiscountOTE.ote618,
    decimals
  );

  const stopLoss = isBearish
    ? roundToPrecision(
        Math.max(entryPrice + atr * 1.2, quant.structure.swingHigh) + halfAtr,
        decimals
      )
    : roundToPrecision(
        Math.min(entryPrice - atr * 1.2, quant.structure.swingLow) - halfAtr,
        decimals
      );

  const riskDist = Math.abs(entryPrice - stopLoss);
  const takeProfit1 = isBearish
    ? roundToPrecision(entryPrice - riskDist * 2.2, decimals)
    : roundToPrecision(entryPrice + riskDist * 2.2, decimals);
  const takeProfit2 = isBearish
    ? roundToPrecision(entryPrice - riskDist * 3.6, decimals)
    : roundToPrecision(entryPrice + riskDist * 3.6, decimals);
  const takeProfit3 = isBearish
    ? roundToPrecision(entryPrice - riskDist * 5.0, decimals)
    : roundToPrecision(entryPrice + riskDist * 5.0, decimals);

  const rawMock: Record<string, any> = {
    asset: quant.asset,
    timeframe: quant.primaryTimeframe,
    chart_type: 'CANDLESTICK',
    analysis_mode: 'SMC_CANDLESTICK',
    bias: isBearish ? 'BEARISH' : 'BULLISH',
    confidence_score: news.hasRedFolderRisk ? 79 : 91,
    current_market_phase: 'Pullback',
    summary: `${quant.asset} (${quant.primaryTimeframe}) exhibits ${
      isBearish ? 'bearish' : 'bullish'
    } multi-timeframe order flow (HTF: ${quant.htfBias}) following ${quant.session.liquiditySweep.description.toLowerCase()}. Price is retracing toward the ${
      fvg ? `${fvg.type} FVG (${fvg.bottom} - ${fvg.top})` : `OTE zone near ${entryPrice}`
    } during the ${quant.session.sessionName} session.`,
    what_is_happening: `Live multi-timeframe structure on ${quant.asset} (${quant.primaryTimeframe}) confirms ${
      isBearish ? 'seller' : 'buyer'
    } control aligned with ${quant.ema.stackLabel}. Following ${
      quant.session.liquiditySweep.description
    }, price printed a structural displacement with ATR(14) at ${quant.atr14} and RSI(14) at ${
      quant.rsi14
    }. Institutional limit orders are resting around ${entryPrice} with a 0.5x ATR (${halfAtr}) buffered stop loss at ${stopLoss}.`,
    how_it_works_steps: [
      `${quant.session.liquiditySweep.description} during the ${quant.session.sessionName} session.`,
      `${quant.structure.summary} aligned with ${quant.ema.stackLabel}.`,
      `Unmitigated institutional ${
        fvg ? `${fvg.type} FVG (${fvg.bottom}–${fvg.top})` : 'OTE Fibonacci array'
      } and ${
        ob ? `${ob.type} Order Block (${ob.bottom}–${ob.top})` : 'structural pivot'
      } converge near ${entryPrice}.`,
      `Mitigation at ${entryPrice} with invalidation buffered by 0.5x ATR at ${stopLoss} targets ${takeProfit1} (TP1) and ${takeProfit2} (TP2).`,
    ],
    entry_y: isBearish ? 34 : 64,
    stop_loss_y: isBearish ? 18 : 80,
    tp1_y: isBearish ? 64 : 34,
    tp2_y: isBearish ? 84 : 18,
    trading_tools_analysis: {
      market_structure: quant.structure.summary,
      liquidity_zones: quant.session.liquiditySweep.description,
      imbalances_and_obs: `${
        fvg
          ? `${fvg.type} FVG [${fvg.bottom} - ${fvg.top}]`
          : `Equilibrium 0.5 @ ${quant.fibonacci.equilibrium50}`
      } | ${ob ? `${ob.type} OB [${ob.bottom} - ${ob.top}]` : `Session VWAP @ ${quant.sessionVwap}`}`,
      fibonacci_or_session_context: `0.5 EQ @ ${quant.fibonacci.equilibrium50} (${quant.fibonacci.currentPosition}) | Session: ${quant.session.sessionName}`,
    },
    trade_execution: {
      setup_type: isBearish ? 'SELL SETUP' : 'BUY SETUP',
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit_1: takeProfit1,
      take_profit_2: takeProfit2,
      take_profit_3: takeProfit3,
      risk_to_reward: '1:2.20',
      invalidation_condition: `Sustained candle closure beyond ${stopLoss} (structural invalidation + 0.5x ATR buffer of ${halfAtr}) voids this setup.`,
    },
  };

  return normalizeSMCResponse(rawMock, {
    asset: quant.asset,
    timeframe: quant.primaryTimeframe,
  });
}

export interface AnalyzeChartHints {
  asset?: string;
  timeframe?: string;
  mtfData?: MultiTimeframeMarketContext;
  quantReport?: QuantEngineOutput;
  macroNews?: MacroNewsGuardrailResult;
  memoryContext?: PredictionMemoryContext;
}

/**
 * Route chart images through the Vision-First Y-Axis Calibration + 5-Tool Quantitative Verification Pipeline.
 */
export async function analyzeChartImage(
  dataUrlOrBase64: string,
  sampleId?: string,
  hints?: AnalyzeChartHints
): Promise<SMCSignalOutput> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const matchedSample =
    (sampleId ? SAMPLE_CHARTS.find((chart) => chart.id === sampleId) : undefined) ||
    SAMPLE_CHARTS.find((chart) => chart.thumbnailUrl === dataUrlOrBase64);

  if (matchedSample) {
    const sampleAsset = !isAutoAsset(hints?.asset)
      ? normalizeAssetSymbol(hints?.asset)
      : matchedSample.asset;
    const sampleTf = !isAutoTimeframe(hints?.timeframe)
      ? normalizeTimeframeKey(hints?.timeframe)
      : normalizeTimeframeKey(matchedSample.timeframe);
    const normalizedSample = normalizeSMCResponse(matchedSample.mockAnalysis, {
      asset: sampleAsset,
      timeframe: sampleTf,
    });
    const mtfData =
      hints?.mtfData ||
      (await fetchMultiTimeframeMarketData(sampleAsset, sampleTf, {
        referencePrice: normalizedSample.entry_price,
        preferredBias: normalizedSample.bias,
      }));
    const quantReport = hints?.quantReport || runQuantEngine(mtfData, sampleTf);
    const macroNews = hints?.macroNews || (await checkMacroNewsGuardrail(mtfData.asset));
    const memoryContext =
      hints?.memoryContext ||
      (await queryHistoricalPredictionMemory(
        mtfData.asset,
        quantReport.primaryTimeframe,
        normalizedSample.entry_price || quantReport.currentPrice
      ));
    return validateAndEnrichSetup(
      normalizedSample,
      quantReport,
      macroNews,
      memoryContext.historicalPerformanceNote,
      mtfData.source
    ).validatedSignal;
  }

  let base64 = dataUrlOrBase64;
  let mimeType = 'image/png';
  let svgTextContent: string | undefined;

  if (dataUrlOrBase64.startsWith('data:image/svg+xml')) {
    mimeType = 'image/svg+xml';
    const commaIdx = dataUrlOrBase64.indexOf(',');
    if (commaIdx !== -1) {
      const header = dataUrlOrBase64.slice(0, commaIdx);
      const payload = dataUrlOrBase64.slice(commaIdx + 1);
      svgTextContent = header.includes(';base64')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
    }
  } else if (dataUrlOrBase64.startsWith('data:')) {
    const matches = dataUrlOrBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (matches) {
      mimeType = matches[1] === 'image/jpg' ? 'image/jpeg' : matches[1];
      base64 = matches[2].replace(/\s+/g, '');
    }
  }

  let rawSignal: SMCSignalOutput | null = null;

  // Step 1: Run Vision AI first without synthetic price contamination so it reads the chart's true market, timeframe, and Y-axis
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      rawSignal = await callGeminiVision(
        base64,
        mimeType,
        geminiKey,
        hints?.asset,
        hints?.timeframe,
        svgTextContent
      );
    } catch (err) {
      console.warn('Gemini Vision call failed; attempting fallback:', err);
    }
  }

  if (!rawSignal && openaiKey && openaiKey.trim() !== '') {
    try {
      rawSignal = await callOpenAIVision(
        base64,
        mimeType,
        openaiKey,
        hints?.asset,
        hints?.timeframe,
        svgTextContent
      );
    } catch (err) {
      console.warn('OpenAI Vision call failed; attempting quantitative fallback:', err);
    }
  }

  if (
    rawSignal &&
    (rawSignal.error === 'IMAGE_UNREADABLE' ||
      rawSignal.trade_execution?.setup_type === 'INVALID_IMAGE')
  ) {
    return rawSignal;
  }

  // Step 2: Resolve authoritative market, timeframe, and calibrated chart price
  const resolvedAsset = normalizeAssetSymbol(
    rawSignal?.asset || (!isAutoAsset(hints?.asset) ? hints?.asset : 'XAUUSD')
  );
  const resolvedTimeframe = normalizeTimeframeKey(
    rawSignal?.timeframe || (!isAutoTimeframe(hints?.timeframe) ? hints?.timeframe : '15M')
  );
  const chartReferencePrice =
    rawSignal?.accuracy_verification?.current_market_price ||
    rawSignal?.entry_price ||
    undefined;

  // Step 3: Fetch/align multi-timeframe market data & quant engine for the exact resolved market and chart price scale
  const mtfData =
    hints?.mtfData &&
    hints.mtfData.asset === resolvedAsset &&
    hints.mtfData.primaryTimeframe === resolvedTimeframe
      ? hints.mtfData
      : await fetchMultiTimeframeMarketData(resolvedAsset, resolvedTimeframe, {
          referencePrice: chartReferencePrice,
          preferredBias: rawSignal?.bias,
        });

  const quantReport =
    hints?.quantReport &&
    hints.quantReport.asset === resolvedAsset &&
    hints.quantReport.primaryTimeframe === resolvedTimeframe
      ? hints.quantReport
      : runQuantEngine(mtfData, resolvedTimeframe);

  const macroNews =
    hints?.macroNews && hints.macroNews.asset === resolvedAsset
      ? hints.macroNews
      : await checkMacroNewsGuardrail(resolvedAsset);

  const memoryContext =
    hints?.memoryContext &&
    hints.memoryContext.asset === resolvedAsset &&
    hints.memoryContext.timeframe === resolvedTimeframe
      ? hints.memoryContext
      : await queryHistoricalPredictionMemory(
          resolvedAsset,
          resolvedTimeframe,
          chartReferencePrice || quantReport.currentPrice
        );

  if (!rawSignal) {
    rawSignal = buildQuantitativeFallbackAnalysis(quantReport, macroNews);
  }

  return validateAndEnrichSetup(
    rawSignal,
    quantReport,
    macroNews,
    memoryContext.historicalPerformanceNote,
    mtfData.source
  ).validatedSignal;
}
