import {
  MarketBias,
  SetupType,
  SMCSignalOutput,
  TradeRecommendation,
  VisualProofAnnotations,
  VisualProofZone,
  PredictionPathPoint,
} from './types';
import { SAMPLE_CHARTS } from './sample-charts';

export const APEX_SMC_SYSTEM_PROMPT = `You are an institutional Smart Money Concepts (SMC) and Price Action quantitative market analyst for Apex Vision AI. 

When a user uploads a market chart screenshot (along with the selected asset and timeframe), perform a deep structural breakdown and return a strictly valid JSON object. Do NOT give generic summaries. Explain the exact market mechanics currently unfolding, identify institutional footprints, and provide normalized coordinate percentages (0 to 100) so the frontend can draw visual proof overlays directly onto the user's uploaded image.

Analyze the image and output ONLY this JSON schema:

{
  "asset": "Detected or user-selected ticker (e.g., XAUUSD)",
  "timeframe": "Detected or user-selected timeframe (e.g., 15M)",
  "bias": "BULLISH | BEARISH | NEUTRAL",
  "confidence_score": 0-100,
  "market_mechanics_explanation": {
    "current_phase": "Accumulation | Manipulation | Distribution | Re-accumulation",
    "what_is_happening": "Detailed 3-4 sentence explanation of the current price action, liquidity grabs, and institutional order flow visible on the chart.",
    "how_it_works_step_by_step": [
      "Step 1: Identify where liquidity rested and how price swept it.",
      "Step 2: Explain the displacement/impulsive move and Break of Structure (BOS) or Change of Character (CHoCH).",
      "Step 3: Explain the expected retracement into a Fair Value Gap (FVG) or Order Block (OB) and why price is likely to react there."
    ]
  },
  "trading_tools_analysis": {
    "market_structure": "Exact description of swing highs/lows, BOS, or CHoCH",
    "liquidity_zones": "Specific price levels of Buy-Side Liquidity (BSL) or Sell-Side Liquidity (SSL)",
    "imbalances_and_obs": "Exact price range of active Fair Value Gaps (FVG) and Order Blocks",
    "fibonacci_or_session_context": "Premium vs. Discount array positioning (e.g., OTE 0.618-0.786 retracement) and active trading session"
  },
  "trade_execution": {
    "setup_type": "BUY SETUP | SELL SETUP | NO TRADE",
    "entry_price": "Exact numeric price read from the chart's Y-axis",
    "stop_loss": "Exact numeric price below/above structural invalidation",
    "take_profit_1": "Exact numeric price at first opposing liquidity pool",
    "take_profit_2": "Exact numeric price at major external liquidity target",
    "risk_to_reward": "Calculated R:R ratio (e.g., 1:4.02)",
    "invalidation_condition": "Exact price action event that voids this setup"
  },
  "visual_proof_annotations": {
    "entry_y_percent": 0-100,
    "stop_loss_y_percent": 0-100,
    "tp1_y_percent": 0-100,
    "tp2_y_percent": 0-100,
    "zones": [
      {
        "label": "Bullish FVG / Order Block / Liquidity Sweep",
        "type": "FVG | OB | LIQUIDITY | BOS",
        "x_start_percent": 0-100,
        "y_start_percent": 0-100,
        "x_end_percent": 0-100,
        "y_end_percent": 0-100
      }
    ],
    "prediction_path": [
      {"x_percent": 0-100, "y_percent": 0-100, "note": "Current price"},
      {"x_percent": 0-100, "y_percent": 0-100, "note": "Retracement into FVG/OB"},
      {"x_percent": 0-100, "y_percent": 0-100, "note": "Expansion toward TP1/TP2"}
    ]
  }
}

Rules:
1. Read the exact price scale on the right Y-axis of the uploaded image so entry, SL, and TP numbers match the actual chart prices—never invent prices.
2. Ensure \`visual_proof_annotations\` Y-percentages accurately align with where those price levels sit vertically on the chart image.
3. If the uploaded image is not a financial chart, return \`"setup_type": "INVALID_IMAGE"\` and explain why in \`what_is_happening\`.`;

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

function normalizeSetupType(rawSetup: unknown, rawRec?: unknown): {
  setupType: SetupType;
  recommendation: TradeRecommendation;
} {
  const upper = String(rawSetup || rawRec || '').toUpperCase().trim();
  if (upper === 'INVALID_IMAGE') {
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
  if (raw.error === 'IMAGE_UNREADABLE') {
    return {
      asset: 'UNKNOWN',
      timeframe: 'UNKNOWN',
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
      error: 'IMAGE_UNREADABLE',
      market_mechanics_explanation: {
        current_phase: 'Accumulation',
        what_is_happening: 'The uploaded image could not be parsed as a valid financial candlestick chart.',
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
        entry_y_percent: 50,
        stop_loss_y_percent: 75,
        tp1_y_percent: 35,
        tp2_y_percent: 20,
        zones: [],
        prediction_path: [],
      },
    };
  }

  const exec = (raw.trade_execution && typeof raw.trade_execution === 'object') ? raw.trade_execution : {};
  const mechanics = (raw.market_mechanics_explanation && typeof raw.market_mechanics_explanation === 'object')
    ? raw.market_mechanics_explanation
    : {};
  const tools = (raw.trading_tools_analysis && typeof raw.trading_tools_analysis === 'object')
    ? raw.trading_tools_analysis
    : {};
  const annotations = (raw.visual_proof_annotations && typeof raw.visual_proof_annotations === 'object')
    ? raw.visual_proof_annotations
    : {};

  const { setupType, recommendation } = normalizeSetupType(
    exec.setup_type ?? raw.setup_type,
    raw.trade_recommendation
  );
  const bias = normalizeBias(raw.bias ?? raw.market_bias);
  const isBullish = recommendation === 'BUY' || (recommendation === 'WAIT' && bias === 'BULLISH');

  const entryPrice = toNumericPrice(exec.entry_price ?? raw.entry_price);
  const stopLoss = toNumericPrice(exec.stop_loss ?? raw.stop_loss);
  const takeProfit1 = toNumericPrice(exec.take_profit_1 ?? raw.take_profit_1);
  const takeProfit2 = toNumericPrice(exec.take_profit_2 ?? raw.take_profit_2);
  const riskToReward = String(exec.risk_to_reward ?? raw.risk_reward_ratio ?? '1:3.00');
  const invalidationCondition = String(
    exec.invalidation_condition ?? raw.invalidation_condition ?? 'Structural close beyond invalidation level.'
  );

  const whatIsHappening = String(
    mechanics.what_is_happening ?? raw.analysis_summary ?? raw.summary ?? 'Institutional SMC structure analyzed.'
  );
  const currentPhase = String(mechanics.current_phase ?? 'Manipulation');
  const stepByStep: string[] = Array.isArray(mechanics.how_it_works_step_by_step)
    ? mechanics.how_it_works_step_by_step.map((s: unknown) => String(s))
    : [];

  const marketStructure = String(tools.market_structure ?? 'Institutional BOS / CHoCH displacement detected');
  const liquidityZones = String(tools.liquidity_zones ?? 'Buy-side & Sell-side liquidity pools mapped');
  const imbalancesAndObs = String(tools.imbalances_and_obs ?? 'Unmitigated Fair Value Gap (FVG) & Order Block');
  const fibOrSession = String(tools.fibonacci_or_session_context ?? 'OTE 0.618-0.786 retracement array');

  const keyConfluences: string[] = Array.isArray(raw.key_confluences) && raw.key_confluences.length > 0
    ? raw.key_confluences.map((c: unknown) => String(c))
    : [
        `Market Structure: ${marketStructure}`,
        `Liquidity Pools: ${liquidityZones}`,
        `Imbalances & OBs: ${imbalancesAndObs}`,
        `Fibonacci / Session: ${fibOrSession}`,
      ];

  const rawZones: VisualProofZone[] = Array.isArray(annotations.zones)
    ? annotations.zones.map((z: any) => {
        const rawType = String(z?.type || 'FVG').toUpperCase();
        const validType = (['FVG', 'OB', 'LIQUIDITY', 'BOS'].includes(rawType) ? rawType : 'FVG') as VisualProofZone['type'];
        return {
          label: String(z?.label || validType),
          type: validType,
          x_start_percent: clampPercent(z?.x_start_percent, 25),
          y_start_percent: clampPercent(z?.y_start_percent, 45),
          x_end_percent: clampPercent(z?.x_end_percent, 75),
          y_end_percent: clampPercent(z?.y_end_percent, 60),
        };
      })
    : [];

  const rawPath: PredictionPathPoint[] = Array.isArray(annotations.prediction_path)
    ? annotations.prediction_path.map((pt: any) => ({
        x_percent: clampPercent(pt?.x_percent, 50),
        y_percent: clampPercent(pt?.y_percent, 50),
        note: String(pt?.note || ''),
      }))
    : [];

  const normalizedAnnotations: VisualProofAnnotations = {
    entry_y_percent: clampPercent(annotations.entry_y_percent, isBullish ? 62 : 38),
    stop_loss_y_percent: clampPercent(annotations.stop_loss_y_percent, isBullish ? 82 : 18),
    tp1_y_percent: clampPercent(annotations.tp1_y_percent, isBullish ? 36 : 64),
    tp2_y_percent: clampPercent(annotations.tp2_y_percent, isBullish ? 18 : 82),
    zones: rawZones,
    prediction_path: rawPath,
  };

  const confidenceRaw = Number(raw.confidence_score);
  const confidenceScore = Number.isFinite(confidenceRaw)
    ? Math.min(100, Math.max(0, confidenceRaw))
    : 0;

  return {
    asset: String(raw.asset || 'XAUUSD'),
    timeframe: String(raw.timeframe || '15M'),
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
    analysis_summary: whatIsHappening,
    ...(setupType === 'INVALID_IMAGE' ? { error: 'IMAGE_UNREADABLE' } : {}),
    market_mechanics_explanation: {
      current_phase: currentPhase,
      what_is_happening: whatIsHappening,
      how_it_works_step_by_step: stepByStep,
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
            text: `${APEX_SMC_SYSTEM_PROMPT}\n\nSelected asset: ${asset || 'Detect from chart'}. Selected timeframe: ${timeframe || 'Detect from chart'}.`,
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
          { type: 'text', text: 'Analyze this financial chart image using Smart Money Concepts (SMC) and return strictly the JSON schema.' },
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

  let base64 = dataUrlOrBase64;
  let mimeType = 'image/png';

  if (dataUrlOrBase64.startsWith('data:')) {
    const matches = dataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64 = matches[2];
    }
  }

  if (sampleId) {
    const sample = SAMPLE_CHARTS.find((chart) => chart.id === sampleId);
    if (sample) return normalizeSMCResponse(sample.mockAnalysis);
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
