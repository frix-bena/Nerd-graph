import { prisma } from '../prisma';
import { normalizeAssetSymbol, normalizeTimeframeKey } from './marketData';

export interface LogTradePredictionInput {
  asset: string;
  timeframe: string;
  setupType: string;
  bias: string;
  confidenceScore: number;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  sessionName: string;
  outcome?: string;
}

export interface PredictionMemoryContext {
  asset: string;
  timeframe: string;
  totalPredictions: number;
  resolvedCount: number;
  winRatePercent: number | null;
  avgConfidence: number;
  lastBias: string | null;
  lastOutcome: string | null;
  historicalPerformanceNote: string;
  promptContext: string;
}

/**
 * Evaluates any PENDING past predictions against the current live market price
 * so the database continuously scores historical setups as WIN_TP1, WIN_TP2, or LOSS_SL.
 */
async function reconcilePendingPredictions(
  asset: string,
  currentLivePrice?: number
): Promise<void> {
  if (!currentLivePrice || !Number.isFinite(currentLivePrice) || currentLivePrice <= 0) {
    return;
  }

  try {
    const pendingList = await prisma.tradePrediction.findMany({
      where: {
        asset,
        outcome: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const pred of pendingList) {
      if (pred.entryPrice <= 0) continue;
      const scaleRatio = pred.entryPrice / currentLivePrice;
      if (scaleRatio < 0.8 || scaleRatio > 1.2) continue;

      const isBuy =
        pred.setupType.toUpperCase().includes('BUY') ||
        pred.bias.toUpperCase() === 'BULLISH';
      const isSell =
        pred.setupType.toUpperCase().includes('SELL') ||
        pred.bias.toUpperCase() === 'BEARISH';

      let newOutcome: string | null = null;
      if (isBuy) {
        if (pred.tp2 > 0 && currentLivePrice >= pred.tp2) newOutcome = 'WIN_TP2';
        else if (pred.tp1 > 0 && currentLivePrice >= pred.tp1) newOutcome = 'WIN_TP1';
        else if (pred.stopLoss > 0 && currentLivePrice <= pred.stopLoss) newOutcome = 'LOSS_SL';
      } else if (isSell) {
        if (pred.tp2 > 0 && currentLivePrice <= pred.tp2) newOutcome = 'WIN_TP2';
        else if (pred.tp1 > 0 && currentLivePrice <= pred.tp1) newOutcome = 'WIN_TP1';
        else if (pred.stopLoss > 0 && currentLivePrice >= pred.stopLoss) newOutcome = 'LOSS_SL';
      }

      if (newOutcome) {
        await prisma.tradePrediction.update({
          where: { id: pred.id },
          data: { outcome: newOutcome },
        });
      }
    }
  } catch {
    // Silent background reconciliation — never interrupt main request pipeline
  }
}

/**
 * Queries past logged predictions for the same asset and timeframe before the AI model
 * generates a new analysis, producing a brief historical performance note for the system prompt.
 */
export async function queryHistoricalPredictionMemory(
  rawAsset?: string,
  rawTimeframe?: string,
  currentLivePrice?: number
): Promise<PredictionMemoryContext> {
  const asset = normalizeAssetSymbol(rawAsset);
  const timeframe = normalizeTimeframeKey(rawTimeframe);

  try {
    await reconcilePendingPredictions(asset, currentLivePrice);

    let records = await prisma.tradePrediction.findMany({
      where: { asset, timeframe },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    if (records.length === 0) {
      records = await prisma.tradePrediction.findMany({
        where: { asset },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
    }

    if (records.length === 0) {
      const note = `No prior logged TradePrediction records for ${asset} (${timeframe}). Enforce strict 5-point institutional confluence and 0.5x ATR stop-loss buffering to establish baseline accuracy.`;
      return {
        asset,
        timeframe,
        totalPredictions: 0,
        resolvedCount: 0,
        winRatePercent: null,
        avgConfidence: 0,
        lastBias: null,
        lastOutcome: null,
        historicalPerformanceNote: note,
        promptContext: `HISTORICAL PREDICTION MEMORY (${asset} @ ${timeframe}):\n  - ${note}`,
      };
    }

    const totalPredictions = records.length;
    const avgConfidence = Number(
      (
        records.reduce((acc, r) => acc + (r.confidenceScore || 0), 0) / totalPredictions
      ).toFixed(1)
    );

    const wins = records.filter((r) => r.outcome.startsWith('WIN')).length;
    const losses = records.filter((r) => r.outcome.startsWith('LOSS')).length;
    const resolvedCount = wins + losses;
    const winRatePercent =
      resolvedCount > 0 ? Number(((wins / resolvedCount) * 100).toFixed(1)) : null;

    const latest = records[0];
    const recentSummary = records
      .slice(0, 3)
      .map(
        (r) =>
          `${r.setupType} (${r.bias} @ ${r.entryPrice}, SL ${r.stopLoss}, TP1 ${r.tp1}, Session: ${r.sessionName}, Outcome: ${r.outcome})`
      )
      .join(' | ');

    const winRateText =
      winRatePercent !== null
        ? `Historical Win Rate: ${winRatePercent}% (${wins}W / ${losses}L across ${resolvedCount} resolved setups)`
        : `${totalPredictions} setups logged (awaiting TP/SL resolution; avg confidence ${avgConfidence}%)`;

    const calibrationGuidance =
      winRatePercent !== null && winRatePercent < 60
        ? 'Past setups experienced stop-outs on tight invalidations; prioritize deeper OTE 0.618-0.786 entries and full 0.5x ATR stop-loss buffers.'
        : 'Maintain disciplined institutional entry selection at unmitigated FVG/OB zones with 0.5x ATR stop-loss protection.';

    const historicalPerformanceNote = `${asset} ${timeframe} Memory: ${winRateText}. Recent setups: ${recentSummary}. Guidance: ${calibrationGuidance}`;

    const promptContext = [
      `HISTORICAL PREDICTION MEMORY & SELF-CALIBRATION (${asset} @ ${timeframe}):`,
      `  - Total Logged Setups: ${totalPredictions} | Average AI Confidence: ${avgConfidence}%`,
      `  - Performance Track Record: ${winRateText}`,
      `  - Most Recent Logged Setup: ${recentSummary}`,
      `  - Calibration Mandate: ${calibrationGuidance}`,
    ].join('\n');

    return {
      asset,
      timeframe,
      totalPredictions,
      resolvedCount,
      winRatePercent,
      avgConfidence,
      lastBias: latest?.bias || null,
      lastOutcome: latest?.outcome || null,
      historicalPerformanceNote,
      promptContext,
    };
  } catch {
    const fallbackNote = `Prediction memory initialized for ${asset} (${timeframe}). Apply strict institutional SMC and 0.5x ATR stop-loss buffering.`;
    return {
      asset,
      timeframe,
      totalPredictions: 0,
      resolvedCount: 0,
      winRatePercent: null,
      avgConfidence: 0,
      lastBias: null,
      lastOutcome: null,
      historicalPerformanceNote: fallbackNote,
      promptContext: `HISTORICAL PREDICTION MEMORY (${asset} @ ${timeframe}):\n  - ${fallbackNote}`,
    };
  }
}

/**
 * Silently logs every generated setup into the TradePrediction table in the background.
 */
export async function logTradePredictionSilently(
  input: LogTradePredictionInput
): Promise<void> {
  try {
    const asset = normalizeAssetSymbol(input.asset);
    const timeframe = normalizeTimeframeKey(input.timeframe);

    await prisma.tradePrediction.create({
      data: {
        asset,
        timeframe,
        setupType: String(input.setupType || 'NO TRADE'),
        bias: String(input.bias || 'NEUTRAL'),
        confidenceScore: Number(input.confidenceScore) || 0,
        entryPrice: Number(input.entryPrice) || 0,
        stopLoss: Number(input.stopLoss) || 0,
        tp1: Number(input.tp1) || 0,
        tp2: Number(input.tp2) || 0,
        sessionName: String(input.sessionName || 'New York Open'),
        outcome: String(input.outcome || 'PENDING'),
      },
    });
  } catch (err) {
    console.warn('Silent TradePrediction logging skipped:', err);
  }
}
