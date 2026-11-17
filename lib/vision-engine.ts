import { SMCSignalOutput } from './types';
import { SAMPLE_CHARTS } from './sample-charts';

export const APEX_SMC_SYSTEM_PROMPT = `You are Apex Vision AI, an expert technical analysis engine specializing in Smart Money Concepts (SMC).
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
  "summary": "STRING"
}

Rules:
1. Identify Market Structure (BOS / CHOCH), Fair Value Gaps (FVGs), and Order Blocks (OBs).
2. Do not invent precise levels if they are unreadable; use 0 for unavailable prices and recommend WAIT.
3. If the image is blurry or not a chart, return: {"error": "IMAGE_UNREADABLE"}.
4. Treat the requested asset and timeframe as hints, not evidence that overrides the chart.`;

/**
 * Parses JSON response safely even if wrapped in markdown codeblocks.
 */
function extractJsonFromText(text: string): SMCSignalOutput {
  let cleaned = text.trim();
  // Strip ```json and ``` if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const parsed = JSON.parse(cleaned);
  if (parsed.summary && !parsed.analysis_summary) {
    parsed.analysis_summary = parsed.summary;
    delete parsed.summary;
  }
  return parsed as SMCSignalOutput;
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
          { text: `${APEX_SMC_SYSTEM_PROMPT}\nRequested asset hint: ${asset || 'identify from chart'}. Requested timeframe hint: ${timeframe || 'identify from chart'}.` },
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
      temperature: 0.2, // strict numeric precision as specified in prompt
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
        content: `${APEX_SMC_SYSTEM_PROMPT}\nRequested asset hint: ${asset || 'identify from chart'}. Requested timeframe hint: ${timeframe || 'identify from chart'}.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this financial chart image using Smart Money Concepts (SMC).' },
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

  // Extract base64 and mime
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
    if (sample) return { ...sample.mockAnalysis };
  }

  // Prefer Gemini when configured, then use OpenAI if available.
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
