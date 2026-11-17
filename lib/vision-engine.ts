import {
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

export const APEX_SMC_SYSTEM_PROMPT = `You are an institutional quantitative market analyst for Apex Vision AI, mastering both Smart Money Concepts (SMC) for candlestick charts AND Macro Price Action & Trend Structure for line, area, and multi-day overlaid charts.

CRITICAL CHART ACCEPTANCE RULE:
- NEVER reject line charts, area charts, or multi-day overlaid spot price charts (such as Kitco multi-day spot gold/silver charts, TradingView line/area charts, or Bloomberg spot curves) due to missing candlestick wicks or bodies.
- Automatically detect the chart style and operate in one of two specialized analytical modes:
  1. CANDLESTICK MODE ("chart_type": "CANDLESTICK", "analysis_mode": "SMC_CANDLESTICK"):
     If the uploaded image is a candlestick or bar chart, analyze using Smart Money Concepts: Liquidity Sweeps (BSL/SSL), Break of Structure (BOS) / Change of Character (CHoCH), Fair Value Gaps (FVG), Order Blocks (OB), and Premium/Discount Fibonacci zones.
  2. LINE / OVERLAID MODE ("chart_type": "LINE_OR_OVERLAID", "analysis_mode": "MACRO_PRICE_ACTION"):
     If the uploaded image is a line chart, area chart, or multi-day overlaid daily price chart (e.g., Kitco spot charts), automatically switch to Macro Price Action & Trend Structure mode: analyze swing highs/lows, key horizontal support/resistance levels, multi-session trajectory comparisons, momentum shifts, and projected price targets.

Analyze the uploaded image and output ONLY a strictly valid JSON object matching this exact schema:

{
  "asset": "Detected or user-selected ticker (e.g., XAUUSD)",
  "timeframe": "Detected or user-selected timeframe (e.g., 15M, 1H, Daily)",
  "chart_type": "CANDLESTICK | LINE_OR_OVERLAID",
  "analysis_mode": "SMC_CANDLESTICK | MACRO_PRICE_ACTION",
  "bias": "BULLISH | BEARISH | NEUTRAL",
  "confidence_score": 0-100,
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
3. Always provide a 3-point prediction_path array [{x, y, label}] showing (1) current price position on the chart, (2) entry/retest inflection point, and (3) projected target expansion toward TP1/TP2.
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

  const entryPrice = toNumericPrice(exec.entry_price ?? raw.entry_price);
  const stopLoss = toNumericPrice(exec.stop_loss ?? raw.stop_loss);
  const takeProfit1 = toNumericPrice(exec.take_profit_1 ?? raw.take_profit_1);
  const takeProfit2 = toNumericPrice(exec.take_profit_2 ?? raw.take_profit_2);
  const hasValidPrices = entryPrice > 0 || takeProfit1 > 0 || stopLoss > 0;

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
  const { setupType, recommendation } = normalizeSetupType(
    exec.setup_type ?? raw.setup_type,
    raw.trade_recommendation,
    hasValidPrices,
    rawWhatIsHappening
  );
  const bias = normalizeBias(raw.bias ?? raw.market_bias ?? (recommendation === 'BUY' ? 'BULLISH' : recommendation === 'SELL' ? 'BEARISH' : 'NEUTRAL'));
  const isBullish = recommendation === 'BUY' || (recommendation === 'WAIT' && bias !== 'BEARISH');

  const riskToReward = String(exec.risk_to_reward ?? raw.risk_reward_ratio ?? '1:3.00');
  const invalidationCondition = String(
    exec.invalidation_condition ??
      raw.invalidation_condition ??
      'Structural close beyond the invalidation stop loss level voids this setup.'
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

  const analysisSummary = String(
    raw.summary ?? raw.analysis_summary ?? whatIsHappening
  );

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
        `A sustained hold above invalidation (${stopLoss || 'stop loss'}) triggers continuation toward ${takeProfit1 || 'TP1'} and ${takeProfit2 || 'TP2'}.`,
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

  const entryY = clampPercent(
    raw.entry_y ?? annotations.entry_y ?? annotations.entry_y_percent,
    isBullish ? 62 : 38
  );
  const stopLossY = clampPercent(
    raw.stop_loss_y ?? annotations.stop_loss_y ?? annotations.stop_loss_y_percent,
    isBullish ? 80 : 18
  );
  const tp1Y = clampPercent(
    raw.tp1_y ?? annotations.tp1_y ?? annotations.tp1_y_percent,
    isBullish ? 35 : 65
  );
  const tp2Y = clampPercent(
    raw.tp2_y ?? annotations.tp2_y ?? annotations.tp2_y_percent,
    isBullish ? 18 : 82
  );

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
            x_start: xStart,
            y_start: yStart,
            x_end: xEnd,
            y_end: yEnd,
            x_start_percent: xStart,
            y_start_percent: yStart,
            x_end_percent: xEnd,
            y_end_percent: yEnd,
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

  const normalizedPath: PredictionPathPoint[] =
    rawPathInput.length >= 3
      ? rawPathInput.slice(0, 4).map((pt: any, idx: number) => {
          const defaultX = idx === 0 ? 66 : idx === 1 ? 75 : 88;
          const defaultY = idx === 0 ? Math.round((entryY + tp1Y) / 2) : idx === 1 ? entryY : tp2Y;
          const x = clampPercent(pt?.x ?? pt?.x_percent, defaultX);
          const y = clampPercent(pt?.y ?? pt?.y_percent, defaultY);
          const label = String(
            pt?.label ??
              pt?.note ??
              (idx === 0 ? 'Current Price' : idx === 1 ? 'Entry Retest' : 'Projected Target')
          );
          return {
            x,
            y,
            label,
            x_percent: x,
            y_percent: y,
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

  const confidenceRaw = Number(raw.confidence_score);
  const confidenceScore = Number.isFinite(confidenceRaw)
    ? Math.min(100, Math.max(0, confidenceRaw))
    : 85;

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
  };
}

/**
 * Parses JSON response safely even if wrapped in markdown codeblocks.
 */
function extractJsonFromText(text: string): SMCSignalOutput {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);
  return normalizeSMCResponse(parsed);
}

/**
 * Calls Gemini Vision API with temperature 0.2
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
            text: `${APEX_SMC_SYSTEM_PROMPT}\n\nSelected asset: ${asset || 'Detect from chart'}. Selected timeframe: ${timeframe || 'Detect from chart'}. Remember: NEVER reject line charts, area charts, or multi-day overlaid charts (such as Kitco spot charts).`,
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
      temperature: 0.2,
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
 * Calls OpenAI GPT-4o Vision API with temperature 0.2
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
    temperature: 0.2,
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
            text: 'Analyze this financial chart image (supporting both Candlestick SMC mode and Line/Area/Overlaid Macro Price Action mode—never reject line or Kitco overlaid charts) and return strictly the JSON schema.',
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
