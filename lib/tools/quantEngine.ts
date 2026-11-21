import { MarketBias } from '../types';
import {
  MultiTimeframeMarketContext,
  OHLCVCandle,
  SupportedTimeframe,
  getAssetDecimals,
  normalizeTimeframeKey,
} from './marketData';

export type TradingSessionName =
  | 'Asian'
  | 'London Open'
  | 'New York Open'
  | 'London Close';

export interface SwingPoint {
  index: number;
  price: number;
  timestamp: number;
  type: 'HIGH' | 'LOW';
}

export interface StructureBreakEvent {
  type: 'BOS' | 'CHoCH';
  direction: MarketBias;
  brokenLevel: number;
  closePrice: number;
  candleIndex: number;
  description: string;
}

export interface FairValueGapZone {
  type: 'BULLISH' | 'BEARISH';
  bottom: number;
  top: number;
  midpoint: number;
  candleIndex: number;
  unmitigated: boolean;
}

export interface OrderBlockZone {
  type: 'DEMAND' | 'SUPPLY';
  bottom: number;
  top: number;
  meanThreshold: number;
  candleIndex: number;
  unmitigated: boolean;
}

export interface FibonacciZones {
  dealingRangeLow: number;
  dealingRangeHigh: number;
  equilibrium50: number;
  currentPosition: 'DISCOUNT' | 'PREMIUM' | 'EQUILIBRIUM';
  bullishDiscountOTE: {
    ote618: number;
    ote705: number;
    ote786: number;
  };
  bearishPremiumOTE: {
    ote618: number;
    ote705: number;
    ote786: number;
  };
}

export interface EMAAlignment {
  ema20: number;
  ema50: number;
  ema200: number;
  alignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  stackLabel: string;
}

export interface LiquiditySweepInfo {
  detected: boolean;
  type: 'SSL_SWEEP' | 'BSL_SWEEP' | 'NONE';
  sweptLevel: number;
  wickExtreme: number;
  closePrice: number;
  description: string;
}

export interface SessionContext {
  sessionName: TradingSessionName;
  utcHour: number;
  isKillzone: boolean;
  sessionWindowLabel: string;
  liquiditySweep: LiquiditySweepInfo;
}

export interface QuantTimeframeSnapshot {
  timeframe: SupportedTimeframe;
  trendBias: MarketBias;
  latestClose: number;
  swingHigh: number;
  swingLow: number;
  atr14: number;
  rsi14: number;
  vwap: number;
  ema: EMAAlignment;
  lastStructureBreak: StructureBreakEvent | null;
  unmitigatedFVGs: FairValueGapZone[];
  activeOrderBlocks: OrderBlockZone[];
  fibonacci: FibonacciZones;
  liquiditySweep: LiquiditySweepInfo;
}

export interface QuantEngineOutput {
  asset: string;
  primaryTimeframe: SupportedTimeframe;
  htfBias: MarketBias;
  ltfBias: MarketBias;
  overallQuantBias: MarketBias;
  currentPrice: number;
  atr14: number;
  halfAtrBuffer: number;
  rsi14: number;
  rsiState: 'OVERBOUGHT' | 'BULLISH_MOMENTUM' | 'NEUTRAL' | 'BEARISH_MOMENTUM' | 'OVERSOLD';
  sessionVwap: number;
  ema: EMAAlignment;
  structure: {
    swingHigh: number;
    swingLow: number;
    lastBOS: StructureBreakEvent | null;
    lastCHoCH: StructureBreakEvent | null;
    summary: string;
  };
  unmitigatedFVGs: FairValueGapZone[];
  activeOrderBlocks: OrderBlockZone[];
  fibonacci: FibonacciZones;
  session: SessionContext;
  snapshots: Record<string, QuantTimeframeSnapshot>;
  lineChartMacroSupportNote: string;
  promptContext: string;
}

function getDecimalsForAsset(asset: string, samplePrice: number): number {
  return getAssetDecimals(asset, samplePrice);
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Pure function: Detect fractal swing highs and swing lows
 */
export function detectSwingPoints(candles: OHLCVCandle[], leftRight = 2): SwingPoint[] {
  const swings: SwingPoint[] = [];
  if (candles.length < leftRight * 2 + 1) return swings;

  for (let i = leftRight; i < candles.length - leftRight; i++) {
    const current = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let offset = 1; offset <= leftRight; offset++) {
      if (
        candles[i - offset].high > current.high ||
        candles[i + offset].high >= current.high
      ) {
        isSwingHigh = false;
      }
      if (
        candles[i - offset].low < current.low ||
        candles[i + offset].low <= current.low
      ) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swings.push({
        index: i,
        price: current.high,
        timestamp: current.timestamp,
        type: 'HIGH',
      });
    }
    if (isSwingLow) {
      swings.push({
        index: i,
        price: current.low,
        timestamp: current.timestamp,
        type: 'LOW',
      });
    }
  }

  return swings;
}

/**
 * Pure function: Detect Break of Structure (BOS) & Change of Character (CHoCH)
 */
export function detectMarketStructure(
  candles: OHLCVCandle[],
  swings: SwingPoint[],
  decimals: number
): {
  trendBias: MarketBias;
  lastBOS: StructureBreakEvent | null;
  lastCHoCH: StructureBreakEvent | null;
  lastEvent: StructureBreakEvent | null;
  swingHigh: number;
  swingLow: number;
} {
  if (candles.length === 0) {
    return {
      trendBias: 'NEUTRAL',
      lastBOS: null,
      lastCHoCH: null,
      lastEvent: null,
      swingHigh: 0,
      swingLow: 0,
    };
  }

  const recentSlice = candles.slice(-30);
  const fallbackHigh = roundTo(Math.max(...recentSlice.map((c) => c.high)), decimals);
  const fallbackLow = roundTo(Math.min(...recentSlice.map((c) => c.low)), decimals);

  const swingHighs = swings.filter((s) => s.type === 'HIGH');
  const swingLows = swings.filter((s) => s.type === 'LOW');

  const latestSwingHigh =
    swingHighs.length > 0
      ? roundTo(swingHighs[swingHighs.length - 1].price, decimals)
      : fallbackHigh;
  const latestSwingLow =
    swingLows.length > 0
      ? roundTo(swingLows[swingLows.length - 1].price, decimals)
      : fallbackLow;

  let activeTrend: MarketBias =
    candles[candles.length - 1].close >= candles[0].close ? 'BULLISH' : 'BEARISH';
  let lastBOS: StructureBreakEvent | null = null;
  let lastCHoCH: StructureBreakEvent | null = null;

  let trackedHigh = swingHighs[0]?.price ?? candles[0].high;
  let trackedLow = swingLows[0]?.price ?? candles[0].low;

  for (let i = 3; i < candles.length; i++) {
    const c = candles[i];
    const priorHighSwing = swingHighs.filter((s) => s.index < i - 1).pop();
    const priorLowSwing = swingLows.filter((s) => s.index < i - 1).pop();

    if (priorHighSwing) trackedHigh = priorHighSwing.price;
    if (priorLowSwing) trackedLow = priorLowSwing.price;

    if (c.close > trackedHigh && candles[i - 1].close <= trackedHigh) {
      const broken = roundTo(trackedHigh, decimals);
      if (activeTrend === 'BEARISH') {
        lastCHoCH = {
          type: 'CHoCH',
          direction: 'BULLISH',
          brokenLevel: broken,
          closePrice: roundTo(c.close, decimals),
          candleIndex: i,
          description: `Bullish CHoCH above ${broken}`,
        };
      } else {
        lastBOS = {
          type: 'BOS',
          direction: 'BULLISH',
          brokenLevel: broken,
          closePrice: roundTo(c.close, decimals),
          candleIndex: i,
          description: `Bullish BOS above ${broken}`,
        };
      }
      activeTrend = 'BULLISH';
    } else if (c.close < trackedLow && candles[i - 1].close >= trackedLow) {
      const broken = roundTo(trackedLow, decimals);
      if (activeTrend === 'BULLISH') {
        lastCHoCH = {
          type: 'CHoCH',
          direction: 'BEARISH',
          brokenLevel: broken,
          closePrice: roundTo(c.close, decimals),
          candleIndex: i,
          description: `Bearish CHoCH below ${broken}`,
        };
      } else {
        lastBOS = {
          type: 'BOS',
          direction: 'BEARISH',
          brokenLevel: broken,
          closePrice: roundTo(c.close, decimals),
          candleIndex: i,
          description: `Bearish BOS below ${broken}`,
        };
      }
      activeTrend = 'BEARISH';
    }
  }

  const lastEvent =
    lastBOS && lastCHoCH
      ? lastBOS.candleIndex >= lastCHoCH.candleIndex
        ? lastBOS
        : lastCHoCH
      : lastBOS || lastCHoCH;

  return {
    trendBias: activeTrend,
    lastBOS,
    lastCHoCH,
    lastEvent,
    swingHigh: Math.max(latestSwingHigh, fallbackHigh),
    swingLow: Math.min(latestSwingLow, fallbackLow),
  };
}

/**
 * Pure function: Detect unmitigated Fair Value Gaps (FVG price ranges)
 */
export function detectUnmitigatedFVGs(
  candles: OHLCVCandle[],
  decimals: number
): FairValueGapZone[] {
  const fvgs: FairValueGapZone[] = [];
  if (candles.length < 4) return fvgs;

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG: candle[i-2].high < candle[i].low
    if (c3.low > c1.high) {
      const bottom = roundTo(c1.high, decimals);
      const top = roundTo(c3.low, decimals);
      // Check if subsequent candles completely filled below bottom
      let mitigated = false;
      for (let k = i + 1; k < candles.length; k++) {
        if (candles[k].low <= bottom) {
          mitigated = true;
          break;
        }
      }
      if (!mitigated && top > bottom) {
        fvgs.push({
          type: 'BULLISH',
          bottom,
          top,
          midpoint: roundTo((bottom + top) / 2, decimals),
          candleIndex: i - 1,
          unmitigated: true,
        });
      }
    }

    // Bearish FVG: candle[i-2].low > candle[i].high
    if (c3.high < c1.low) {
      const bottom = roundTo(c3.high, decimals);
      const top = roundTo(c1.low, decimals);
      let mitigated = false;
      for (let k = i + 1; k < candles.length; k++) {
        if (candles[k].high >= top) {
          mitigated = true;
          break;
        }
      }
      if (!mitigated && top > bottom) {
        fvgs.push({
          type: 'BEARISH',
          bottom,
          top,
          midpoint: roundTo((bottom + top) / 2, decimals),
          candleIndex: i - 1,
          unmitigated: true,
        });
      }
    }
  }

  return fvgs.slice(-4);
}

/**
 * Pure function: Detect institutional Order Blocks (Demand & Supply OBs)
 */
export function detectOrderBlocks(
  candles: OHLCVCandle[],
  decimals: number
): OrderBlockZone[] {
  const obs: OrderBlockZone[] = [];
  if (candles.length < 6) return obs;

  const avgBody =
    candles.reduce((acc, c) => acc + Math.abs(c.close - c.open), 0) / candles.length;

  for (let i = 1; i < candles.length - 2; i++) {
    const candidate = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    const isBearishCandle = candidate.close < candidate.open;
    const isBullishCandle = candidate.close > candidate.open;

    const bullishDisplacement =
      next1.close > next1.open &&
      Math.abs(next1.close - next1.open) > avgBody * 1.15 &&
      next2.close > candidate.high;

    if (isBearishCandle && bullishDisplacement) {
      const bottom = roundTo(candidate.low, decimals);
      const top = roundTo(candidate.open, decimals);
      let invalidated = false;
      for (let k = i + 2; k < candles.length; k++) {
        if (candles[k].close < bottom) {
          invalidated = true;
          break;
        }
      }
      if (!invalidated && top > bottom) {
        obs.push({
          type: 'DEMAND',
          bottom,
          top,
          meanThreshold: roundTo((bottom + top) / 2, decimals),
          candleIndex: i,
          unmitigated: true,
        });
      }
    }

    const bearishDisplacement =
      next1.close < next1.open &&
      Math.abs(next1.open - next1.close) > avgBody * 1.15 &&
      next2.close < candidate.low;

    if (isBullishCandle && bearishDisplacement) {
      const bottom = roundTo(candidate.open, decimals);
      const top = roundTo(candidate.high, decimals);
      let invalidated = false;
      for (let k = i + 2; k < candles.length; k++) {
        if (candles[k].close > top) {
          invalidated = true;
          break;
        }
      }
      if (!invalidated && top > bottom) {
        obs.push({
          type: 'SUPPLY',
          bottom,
          top,
          meanThreshold: roundTo((bottom + top) / 2, decimals),
          candleIndex: i,
          unmitigated: true,
        });
      }
    }
  }

  return obs.slice(-4);
}

/**
 * Pure function: Compute Premium/Discount Fibonacci Zones (0.5 EQ & 0.618-0.786 OTE)
 */
export function computeFibonacciZones(
  candles: OHLCVCandle[],
  decimals: number
): FibonacciZones {
  const recent = candles.slice(-40);
  const high = roundTo(Math.max(...recent.map((c) => c.high)), decimals);
  const low = roundTo(Math.min(...recent.map((c) => c.low)), decimals);
  const current = recent[recent.length - 1]?.close ?? 0;
  const span = Math.max(high - low, Math.pow(10, -decimals));

  const equilibrium50 = roundTo(low + span * 0.5, decimals);

  // Bullish OTE is in the Discount half (retracement down from high toward low)
  const bullishDiscountOTE = {
    ote618: roundTo(high - span * 0.618, decimals),
    ote705: roundTo(high - span * 0.705, decimals),
    ote786: roundTo(high - span * 0.786, decimals),
  };

  // Bearish OTE is in the Premium half (retracement up from low toward high)
  const bearishPremiumOTE = {
    ote618: roundTo(low + span * 0.618, decimals),
    ote705: roundTo(low + span * 0.705, decimals),
    ote786: roundTo(low + span * 0.786, decimals),
  };

  const relPos = (current - low) / span;
  const currentPosition: 'DISCOUNT' | 'PREMIUM' | 'EQUILIBRIUM' =
    relPos < 0.47 ? 'DISCOUNT' : relPos > 0.53 ? 'PREMIUM' : 'EQUILIBRIUM';

  return {
    dealingRangeLow: low,
    dealingRangeHigh: high,
    equilibrium50,
    currentPosition,
    bullishDiscountOTE,
    bearishPremiumOTE,
  };
}

/**
 * Pure function: Compute 14-period Average True Range (ATR 14)
 */
export function computeATR14(
  candles: OHLCVCandle[],
  period = 14,
  decimals = 2
): number {
  if (candles.length === 0) return 0;
  if (candles.length === 1) {
    return roundTo(candles[0].high - candles[0].low, decimals);
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length <= period) {
    const avg = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
    return roundTo(avg, decimals);
  }

  // Wilder's smoothing RMA
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return roundTo(atr, decimals);
}

/**
 * Pure function: Compute 14-period Relative Strength Index (RSI 14)
 */
export function computeRSI14(candles: OHLCVCandle[], period = 14): number {
  if (candles.length <= 2) return 50;

  let gains = 0;
  let losses = 0;
  const initialLen = Math.min(period, candles.length - 1);

  for (let i = 1; i <= initialLen; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / initialLen;
  let avgLoss = losses / initialLen;

  for (let i = initialLen + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(2));
}

/**
 * Pure function: Compute Exponential Moving Average (EMA) & 20/50/200 alignment
 */
export function computeEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  const seedLen = Math.min(period, closes.length);
  let ema = closes.slice(0, seedLen).reduce((a, b) => a + b, 0) / seedLen;
  const k = 2 / (period + 1);
  for (let i = seedLen; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export function computeEMAAlignment(
  candles: OHLCVCandle[],
  decimals: number
): EMAAlignment {
  const closes = candles.map((c) => c.close);
  const ema20 = roundTo(computeEMA(closes, 20), decimals);
  const ema50 = roundTo(computeEMA(closes, 50), decimals);
  const ema200 = roundTo(computeEMA(closes, 200), decimals);

  if (ema20 > ema50 && ema50 >= ema200) {
    return {
      ema20,
      ema50,
      ema200,
      alignment: 'BULLISH',
      stackLabel: `Bullish EMA Stack (EMA20 ${ema20} > EMA50 ${ema50} > EMA200 ${ema200})`,
    };
  }
  if (ema20 < ema50 && ema50 <= ema200) {
    return {
      ema20,
      ema50,
      ema200,
      alignment: 'BEARISH',
      stackLabel: `Bearish EMA Stack (EMA20 ${ema20} < EMA50 ${ema50} < EMA200 ${ema200})`,
    };
  }
  if (ema20 > ema50) {
    return {
      ema20,
      ema50,
      ema200,
      alignment: 'BULLISH',
      stackLabel: `Bullish Short-Term EMA Crossover (EMA20 ${ema20} > EMA50 ${ema50}, EMA200 ${ema200})`,
    };
  }
  if (ema20 < ema50) {
    return {
      ema20,
      ema50,
      ema200,
      alignment: 'BEARISH',
      stackLabel: `Bearish Short-Term EMA Crossover (EMA20 ${ema20} < EMA50 ${ema50}, EMA200 ${ema200})`,
    };
  }
  return {
    ema20,
    ema50,
    ema200,
    alignment: 'NEUTRAL',
    stackLabel: `Compressed EMA Equilibrium (EMA20 ${ema20} / EMA50 ${ema50} / EMA200 ${ema200})`,
  };
}

/**
 * Pure function: Compute Session VWAP
 */
export function computeSessionVWAP(candles: OHLCVCandle[], decimals: number): number {
  const sessionSlice = candles.slice(-24);
  if (sessionSlice.length === 0) return 0;

  let cumulativePV = 0;
  let cumulativeVol = 0;

  for (const c of sessionSlice) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    cumulativePV += typicalPrice * vol;
    cumulativeVol += vol;
  }

  return cumulativeVol > 0
    ? roundTo(cumulativePV / cumulativeVol, decimals)
    : roundTo(sessionSlice[sessionSlice.length - 1].close, decimals);
}

/**
 * Pure function: Detect active UTC trading session & liquidity sweeps
 */
export function detectSessionAndLiquiditySweep(
  candles: OHLCVCandle[],
  decimals: number,
  referenceDate: Date = new Date()
): SessionContext {
  const utcHour = referenceDate.getUTCHours();

  let sessionName: TradingSessionName = 'Asian';
  let isKillzone = false;
  let sessionWindowLabel = 'Asian Accumulation Session (00:00 - 07:00 UTC)';

  if (utcHour >= 0 && utcHour < 7) {
    sessionName = 'Asian';
    isKillzone = utcHour >= 1 && utcHour <= 5;
    sessionWindowLabel = 'Asian Session Killzone (00:00 - 07:00 UTC)';
  } else if (utcHour >= 7 && utcHour < 12) {
    sessionName = 'London Open';
    isKillzone = utcHour >= 7 && utcHour <= 10;
    sessionWindowLabel = 'London Open Killzone (07:00 - 12:00 UTC)';
  } else if (utcHour >= 12 && utcHour < 16) {
    sessionName = 'New York Open';
    isKillzone = utcHour >= 12 && utcHour <= 15;
    sessionWindowLabel = 'New York Open Killzone (12:00 - 16:00 UTC)';
  } else if (utcHour >= 16 && utcHour < 20) {
    sessionName = 'London Close';
    isKillzone = utcHour >= 16 && utcHour <= 18;
    sessionWindowLabel = 'London Close Killzone (16:00 - 20:00 UTC)';
  } else {
    sessionName = 'Asian';
    isKillzone = false;
    sessionWindowLabel = 'Late NY / Early Asian Transition (20:00 - 00:00 UTC)';
  }

  const liquiditySweep = detectLiquiditySweepOnCandles(candles, decimals);

  return {
    sessionName,
    utcHour,
    isKillzone,
    sessionWindowLabel,
    liquiditySweep,
  };
}

export function detectLiquiditySweepOnCandles(
  candles: OHLCVCandle[],
  decimals: number
): LiquiditySweepInfo {
  if (candles.length < 15) {
    return {
      detected: false,
      type: 'NONE',
      sweptLevel: 0,
      wickExtreme: 0,
      closePrice: 0,
      description: 'No recent session liquidity sweep detected',
    };
  }

  const priorWindow = candles.slice(0, -16);
  const recentWindow = candles.slice(-16);

  const priorLow = roundTo(Math.min(...priorWindow.map((c) => c.low)), decimals);
  const priorHigh = roundTo(Math.max(...priorWindow.map((c) => c.high)), decimals);

  // Check if any recent candle swept below priorLow and closed back above priorLow (or started bullish reversal)
  for (let i = recentWindow.length - 1; i >= 0; i--) {
    const bar = recentWindow[i];
    if (bar.low < priorLow && (bar.close > bar.low + (bar.high - bar.low) * 0.45 || bar.close >= priorLow)) {
      return {
        detected: true,
        type: 'SSL_SWEEP',
        sweptLevel: priorLow,
        wickExtreme: roundTo(bar.low, decimals),
        closePrice: roundTo(bar.close, decimals),
        description: `Sell-Side Liquidity (SSL) Sweep below ${priorLow} (wick to ${roundTo(bar.low, decimals)}) followed by institutional rejection`,
      };
    }
    if (bar.high > priorHigh && (bar.close < bar.high - (bar.high - bar.low) * 0.45 || bar.close <= priorHigh)) {
      return {
        detected: true,
        type: 'BSL_SWEEP',
        sweptLevel: priorHigh,
        wickExtreme: roundTo(bar.high, decimals),
        closePrice: roundTo(bar.close, decimals),
        description: `Buy-Side Liquidity (BSL) Sweep above ${priorHigh} (wick to ${roundTo(bar.high, decimals)}) followed by institutional rejection`,
      };
    }
  }

  // Secondary check: internal swing liquidity sweep within last 20 candles
  const lookback = candles.slice(-25, -8);
  const triggerBars = candles.slice(-8);
  if (lookback.length > 0 && triggerBars.length > 0) {
    const internalLow = roundTo(Math.min(...lookback.map((c) => c.low)), decimals);
    const internalHigh = roundTo(Math.max(...lookback.map((c) => c.high)), decimals);
    for (const bar of triggerBars) {
      if (bar.low <= internalLow && bar.close > bar.low) {
        return {
          detected: true,
          type: 'SSL_SWEEP',
          sweptLevel: internalLow,
          wickExtreme: roundTo(bar.low, decimals),
          closePrice: roundTo(bar.close, decimals),
          description: `Internal Session SSL Sweep at ${internalLow} defended by buyers`,
        };
      }
      if (bar.high >= internalHigh && bar.close < bar.high) {
        return {
          detected: true,
          type: 'BSL_SWEEP',
          sweptLevel: internalHigh,
          wickExtreme: roundTo(bar.high, decimals),
          closePrice: roundTo(bar.close, decimals),
          description: `Internal Session BSL Sweep at ${internalHigh} rejected by sellers`,
        };
      }
    }
  }

  return {
    detected: false,
    type: 'NONE',
    sweptLevel: priorLow,
    wickExtreme: priorLow,
    closePrice: candles[candles.length - 1].close,
    description: `Resting liquidity pools intact between SSL ${priorLow} and BSL ${priorHigh}`,
  };
}

function buildTimeframeSnapshot(
  timeframe: SupportedTimeframe,
  candles: OHLCVCandle[],
  decimals: number
): QuantTimeframeSnapshot {
  const swings = detectSwingPoints(candles, 2);
  const structure = detectMarketStructure(candles, swings, decimals);
  const fvgs = detectUnmitigatedFVGs(candles, decimals);
  const obs = detectOrderBlocks(candles, decimals);
  const fib = computeFibonacciZones(candles, decimals);
  const atr14 = computeATR14(candles, 14, decimals);
  const rsi14 = computeRSI14(candles, 14);
  const ema = computeEMAAlignment(candles, decimals);
  const vwap = computeSessionVWAP(candles, decimals);
  const liquiditySweep = detectLiquiditySweepOnCandles(candles, decimals);
  const latestClose = roundTo(candles[candles.length - 1]?.close ?? 0, decimals);

  return {
    timeframe,
    trendBias: structure.trendBias,
    latestClose,
    swingHigh: structure.swingHigh,
    swingLow: structure.swingLow,
    atr14,
    rsi14,
    vwap,
    ema,
    lastStructureBreak: structure.lastEvent,
    unmitigatedFVGs: fvgs,
    activeOrderBlocks: obs,
    fibonacci: fib,
    liquiditySweep,
  };
}

/**
 * Main entry point: Run deterministic quantitative & SMC engine across 4H, 1H, 15M, and 5M candles
 */
export function runQuantEngine(
  mtf: MultiTimeframeMarketContext,
  requestedTimeframe?: string,
  referenceDate: Date = new Date()
): QuantEngineOutput {
  const primaryTf = normalizeTimeframeKey(requestedTimeframe || mtf.primaryTimeframe);
  const primaryCandles = mtf.timeframes[primaryTf]?.candles || mtf.timeframes['15M'].candles;
  const decimals = getDecimalsForAsset(mtf.asset, mtf.currentSpotPrice);

  const snapshots: Record<string, QuantTimeframeSnapshot> = {
    '4H': buildTimeframeSnapshot('4H', mtf.timeframes['4H'].candles, decimals),
    '1H': buildTimeframeSnapshot('1H', mtf.timeframes['1H'].candles, decimals),
    '15M': buildTimeframeSnapshot('15M', mtf.timeframes['15M'].candles, decimals),
    '5M': buildTimeframeSnapshot('5M', mtf.timeframes['5M'].candles, decimals),
  };

  if (!snapshots[primaryTf] && mtf.timeframes[primaryTf]) {
    snapshots[primaryTf] = buildTimeframeSnapshot(
      primaryTf,
      mtf.timeframes[primaryTf].candles,
      decimals
    );
  }

  const primarySnap = snapshots[primaryTf] || snapshots['15M'];
  const swings = detectSwingPoints(primaryCandles, 2);
  const structureDetail = detectMarketStructure(primaryCandles, swings, decimals);
  const session = detectSessionAndLiquiditySweep(primaryCandles, decimals, referenceDate);

  // Determine HTF (4H + 1H) and LTF (15M + 5M) bias
  const htfBullCount =
    (snapshots['4H'].trendBias === 'BULLISH' ? 1 : 0) +
    (snapshots['1H'].trendBias === 'BULLISH' ? 1 : 0) +
    (snapshots['4H'].ema.alignment === 'BULLISH' ? 1 : 0);
  const htfBearCount =
    (snapshots['4H'].trendBias === 'BEARISH' ? 1 : 0) +
    (snapshots['1H'].trendBias === 'BEARISH' ? 1 : 0) +
    (snapshots['4H'].ema.alignment === 'BEARISH' ? 1 : 0);

  const htfBias: MarketBias =
    htfBullCount > htfBearCount
      ? 'BULLISH'
      : htfBearCount > htfBullCount
      ? 'BEARISH'
      : primarySnap.trendBias;

  const ltfBullCount =
    (snapshots['15M'].trendBias === 'BULLISH' ? 1 : 0) +
    (snapshots['5M'].trendBias === 'BULLISH' ? 1 : 0);
  const ltfBearCount =
    (snapshots['15M'].trendBias === 'BEARISH' ? 1 : 0) +
    (snapshots['5M'].trendBias === 'BEARISH' ? 1 : 0);

  const ltfBias: MarketBias =
    ltfBullCount > ltfBearCount
      ? 'BULLISH'
      : ltfBearCount > ltfBullCount
      ? 'BEARISH'
      : primarySnap.trendBias;

  const overallQuantBias: MarketBias =
    htfBias === ltfBias ? htfBias : primarySnap.trendBias;

  const rsi14 = primarySnap.rsi14;
  const rsiState =
    rsi14 >= 70
      ? 'OVERBOUGHT'
      : rsi14 >= 54
      ? 'BULLISH_MOMENTUM'
      : rsi14 <= 30
      ? 'OVERSOLD'
      : rsi14 <= 46
      ? 'BEARISH_MOMENTUM'
      : 'NEUTRAL';

  const halfAtrBuffer = roundTo(Math.max(primarySnap.atr14 * 0.5, Math.pow(10, -decimals)), decimals);

  const fvgSummary =
    primarySnap.unmitigatedFVGs.length > 0
      ? primarySnap.unmitigatedFVGs
          .map((f) => `${f.type} FVG [${f.bottom} - ${f.top}] (mid ${f.midpoint})`)
          .join('; ')
      : `Equilibrium Imbalance Node near ${primarySnap.fibonacci.equilibrium50}`;

  const obSummary =
    primarySnap.activeOrderBlocks.length > 0
      ? primarySnap.activeOrderBlocks
          .map((o) => `${o.type} OB [${o.bottom} - ${o.top}] (MT ${o.meanThreshold})`)
          .join('; ')
      : `Protected Swing Order Block at ${
          overallQuantBias === 'BEARISH' ? primarySnap.swingHigh : primarySnap.swingLow
        }`;

  const structureSummary = [
    `${primaryTf} Structure: ${primarySnap.trendBias} (Swing Low ${primarySnap.swingLow} / Swing High ${primarySnap.swingHigh})`,
    structureDetail.lastBOS ? structureDetail.lastBOS.description : null,
    structureDetail.lastCHoCH ? structureDetail.lastCHoCH.description : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const lineChartMacroSupportNote =
    'LINE / OVERLAID CHART COMPATIBILITY GUARDRAIL: If the uploaded screenshot is a line chart, area chart, or multi-day overlaid spot curve (e.g., Kitco gold/silver spot chart), DO NOT invalidate or reject the image for missing candlestick wicks. Map FVG/OB structural zones onto horizontal support/resistance flip shelves and multi-session baseline curves while retaining exact ATR stop-loss buffering and R:R math.';

  const promptContext =
    mtf.source === 'INSTITUTIONAL_SYNTHETIC_FALLBACK'
      ? [
          `QUANTITATIVE & SMC ENGINE INSTRUCTIONS (${mtf.asset} @ ${primaryTf}):`,
          `  1. Active Trading Session: ${session.sessionName} (${session.sessionWindowLabel})`,
          `  2. Anti-Hallucination Guardrail: External live OHLCV feed is offline for ${mtf.asset}. DO NOT use external or memorized price levels. Read 100% of swing highs/lows, BOS/CHoCH breaks, FVG/Order Block ranges, and entry/SL/TP prices strictly from the visible Y-axis price scale of the uploaded screenshot.`,
          `  3. ${lineChartMacroSupportNote}`,
        ].join('\n')
      : [
          `DETERMINISTIC QUANTITATIVE & SMART MONEY CONCEPTS (SMC) ENGINE REPORT (${mtf.asset} @ ${primaryTf} | Source: ${mtf.source}):`,
          `  1. Multi-Timeframe Structure: HTF (4H/1H) Bias = ${htfBias} | LTF (15M/5M) Bias = ${ltfBias} | Primary ${primaryTf}: ${structureSummary}`,
          `  2. Unmitigated Fair Value Gaps (FVG): ${fvgSummary}`,
          `  3. Institutional Order Blocks (OB): ${obSummary}`,
          `  4. Dealing Range & Fibonacci Zones: Range [${primarySnap.fibonacci.dealingRangeLow} - ${primarySnap.fibonacci.dealingRangeHigh}] | 0.5 EQ = ${primarySnap.fibonacci.equilibrium50} | Current Zone = ${primarySnap.fibonacci.currentPosition} | Bullish Discount OTE (0.618-0.786) = [${primarySnap.fibonacci.bullishDiscountOTE.ote786} - ${primarySnap.fibonacci.bullishDiscountOTE.ote618}] | Bearish Premium OTE (0.618-0.786) = [${primarySnap.fibonacci.bearishPremiumOTE.ote618} - ${primarySnap.fibonacci.bearishPremiumOTE.ote786}]`,
          `  5. Volatility & Momentum Indicators: ATR(14) = ${primarySnap.atr14} (0.5x ATR SL Buffer = ${halfAtrBuffer}) | RSI(14) = ${rsi14} (${rsiState}) | Session VWAP = ${primarySnap.vwap} | ${primarySnap.ema.stackLabel}`,
          `  6. Active Session & Liquidity Sweep: Session = ${session.sessionName} (${session.sessionWindowLabel}) | Sweep = ${session.liquiditySweep.description}`,
          `  7. CRITICAL ANTI-HALLUCINATION RULE: Only use the numeric price levels above if they fall within the uploaded chart's visible Y-axis range (axis_bottom_price to axis_top_price). If the screenshot shows a different price window or historical date, ignore these telemetry numbers and derive all trade levels and zones 100% from the screenshot's visible Y-axis.`,
          `  8. ${lineChartMacroSupportNote}`,
        ].join('\n');

  return {
    asset: mtf.asset,
    primaryTimeframe: primaryTf,
    htfBias,
    ltfBias,
    overallQuantBias,
    currentPrice: primarySnap.latestClose,
    atr14: primarySnap.atr14,
    halfAtrBuffer,
    rsi14,
    rsiState,
    sessionVwap: primarySnap.vwap,
    ema: primarySnap.ema,
    structure: {
      swingHigh: primarySnap.swingHigh,
      swingLow: primarySnap.swingLow,
      lastBOS: structureDetail.lastBOS,
      lastCHoCH: structureDetail.lastCHoCH,
      summary: structureSummary,
    },
    unmitigatedFVGs: primarySnap.unmitigatedFVGs,
    activeOrderBlocks: primarySnap.activeOrderBlocks,
    fibonacci: primarySnap.fibonacci,
    session,
    snapshots,
    lineChartMacroSupportNote,
    promptContext,
  };
}
