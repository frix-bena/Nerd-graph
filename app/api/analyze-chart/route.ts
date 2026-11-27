import { NextRequest, NextResponse } from 'next/server';
import { analyzeChartImage } from '@/lib/vision-engine';
import { prisma } from '@/lib/prisma';
import { TradeAnalysis } from '@/lib/types';
import { SAMPLE_CHARTS } from '@/lib/sample-charts';
import { detectSessionAndLiquiditySweep } from '@/lib/tools/quantEngine';
import { logTradePredictionSilently } from '@/lib/tools/predictionMemory';

export const runtime = 'nodejs';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

type RequestData = {
  image?: string;
  mimeType?: string;
  sampleId?: string;
  asset?: string;
  timeframe?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validAnalysis(
  value: unknown
): value is Omit<TradeAnalysis, 'summary'> & { summary?: string; analysis_summary?: string } {
  if (!isRecord(value)) return false;
  return (
    typeof value.asset === 'string' &&
    typeof value.timeframe === 'string' &&
    ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(String(value.market_bias)) &&
    ['BUY', 'SELL', 'WAIT'].includes(String(value.trade_recommendation)) &&
    typeof value.confidence_score === 'number' &&
    Number.isFinite(value.confidence_score) &&
    value.confidence_score >= 0 &&
    value.confidence_score <= 100 &&
    ['entry_price', 'stop_loss', 'take_profit_1', 'take_profit_2'].every(
      (key) => typeof value[key] === 'number' && Number.isFinite(value[key])
    ) &&
    typeof value.risk_reward_ratio === 'string' &&
    Array.isArray(value.key_confluences) &&
    value.key_confluences.every((item) => typeof item === 'string') &&
    typeof value.invalidation_condition === 'string' &&
    (typeof value.summary === 'string' || typeof value.analysis_summary === 'string')
  );
}

async function readInput(
  request: NextRequest
): Promise<{ data: RequestData; imageData: string; mimeType: string }> {
  const contentType = request.headers.get('content-type') || '';
  let data: RequestData;
  let imageData = '';
  let mimeType = '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    data = {
      asset: typeof form.get('asset') === 'string' ? String(form.get('asset')) : '',
      timeframe: typeof form.get('timeframe') === 'string' ? String(form.get('timeframe')) : '',
      sampleId: typeof form.get('sampleId') === 'string' ? String(form.get('sampleId')) : '',
    };
    const matchedSample = SAMPLE_CHARTS.find((sample) => sample.id === data.sampleId);
    if (matchedSample) {
      return { data, imageData: matchedSample.thumbnailUrl, mimeType: 'image/svg+xml' };
    }
    const file = form.get('image');
    if (!(file instanceof File)) throw new Error('Chart image file is required.');
    mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (!IMAGE_TYPES.has(mimeType)) {
      throw new Error('Only PNG, JPG, and WEBP chart images are supported.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Chart images must be 10 MB or smaller.');
    }
    imageData = `data:${mimeType};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
  } else if (contentType.includes('application/json')) {
    const body: unknown = await request.json();
    if (!isRecord(body)) throw new Error('A JSON request body is required.');
    data = body as RequestData;
    data.asset = typeof body.asset === 'string' ? body.asset : '';
    data.timeframe = typeof body.timeframe === 'string' ? body.timeframe : '';
    data.sampleId = typeof body.sampleId === 'string' ? body.sampleId : '';

    const matchedSample = SAMPLE_CHARTS.find((sample) => sample.id === data.sampleId);
    if (matchedSample) {
      return {
        data,
        imageData: typeof data.image === 'string' && data.image ? data.image : matchedSample.thumbnailUrl,
        mimeType: 'image/svg+xml',
      };
    }

    const rawImage = typeof data.image === 'string' ? data.image.trim() : '';
    if (rawImage.startsWith('data:image/svg+xml')) {
      return { data, imageData: rawImage, mimeType: 'image/svg+xml' };
    }

    const dataUrl = rawImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    if (dataUrl) {
      mimeType = dataUrl[1] === 'image/jpg' ? 'image/jpeg' : dataUrl[1];
      const cleanedB64 = dataUrl[2].replace(/\s+/g, '');
      imageData = `data:${mimeType};base64,${cleanedB64}`;
    } else {
      mimeType = data.mimeType === 'image/jpg' ? 'image/jpeg' : data.mimeType || 'image/png';
      imageData = rawImage.replace(/\s+/g, '');
    }

    if (!IMAGE_TYPES.has(mimeType)) {
      throw new Error('Only PNG, JPG, and WEBP chart images are supported.');
    }
    const encoded = imageData.startsWith('data:') ? imageData.split(',')[1] : imageData;
    if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error('Valid base64 chart image data is required.');
    }
    if (Buffer.from(encoded, 'base64').byteLength > MAX_IMAGE_BYTES) {
      throw new Error('Chart images must be 10 MB or smaller.');
    }
    if (!imageData.startsWith('data:')) {
      imageData = `data:${mimeType};base64,${encoded}`;
    }
  } else {
    throw new Error('Send multipart/form-data or an application/json base64 image.');
  }

  return { data, imageData, mimeType };
}

export async function POST(request: NextRequest) {
  try {
    const { data, imageData } = await readInput(request);
    if (!data.sampleId && !imageData) {
      return NextResponse.json(
        { error: 'IMAGE_UNREADABLE', message: 'No chart image was provided.' },
        { status: 400 }
      );
    }

    // Execute Vision-First Chart Analysis + Market-Aligned Quantitative & Risk Validation Pipeline
    const result = await analyzeChartImage(imageData, data.sampleId, {
      asset: data.asset,
      timeframe: data.timeframe,
    });

    if (
      result.error === 'IMAGE_UNREADABLE' ||
      result.trade_execution?.setup_type === 'INVALID_IMAGE'
    ) {
      return NextResponse.json(
        {
          error: 'IMAGE_UNREADABLE',
          message:
            result.what_is_happening ||
            result.market_mechanics_explanation?.what_is_happening ||
            'The uploaded image is not a readable financial chart.',
          analysis: result,
        },
        { status: 422 }
      );
    }

    const resolvedAsset = result.asset || data.asset?.trim() || 'XAUUSD';
    const resolvedTimeframe = result.timeframe || data.timeframe?.trim() || '15M';
    const activeSession = detectSessionAndLiquiditySweep([], 2);

    if (!validAnalysis(result)) {
      return NextResponse.json(
        {
          error: 'INVALID_AI_RESPONSE',
          message: 'The vision provider returned incomplete analysis.',
        },
        { status: 502 }
      );
    }

    const analysis: TradeAnalysis = {
      asset: resolvedAsset,
      timeframe: resolvedTimeframe,
      chart_type: result.chart_type,
      analysis_mode: result.analysis_mode,
      bias: result.bias,
      market_bias: result.market_bias,
      trade_recommendation: result.trade_recommendation,
      confidence_score: result.confidence_score,
      entry_price: result.entry_price,
      stop_loss: result.stop_loss,
      take_profit_1: result.take_profit_1,
      take_profit_2: result.take_profit_2,
      take_profit_3: result.take_profit_3,
      risk_reward_ratio: result.risk_reward_ratio,
      key_confluences: result.key_confluences,
      invalidation_condition: result.invalidation_condition,
      summary: result.analysis_summary,
      current_market_phase: result.current_market_phase,
      what_is_happening: result.what_is_happening,
      how_it_works_steps: result.how_it_works_steps,
      entry_y: result.entry_y,
      stop_loss_y: result.stop_loss_y,
      tp1_y: result.tp1_y,
      tp2_y: result.tp2_y,
      tp3_y: result.tp3_y,
      zones: result.zones,
      prediction_path: result.prediction_path,
      market_mechanics_explanation: result.market_mechanics_explanation,
      trading_tools_analysis: result.trading_tools_analysis,
      trade_execution: result.trade_execution,
      visual_proof_annotations: result.visual_proof_annotations,
      accuracy_verification: result.accuracy_verification,
      multiTimeframeForecast: result.multiTimeframeForecast,
      chartImageUrl: imageData || undefined,
    };

    // 6. Silently log generated setup to TradePrediction memory in the background
    void logTradePredictionSilently({
      asset: analysis.asset,
      timeframe: analysis.timeframe,
      setupType: analysis.trade_execution?.setup_type || 'NO TRADE',
      bias: analysis.bias,
      confidenceScore: analysis.confidence_score,
      entryPrice: analysis.entry_price,
      stopLoss: analysis.stop_loss,
      tp1: analysis.take_profit_1,
      tp2: analysis.take_profit_2,
      sessionName: activeSession.sessionName,
      outcome: 'PENDING',
    });

    let signalId = `sig_${Date.now()}`;
    try {
      const user = await prisma.user.findFirst({ where: { email: 'trader@apexvisionai.io' } });
      const savedSignal = await prisma.signal.create({
        data: {
          userId: user?.id,
          asset: analysis.asset,
          timeframe: analysis.timeframe,
          marketBias: analysis.market_bias,
          tradeRecommendation: analysis.trade_recommendation,
          confidenceScore: analysis.confidence_score,
          entryPrice: analysis.entry_price,
          stopLoss: analysis.stop_loss,
          takeProfit1: analysis.take_profit_1,
          takeProfit2: analysis.take_profit_2,
          riskRewardRatio: analysis.risk_reward_ratio,
          keyConfluences: JSON.stringify(analysis.key_confluences),
          invalidationCondition: analysis.invalidation_condition,
          analysisSummary: analysis.summary,
          chartImageUrl: imageData || undefined,
          rawVisionOutput: JSON.stringify({
            asset: analysis.asset,
            timeframe: analysis.timeframe,
            chart_type: analysis.chart_type,
            analysis_mode: analysis.analysis_mode,
            bias: analysis.bias,
            confidence_score: analysis.confidence_score,
            current_market_phase: analysis.current_market_phase,
            what_is_happening: analysis.what_is_happening,
            how_it_works_steps: analysis.how_it_works_steps,
            entry_y: analysis.entry_y,
            stop_loss_y: analysis.stop_loss_y,
            tp1_y: analysis.tp1_y,
            tp2_y: analysis.tp2_y,
            tp3_y: analysis.tp3_y,
            zones: analysis.zones,
            prediction_path: analysis.prediction_path,
            market_mechanics_explanation: analysis.market_mechanics_explanation,
            trading_tools_analysis: analysis.trading_tools_analysis,
            trade_execution: analysis.trade_execution,
            visual_proof_annotations: analysis.visual_proof_annotations,
            multiTimeframeForecast: analysis.multiTimeframeForecast,
          }),
          status: 'ACTIVE',
          mt5Executed: false,
        },
      });
      signalId = savedSignal.id;
    } catch (dbErr) {
      console.warn('Non-fatal signal persistence warning:', dbErr);
    }

    return NextResponse.json({
      success: true,
      analysis,
      multiTimeframeForecast: analysis.multiTimeframeForecast,
      signalId,
      chartImageUrl: imageData || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to analyze chart.';
    console.error('Error in /api/analyze-chart:', error);
    if (
      message.includes('required') ||
      message.includes('supported') ||
      message.includes('10 MB') ||
      message.includes('base64') ||
      message.includes('Send multipart')
    ) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message }, { status: 400 });
    }
    if (message.includes('not configured')) {
      return NextResponse.json({ error: 'VISION_NOT_CONFIGURED', message }, { status: 503 });
    }
    return NextResponse.json({ error: 'ANALYSIS_FAILED', message }, { status: 502 });
  }
}
