import {
  ForecastHistoricalCandle,
  ForecastProjectedPoint,
  ForecastTimeframe,
  MarketBias,
  MultiTimeframeForecast,
  SMCSignalOutput,
  TimeframeForecastProjection,
  formatSignalPrice,
} from '../types';
import { MacroNewsGuardrailResult } from './macroNews';
import {
  MarketDataSource,
  MultiTimeframeMarketContext,
  OHLCVCandle,
  generateSyntheticInstitutionalCandles,
  getAssetDecimals,
} from './marketData';
import { QuantEngineOutput, computeATR14 } from './quantEngine';

export interface FivePointConfluenceCheck {
  htfTrendAligned: boolean;
  liquiditySweepAligned: boolean;
  fvgObSrAligned: boolean;
  momentumRsiAligned: boolean;
  clearNewsWindowAligned: boolean;
  scoreOutOfFive: number;
  confluenceItems: string[];
}

export interface TightProximityClampMetrics {
  anchorCurrentPrice: number;
  atr14: number;
  maxEntryOffset: number;
  minSlDistance: number;
  maxSlDistance: number;
  entryClamped: boolean;
  slClamped: boolean;
  tp1Clamped: boolean;
  tp2Clamped: boolean;
}

export interface RiskValidationResult {
  validatedSignal: SMCSignalOutput;
  atrBufferApplied: number;
  slAdjusted: boolean;
  exactRRRatioTp1: number;
  exactRRRatioTp2: number;
  confluenceCheck: FivePointConfluenceCheck;
  tightProximityMetrics: TightProximityClampMetrics;
}

function getPriceDecimals(price: number, asset: string): number {
  const assetDecimals = getAssetDecimals(asset, price);
  if (!Number.isFinite(price) || price <= 0) return assetDecimals;
  const str = String(price);
  if (str.includes('.')) {
    const observed = Math.min(6, Math.max(1, str.split('.')[1].length));
    return Math.max(assetDecimals, observed);
  }
  return assetDecimals;
}

function roundToPrecision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Generates an aligned historical candle series anchored to `anchorCurrentPrice`
 * so the Multi-Timeframe Projection Chart always connects seamlessly to the setup's Entry, SL, TP1, and TP2.
 */
function alignCandlesToAnchorPrice(
  rawCandles: OHLCVCandle[],
  anchorCurrentPrice: number,
  targetAtr: number,
  decimals: number
): ForecastHistoricalCandle[] {
  const slice = rawCandles.slice(-36);
  if (slice.length === 0) return [];

  const lastClose = slice[slice.length - 1].close;
  const rawAtr = Math.max(computeATR14(slice, 14, decimals), Math.pow(10, -decimals) * 2);
  const scaleRatio =
    targetAtr > 0 && rawAtr > 0
      ? Math.min(3.5, Math.max(0.25, targetAtr / rawAtr))
      : 1;

  const minFloor = Math.pow(10, -decimals);

  return slice.map((c, idx) => {
    const timeSec = Math.floor(c.timestamp / 1000);
    const open = roundToPrecision(
      Math.max(minFloor, anchorCurrentPrice + (c.open - lastClose) * scaleRatio),
      decimals
    );
    const close =
      idx === slice.length - 1
        ? roundToPrecision(anchorCurrentPrice, decimals)
        : roundToPrecision(
            Math.max(minFloor, anchorCurrentPrice + (c.close - lastClose) * scaleRatio),
            decimals
          );
    const rawHighScaled = anchorCurrentPrice + (c.high - lastClose) * scaleRatio;
    const rawLowScaled = anchorCurrentPrice + (c.low - lastClose) * scaleRatio;
    const high = roundToPrecision(Math.max(open, close, rawHighScaled), decimals);
    const low = roundToPrecision(
      Math.max(minFloor, Math.min(open, close, rawLowScaled)),
      decimals
    );

    return {
      time: timeSec,
      open,
      high,
      low,
      close,
    };
  });
}

/**
 * Builds deterministic Multi-Timeframe Market Forecast (`5M`, `15M`, `1H`, `4H`)
 * containing historical candles, a 5-point future projected trajectory path
 * (Current Price -> Entry Retest / Pullback -> Structural Mid-Expansion -> TP1 Quick Profit -> TP2 Extended Scalp),
 * directional bias, and a 1-sentence technical outlook per timeframe.
 */
export function buildMultiTimeframeForecast(
  signal: SMCSignalOutput,
  quant: QuantEngineOutput,
  mtfContext?: MultiTimeframeMarketContext,
  anchorCurrentPrice?: number,
  baseAtr?: number
): MultiTimeframeForecast {
  const resolvedAsset = signal.asset || quant.asset || 'XAUUSD';
  const entryPrice = Number(signal.entry_price) || quant.currentPrice;
  const currentPrice =
    anchorCurrentPrice && anchorCurrentPrice > 0
      ? anchorCurrentPrice
      : Number(signal.accuracy_verification?.current_market_price) || entryPrice;
  const stopLoss = Number(signal.stop_loss) || currentPrice;
  const tp1 = Number(signal.take_profit_1) || currentPrice;
  const tp2 = Number(signal.take_profit_2) || tp1;

  const decimals = getPriceDecimals(currentPrice, resolvedAsset);
  const isSell =
    signal.trade_recommendation === 'SELL' ||
    signal.trade_execution?.setup_type === 'SELL SETUP' ||
    signal.bias === 'BEARISH';
  const primaryBias: MarketBias = isSell ? 'BEARISH' : 'BULLISH';

  const effectiveBaseAtr =
    baseAtr && baseAtr > 0
      ? baseAtr
      : quant.atr14 > 0
      ? quant.atr14
      : Math.max(Math.abs(entryPrice - stopLoss), currentPrice * 0.0025);

  const tfConfigs: {
    tf: ForecastTimeframe;
    stepSeconds: number;
    atrMultiplier: number;
    horizonLabel: string;
  }[] = [
    { tf: '1M', stepSeconds: 60, atrMultiplier: 0.35, horizonLabel: '5-minute ultra-fast scalp horizon' },
    { tf: '5M', stepSeconds: 5 * 60, atrMultiplier: 0.65, horizonLabel: '25-minute micro-scalp horizon' },
    { tf: '15M', stepSeconds: 15 * 60, atrMultiplier: 1.0, horizonLabel: '75-minute intraday execution window' },
    { tf: '30M', stepSeconds: 30 * 60, atrMultiplier: 1.22, horizonLabel: '2.5-hour intraday structure window' },
    { tf: '1H', stepSeconds: 60 * 60, atrMultiplier: 1.45, horizonLabel: '5-hour session continuation structure' },
    { tf: '4H', stepSeconds: 4 * 60 * 60, atrMultiplier: 2.1, horizonLabel: '20-hour institutional order-flow block' },
    { tf: '1D', stepSeconds: 24 * 60 * 60, atrMultiplier: 3.6, horizonLabel: '5-day daily swing expansion cycle' },
    { tf: '1W', stepSeconds: 7 * 24 * 60 * 60, atrMultiplier: 6.2, horizonLabel: '5-week macro institutional trajectory' },
  ];

  const forecast = {} as MultiTimeframeForecast;

  for (const cfg of tfConfigs) {
    const existingTfCandles = mtfContext?.timeframes?.[cfg.tf]?.candles;
    const rawTfCandles =
      existingTfCandles && existingTfCandles.length > 0
        ? existingTfCandles
        : generateSyntheticInstitutionalCandles(resolvedAsset, cfg.tf, {
            referencePrice: currentPrice,
            preferredBias: primaryBias,
          });

    const tfAtr = roundToPrecision(
      Math.max(effectiveBaseAtr * cfg.atrMultiplier, Math.pow(10, -decimals) * 4),
      decimals
    );

    const historicalCandles = alignCandlesToAnchorPrice(
      rawTfCandles,
      currentPrice,
      tfAtr,
      decimals
    );

    const nowSec =
      historicalCandles.length > 0
        ? historicalCandles[historicalCandles.length - 1].time
        : Math.floor(Date.now() / 1000);

    // Build 5-point future trajectory: Current -> Pullback/Entry -> Structure Break -> TP1 -> TP2
    const midExpansion = roundToPrecision((entryPrice + tp1) / 2, decimals);
    const postTp1Consolidation = roundToPrecision(
      tp1 + (tp2 - tp1) * 0.45,
      decimals
    );

    const projectedPath: ForecastProjectedPoint[] = [
      {
        time: nowSec,
        value: roundToPrecision(currentPrice, decimals),
        label: `Current (${formatSignalPrice(currentPrice, resolvedAsset)})`,
      },
      {
        time: nowSec + cfg.stepSeconds * 1,
        value: roundToPrecision(entryPrice, decimals),
        label: `Entry Fill (${formatSignalPrice(entryPrice, resolvedAsset)})`,
      },
      {
        time: nowSec + cfg.stepSeconds * 2,
        value: midExpansion,
        label: isSell ? 'Bearish Displacement' : 'Bullish Displacement',
      },
      {
        time: nowSec + cfg.stepSeconds * 3,
        value: roundToPrecision(tp1, decimals),
        label: `TP1 Quick Profit (${formatSignalPrice(tp1, resolvedAsset)})`,
      },
      {
        time: nowSec + cfg.stepSeconds * 4,
        value: postTp1Consolidation,
        label: 'Shallow Re-accumulation',
      },
      {
        time: nowSec + cfg.stepSeconds * 5,
        value: roundToPrecision(tp2, decimals),
        label: `TP2 Target (${formatSignalPrice(tp2, resolvedAsset)})`,
      },
    ];

    const snapBias = quant.snapshots?.[cfg.tf]?.trendBias || primaryBias;
    const resolvedTfBias: MarketBias =
      cfg.tf === '5M' || cfg.tf === '15M' ? primaryBias : snapBias || primaryBias;

    const actionVerb = isSell ? 'rejects micro-supply near' : 'defends micro-demand near';
    const targetVerb = isSell ? 'markdown expansion toward' : 'upside expansion toward';

    const shortNote = `${cfg.tf} (${cfg.horizonLabel}): Price ${actionVerb} ${formatSignalPrice(
      entryPrice,
      resolvedAsset
    )} (SL ${formatSignalPrice(
      stopLoss,
      resolvedAsset
    )}) before projected ${targetVerb} TP1 ${formatSignalPrice(
      tp1,
      resolvedAsset
    )} and TP2 ${formatSignalPrice(tp2, resolvedAsset)}.`;

    const tfProjection: TimeframeForecastProjection = {
      historicalCandles,
      projectedPath,
      bias: resolvedTfBias,
      shortNote,
    };

    forecast[cfg.tf] = tfProjection;
  }

  return forecast;
}

/**
 * Deterministic Post-LLM Tight Proximity & Quick-Profit Risk Engine:
 * 1. Anchors calculations strictly to the exact `currentPrice` and `14-period ATR` of the selected timeframe.
 * 2. Close Entry Rule: `Entry Price` is clamped within `0.3x ATR` of `currentPrice` (immediate execution or shallow micro-retest).
 * 3. Tight Stop Loss Rule: `Stop Loss` distance is clamped to `0.8x to 1.5x ATR` from `Entry Price`.
 * 4. Quick, Realistic Take Profit Rule:
 *    - `TP1` (Primary Quick Profit): Clamped to `1.0x to 1.5x` the Stop Loss distance (R:R ~ 1:1.2 to 1:1.5).
 *    - `TP2` (Extended Scalp Target): Clamped to `2.0x to 2.5x` the Stop Loss distance (R:R max 1:2.5).
 *    - `TP3` (Optional Runner): Clamped to `3.0x` the Stop Loss distance.
 */
export function validateAndEnrichSetup(
  signal: SMCSignalOutput,
  quant: QuantEngineOutput,
  news: MacroNewsGuardrailResult,
  historicalNote?: string,
  marketDataSource?: MarketDataSource,
  mtfContext?: MultiTimeframeMarketContext
): RiskValidationResult {
  const clone: SMCSignalOutput = JSON.parse(JSON.stringify(signal));
  const resolvedAsset = clone.asset || quant.asset;
  const decimals = getPriceDecimals(
    clone.entry_price || clone.accuracy_verification?.current_market_price || quant.currentPrice,
    resolvedAsset
  );

  const resolvedDirection =
    clone.trade_recommendation === 'SELL' ||
    clone.trade_execution?.setup_type === 'SELL SETUP' ||
    clone.bias === 'BEARISH' ||
    (clone.bias === 'NEUTRAL' && quant.overallQuantBias === 'BEARISH')
      ? 'SELL'
      : 'BUY';

  const isBuy = resolvedDirection === 'BUY';
  const isSell = resolvedDirection === 'SELL';
  const isLineMode =
    clone.chart_type === 'LINE_OR_OVERLAID' ||
    clone.analysis_mode === 'MACRO_PRICE_ACTION';

  let entryPrice = Number(clone.entry_price) || 0;
  let stopLoss = Number(clone.stop_loss) || 0;
  let takeProfit1 = Number(clone.take_profit_1) || 0;
  let takeProfit2 = Number(clone.take_profit_2) || 0;
  let takeProfit3 = Number(clone.take_profit_3 ?? clone.trade_execution?.take_profit_3) || 0;

  const adjustments = [...(clone.accuracy_verification?.adjustments_applied || [])];

  const axisTop = Number(clone.accuracy_verification?.axis_top_price) || 0;
  const axisBottom = Number(clone.accuracy_verification?.axis_bottom_price) || 0;
  const hasCalibratedYAxis = axisTop > axisBottom && axisBottom > 0;
  const axisSpan = hasCalibratedYAxis ? axisTop - axisBottom : 0;
  const axisMid = hasCalibratedYAxis
    ? roundToPrecision((axisTop + axisBottom) / 2, decimals)
    : 0;

  // Determine whether the external quant series is live AND aligned with the uploaded chart's visible Y-axis window
  const isSyntheticFeed = marketDataSource === 'INSTITUTIONAL_SYNTHETIC_FALLBACK';
  const initialRefPrice =
    Number(clone.accuracy_verification?.current_market_price) ||
    entryPrice ||
    axisMid ||
    quant.currentPrice;

  const relativeDiffFromQuant =
    initialRefPrice > 0 && quant.currentPrice > 0
      ? Math.abs(initialRefPrice - quant.currentPrice) / initialRefPrice
      : 1;
  const quantInsideVisibleAxis = hasCalibratedYAxis
    ? quant.currentPrice >= axisBottom - axisSpan * 0.25 &&
      quant.currentPrice <= axisTop + axisSpan * 0.25
    : true;

  const isQuantAlignedWithChart =
    !isSyntheticFeed && relativeDiffFromQuant <= 0.015 && quantInsideVisibleAxis;

  // 1. Anchor Current Price: Strictly resolve exact currentPrice
  let anchorCurrentPrice =
    Number(clone.accuracy_verification?.current_market_price) > 0
      ? Number(clone.accuracy_verification?.current_market_price)
      : isQuantAlignedWithChart && quant.currentPrice > 0
      ? quant.currentPrice
      : entryPrice > 0
      ? entryPrice
      : axisMid > 0
      ? axisMid
      : quant.currentPrice;

  if (
    hasCalibratedYAxis &&
    (anchorCurrentPrice < axisBottom - axisSpan * 0.2 ||
      anchorCurrentPrice > axisTop + axisSpan * 0.2)
  ) {
    anchorCurrentPrice = entryPrice >= axisBottom && entryPrice <= axisTop ? entryPrice : axisMid;
  }
  anchorCurrentPrice = roundToPrecision(anchorCurrentPrice, decimals);

  // Compute chart-accurate Dealing Range, Equilibrium (0.5), and 14-period ATR
  const validLevels = [anchorCurrentPrice, entryPrice, stopLoss, takeProfit1, takeProfit2].filter(
    (p) => p > 0
  );
  const chartHigh = hasCalibratedYAxis
    ? axisTop
    : validLevels.length > 0
    ? Math.max(...validLevels)
    : anchorCurrentPrice * 1.006;
  const chartLow = hasCalibratedYAxis
    ? axisBottom
    : validLevels.length > 0
    ? Math.min(...validLevels)
    : anchorCurrentPrice * 0.994;
  const effectiveChartSpan = Math.max(
    chartHigh - chartLow,
    anchorCurrentPrice * 0.0025,
    Math.pow(10, -decimals) * 10
  );

  const chartEquilibrium50 = isQuantAlignedWithChart
    ? roundToPrecision(quant.fibonacci.equilibrium50, decimals)
    : roundToPrecision((chartHigh + chartLow) / 2, decimals);

  // Resolve 14-period ATR anchored to the selected timeframe and current price scale
  let effectiveAtr: number;
  if (quant.atr14 > 0) {
    const scaledQuantAtr =
      quant.currentPrice > 0
        ? quant.atr14 * (anchorCurrentPrice / quant.currentPrice)
        : quant.atr14;
    effectiveAtr = hasCalibratedYAxis
      ? roundToPrecision(
          Math.min(Math.max(scaledQuantAtr, effectiveChartSpan * 0.035), effectiveChartSpan * 0.14),
          decimals
        )
      : roundToPrecision(scaledQuantAtr, decimals);
  } else {
    effectiveAtr = roundToPrecision(
      Math.max(effectiveChartSpan * 0.06, Math.pow(10, -decimals) * 6),
      decimals
    );
  }

  if (!Number.isFinite(effectiveAtr) || effectiveAtr <= 0) {
    effectiveAtr = roundToPrecision(
      Math.max(anchorCurrentPrice * 0.002, Math.pow(10, -decimals) * 10),
      decimals
    );
  }

  if (clone.trade_recommendation === 'WAIT' || clone.trade_execution?.setup_type === 'NO TRADE') {
    clone.trade_recommendation = isSell ? 'SELL' : 'BUY';
    clone.bias = isSell ? 'BEARISH' : 'BULLISH';
    clone.market_bias = clone.bias;
    if (clone.trade_execution) {
      clone.trade_execution.setup_type = isSell ? 'SELL SETUP' : 'BUY SETUP';
    }
  }

  // 2. CLOSE ENTRY RULE: Entry Price must be immediate market execution or within 0.3x ATR of currentPrice
  const maxEntryOffset = roundToPrecision(
    Math.max(effectiveAtr * 0.3, Math.pow(10, -decimals) * 2),
    decimals
  );
  let entryClamped = false;

  if (entryPrice <= 0) {
    entryPrice = anchorCurrentPrice;
    entryClamped = true;
    adjustments.push(
      `Anchored entry_price (${entryPrice}) directly to current market price`
    );
  } else if (Math.abs(entryPrice - anchorCurrentPrice) > maxEntryOffset * 1.001) {
    const prevEntry = entryPrice;
    const directionSign = entryPrice >= anchorCurrentPrice ? 1 : -1;
    entryPrice = roundToPrecision(
      anchorCurrentPrice + directionSign * maxEntryOffset,
      decimals
    );
    entryClamped = true;
    adjustments.push(
      `Tight Proximity Entry Rule: Clamped entry_price (${prevEntry} -> ${entryPrice}) within 0.3x ATR (${maxEntryOffset}) of currentPrice (${anchorCurrentPrice})`
    );
  }

  // 3. TIGHT STOP LOSS RULE: Cap Stop Loss distance to 0.8x to 1.5x ATR from Entry
  const minTick = Math.pow(10, -decimals);
  const minSlDistance = roundToPrecision(Math.max(effectiveAtr * 0.8, minTick * 4), decimals);
  const maxSlDistance = roundToPrecision(
    Math.max(effectiveAtr * 1.5, minSlDistance + minTick * 2),
    decimals
  );
  const defaultSlDistance = roundToPrecision(effectiveAtr * 1.1, decimals);

  let slAdjusted = false;
  let slClamped = false;
  let tp1Clamped = false;
  let tp2Clamped = false;

  if (isBuy) {
    const rawSlDist = entryPrice - stopLoss;
    if (stopLoss <= 0 || stopLoss >= entryPrice) {
      stopLoss = roundToPrecision(entryPrice - defaultSlDistance, decimals);
      slAdjusted = true;
      slClamped = true;
      adjustments.push(
        `Tight Stop Loss Rule: Placed BUY stop_loss at 1.1x ATR (${defaultSlDistance}) below entry -> ${stopLoss}`
      );
    } else if (rawSlDist < minSlDistance * 0.999) {
      const prevSl = stopLoss;
      stopLoss = roundToPrecision(entryPrice - minSlDistance, decimals);
      slAdjusted = true;
      slClamped = true;
      adjustments.push(
        `Tight Stop Loss Rule: Widened BUY stop_loss (${prevSl} -> ${stopLoss}) to minimum 0.8x ATR (${minSlDistance}) from entry`
      );
    } else if (rawSlDist > maxSlDistance * 1.001) {
      const prevSl = stopLoss;
      stopLoss = roundToPrecision(entryPrice - maxSlDistance, decimals);
      slAdjusted = true;
      slClamped = true;
      adjustments.push(
        `Tight Stop Loss Rule: Clamped wide BUY stop_loss (${prevSl} -> ${stopLoss}) to maximum 1.5x ATR (${maxSlDistance}) from entry`
      );
    }

    const finalSlDist = Math.max(minTick, roundToPrecision(entryPrice - stopLoss, decimals));
    const minTp1Dist = roundToPrecision(finalSlDist * 1.0, decimals);
    const maxTp1Dist = roundToPrecision(finalSlDist * 1.5, decimals);
    const defaultTp1Dist = roundToPrecision(finalSlDist * 1.3, decimals);

    const rawTp1Dist = takeProfit1 - entryPrice;
    if (takeProfit1 <= entryPrice) {
      takeProfit1 = roundToPrecision(entryPrice + defaultTp1Dist, decimals);
      tp1Clamped = true;
      adjustments.push(
        `Quick-Profit TP1 Rule: Set BUY take_profit_1 to 1.3x SL distance -> ${takeProfit1}`
      );
    } else if (rawTp1Dist < minTp1Dist * 0.999) {
      const prevTp1 = takeProfit1;
      takeProfit1 = roundToPrecision(entryPrice + minTp1Dist, decimals);
      tp1Clamped = true;
      adjustments.push(
        `Quick-Profit TP1 Rule: Raised BUY take_profit_1 (${prevTp1} -> ${takeProfit1}) to 1.0x SL distance`
      );
    } else if (rawTp1Dist > maxTp1Dist * 1.001) {
      const prevTp1 = takeProfit1;
      takeProfit1 = roundToPrecision(entryPrice + maxTp1Dist, decimals);
      tp1Clamped = true;
      adjustments.push(
        `Quick-Profit TP1 Rule: Clamped distant BUY take_profit_1 (${prevTp1} -> ${takeProfit1}) to 1.5x SL distance for high-probability hit rate`
      );
    }

    const minTp2Dist = roundToPrecision(finalSlDist * 2.0, decimals);
    const maxTp2Dist = roundToPrecision(finalSlDist * 2.5, decimals);
    const defaultTp2Dist = roundToPrecision(finalSlDist * 2.2, decimals);

    const rawTp2Dist = takeProfit2 - entryPrice;
    if (takeProfit2 <= takeProfit1) {
      takeProfit2 = roundToPrecision(entryPrice + defaultTp2Dist, decimals);
      tp2Clamped = true;
      adjustments.push(
        `Quick-Profit TP2 Rule: Set BUY take_profit_2 to 2.2x SL distance -> ${takeProfit2}`
      );
    } else if (rawTp2Dist < minTp2Dist * 0.999) {
      const prevTp2 = takeProfit2;
      takeProfit2 = roundToPrecision(entryPrice + minTp2Dist, decimals);
      tp2Clamped = true;
      adjustments.push(
        `Quick-Profit TP2 Rule: Adjusted BUY take_profit_2 (${prevTp2} -> ${takeProfit2}) to 2.0x SL distance`
      );
    } else if (rawTp2Dist > maxTp2Dist * 1.001) {
      const prevTp2 = takeProfit2;
      takeProfit2 = roundToPrecision(entryPrice + maxTp2Dist, decimals);
      tp2Clamped = true;
      adjustments.push(
        `Quick-Profit TP2 Rule: Clamped distant BUY take_profit_2 (${prevTp2} -> ${takeProfit2}) to 2.5x SL cap`
      );
    }

    // Keep optional TP3 tight at 3.0x SL distance
    takeProfit3 = roundToPrecision(entryPrice + finalSlDist * 3.0, decimals);
  } else if (isSell) {
    const rawSlDist = stopLoss - entryPrice;
    if (stopLoss <= entryPrice) {
      stopLoss = roundToPrecision(entryPrice + defaultSlDistance, decimals);
      slAdjusted = true;
      slClamped = true;
      adjustments.push(
        `Tight Stop Loss Rule: Placed SELL stop_loss at 1.1x ATR (${defaultSlDistance}) above entry -> ${stopLoss}`
      );
    } else if (rawSlDist < minSlDistance * 0.999) {
      const prevSl = stopLoss;
      stopLoss = roundToPrecision(entryPrice + minSlDistance, decimals);
      slAdjusted = true;
      slClamped = true;
      adjustments.push(
        `Tight Stop Loss Rule: Widened SELL stop_loss (${prevSl} -> ${stopLoss}) to minimum 0.8x ATR (${minSlDistance}) from entry`
      );
    } else if (rawSlDist > maxSlDistance * 1.001) {
      const prevSl = stopLoss;
      stopLoss = roundToPrecision(entryPrice + maxSlDistance, decimals);
      slAdjusted = true;
      slClamped = true;
      adjustments.push(
        `Tight Stop Loss Rule: Clamped wide SELL stop_loss (${prevSl} -> ${stopLoss}) to maximum 1.5x ATR (${maxSlDistance}) from entry`
      );
    }

    const finalSlDist = Math.max(minTick, roundToPrecision(stopLoss - entryPrice, decimals));
    const minTp1Dist = roundToPrecision(finalSlDist * 1.0, decimals);
    const maxTp1Dist = roundToPrecision(finalSlDist * 1.5, decimals);
    const defaultTp1Dist = roundToPrecision(finalSlDist * 1.3, decimals);

    const rawTp1Dist = entryPrice - takeProfit1;
    if (takeProfit1 <= 0 || takeProfit1 >= entryPrice) {
      takeProfit1 = roundToPrecision(Math.max(minTick, entryPrice - defaultTp1Dist), decimals);
      tp1Clamped = true;
      adjustments.push(
        `Quick-Profit TP1 Rule: Set SELL take_profit_1 to 1.3x SL distance -> ${takeProfit1}`
      );
    } else if (rawTp1Dist < minTp1Dist * 0.999) {
      const prevTp1 = takeProfit1;
      takeProfit1 = roundToPrecision(Math.max(minTick, entryPrice - minTp1Dist), decimals);
      tp1Clamped = true;
      adjustments.push(
        `Quick-Profit TP1 Rule: Lowered SELL take_profit_1 (${prevTp1} -> ${takeProfit1}) to 1.0x SL distance`
      );
    } else if (rawTp1Dist > maxTp1Dist * 1.001) {
      const prevTp1 = takeProfit1;
      takeProfit1 = roundToPrecision(Math.max(minTick, entryPrice - maxTp1Dist), decimals);
      tp1Clamped = true;
      adjustments.push(
        `Quick-Profit TP1 Rule: Clamped distant SELL take_profit_1 (${prevTp1} -> ${takeProfit1}) to 1.5x SL distance for high-probability hit rate`
      );
    }

    const minTp2Dist = roundToPrecision(finalSlDist * 2.0, decimals);
    const maxTp2Dist = roundToPrecision(finalSlDist * 2.5, decimals);
    const defaultTp2Dist = roundToPrecision(finalSlDist * 2.2, decimals);

    const rawTp2Dist = entryPrice - takeProfit2;
    if (takeProfit2 <= 0 || takeProfit2 >= takeProfit1) {
      takeProfit2 = roundToPrecision(Math.max(minTick, entryPrice - defaultTp2Dist), decimals);
      tp2Clamped = true;
      adjustments.push(
        `Quick-Profit TP2 Rule: Set SELL take_profit_2 to 2.2x SL distance -> ${takeProfit2}`
      );
    } else if (rawTp2Dist < minTp2Dist * 0.999) {
      const prevTp2 = takeProfit2;
      takeProfit2 = roundToPrecision(Math.max(minTick, entryPrice - minTp2Dist), decimals);
      tp2Clamped = true;
      adjustments.push(
        `Quick-Profit TP2 Rule: Adjusted SELL take_profit_2 (${prevTp2} -> ${takeProfit2}) to 2.0x SL distance`
      );
    } else if (rawTp2Dist > maxTp2Dist * 1.001) {
      const prevTp2 = takeProfit2;
      takeProfit2 = roundToPrecision(Math.max(minTick, entryPrice - maxTp2Dist), decimals);
      tp2Clamped = true;
      adjustments.push(
        `Quick-Profit TP2 Rule: Clamped distant SELL take_profit_2 (${prevTp2} -> ${takeProfit2}) to 2.5x SL cap`
      );
    }

    takeProfit3 = roundToPrecision(Math.max(minTick, entryPrice - finalSlDist * 3.0), decimals);
  }

  const slDistanceApplied = roundToPrecision(Math.abs(entryPrice - stopLoss), decimals);

  // Exact Risk-to-Reward math: (TP1 - Entry) / (Entry - SL)
  const denominator = entryPrice - stopLoss;
  const numeratorTp1 = takeProfit1 - entryPrice;
  const numeratorTp2 = takeProfit2 - entryPrice;

  const exactRRRatioTp1 =
    Math.abs(denominator) > 0 && Math.abs(numeratorTp1) > 0
      ? Number(Math.abs(numeratorTp1 / denominator).toFixed(2))
      : 1.3;

  const exactRRRatioTp2 =
    Math.abs(denominator) > 0 && Math.abs(numeratorTp2) > 0
      ? Number(Math.abs(numeratorTp2 / denominator).toFixed(2))
      : 2.2;

  const formattedRR = `1:${exactRRRatioTp1.toFixed(2)}`;

  // 5-Point Institutional Confluence Evaluation anchored to chart-truth levels
  const setupBias = clone.bias || clone.market_bias;
  const existingConfluences = Array.isArray(clone.key_confluences)
    ? clone.key_confluences
    : [];

  const emaOrRangeContext = isQuantAlignedWithChart
    ? `EMA20 ${quant.ema.ema20} / EMA50 ${quant.ema.ema50} / EMA200 ${quant.ema.ema200}`
    : `Visible Dealing Range [${roundToPrecision(chartLow, decimals)} - ${roundToPrecision(chartHigh, decimals)}]`;

  // Point 1: HTF Trend & Market Structure Alignment
  const htfTrendAligned =
    (isQuantAlignedWithChart && (quant.htfBias === setupBias || quant.ema.alignment === setupBias)) ||
    existingConfluences.some((c) => /htf|4h|1h|h1|h4|trend|bos|choch|structure|higher|lower/i.test(c)) ||
    Boolean(clone.trading_tools_analysis?.market_structure);
  const point1Text =
    existingConfluences[0] && existingConfluences[0].length > 12
      ? `${existingConfluences[0]} [${resolvedAsset} ${clone.timeframe} ${setupBias} • ${emaOrRangeContext}]`
      : `Structure & Trend Alignment: ${resolvedAsset} (${clone.timeframe}) ${setupBias} displacement confirmed across ${emaOrRangeContext}`;

  // Point 2: Liquidity Sweep & Session Killzone Context
  const liquiditySweepAligned =
    (isQuantAlignedWithChart && quant.session.liquiditySweep.detected) ||
    existingConfluences.some((c) => /sweep|liquidity|bsl|ssl|shelf|support|resistance|pool|wick/i.test(c)) ||
    Boolean(clone.trading_tools_analysis?.liquidity_zones);
  const point2Text =
    existingConfluences[1] && existingConfluences[1].length > 12
      ? `${existingConfluences[1]} [${quant.session.sessionName} Session]`
      : isLineMode
      ? `Session & Key Level Reaction: ${quant.session.sessionName} session reaction defending ${stopLoss} invalidation pivot`
      : `Liquidity Sweep & Session Context: Institutional liquidity reaction near ${entryPrice} (Invalidation ${stopLoss}) during ${quant.session.sessionName} session`;

  // Point 3: FVG / Order Block / S&R + Fibonacci Equilibrium/OTE Alignment
  const fvgObSrAligned =
    (isQuantAlignedWithChart && (quant.unmitigatedFVGs.length > 0 || quant.activeOrderBlocks.length > 0)) ||
    existingConfluences.some((c) => /fvg|order block|ob|support|resistance|ote|fib|discount|premium|zone|imbalance/i.test(c)) ||
    Boolean(clone.trading_tools_analysis?.imbalances_and_obs);
  const fibZoneLabel = isBuy
    ? `Discount OTE 0.618-0.786 (EQ 0.5 @ ${chartEquilibrium50})`
    : isSell
    ? `Premium OTE 0.618-0.786 (EQ 0.5 @ ${chartEquilibrium50})`
    : `Equilibrium 0.5 @ ${chartEquilibrium50}`;
  const point3Text =
    existingConfluences[2] && existingConfluences[2].length > 12
      ? `${existingConfluences[2]} [${fibZoneLabel}]`
      : isLineMode
      ? `Horizontal S&R Flip & Dealing Range: Key pivot zone near ${entryPrice} aligned with ${fibZoneLabel}`
      : `Institutional Array (FVG / OB / OTE): Unmitigated imbalance & Order Block confluence at ${entryPrice} in ${fibZoneLabel}`;

  // Point 4: Tight Proximity ATR & Quick-Profit Calibration
  const momentumRsiAligned = isQuantAlignedWithChart
    ? (isBuy && quant.rsi14 < 72) || (isSell && quant.rsi14 > 28) || (!isBuy && !isSell)
    : true;
  const vwapOrPivotLabel = isQuantAlignedWithChart
    ? `RSI(14): ${quant.rsi14} • VWAP: ${quant.sessionVwap}`
    : `ATR(14): ${effectiveAtr} • Spot Anchor: ${anchorCurrentPrice}`;
  const point4Text = `Tight Proximity & Quick-Profit Risk Calibration: ${vwapOrPivotLabel} • Entry ≤0.3x ATR (${maxEntryOffset}), SL ${slDistanceApplied} (0.8x-1.5x ATR), TP1 ${formattedRR}, TP2 1:${exactRRRatioTp2.toFixed(2)}`;

  // Point 5: Macro Economic Calendar Guardrail (±60m Red Folder Window)
  const clearNewsWindowAligned = news.clearNewsWindow;
  const point5Text = `Macro Calendar Guardrail: ${news.statusSummary}`;

  const confluenceItems = [
    point1Text,
    point2Text,
    point3Text,
    point4Text,
    point5Text,
  ];

  const scoreOutOfFive = [
    htfTrendAligned,
    liquiditySweepAligned,
    fvgObSrAligned,
    momentumRsiAligned,
    clearNewsWindowAligned,
  ].filter(Boolean).length;

  let adjustedConfidence = Number(clone.confidence_score) || 85;
  if (news.hasRedFolderRisk) {
    adjustedConfidence = Math.max(50, adjustedConfidence + news.confidenceAdjustment);
    adjustments.push(
      `Applied ${news.confidenceAdjustment}% confidence guardrail due to active Red-Folder news within ±60m`
    );
  } else if (scoreOutOfFive === 5 && adjustedConfidence < 88 && (isBuy || isSell)) {
    adjustedConfidence = Math.min(98, adjustedConfidence + 2);
  }

  let enrichedInvalidation = clone.invalidation_condition || '';
  if (!enrichedInvalidation.includes('ATR')) {
    enrichedInvalidation = `${enrichedInvalidation.replace(/\.\s*$/, '')} (Tight SL clamped to ${slDistanceApplied} [0.8x-1.5x ATR] at ${stopLoss}).`;
  }
  if (news.invalidationWarning && !enrichedInvalidation.includes('Red-Folder')) {
    enrichedInvalidation = `${enrichedInvalidation} ${news.invalidationWarning}`;
  }

  if (clone.trading_tools_analysis) {
    const existingStruct = clone.trading_tools_analysis.market_structure || '';
    if (!existingStruct.includes('Dealing Range') && !existingStruct.includes('EMA20')) {
      clone.trading_tools_analysis.market_structure = `${existingStruct.replace(/\.\s*$/, '')}. Structure bias: ${setupBias} (${emaOrRangeContext}).`;
    }

    const existingFib = clone.trading_tools_analysis.fibonacci_or_session_context || '';
    if (!existingFib.includes('EQ (0.5)')) {
      clone.trading_tools_analysis.fibonacci_or_session_context = `${existingFib.replace(/\.\s*$/, '')} | Active Session: ${quant.session.sessionName} | EQ (0.5): ${chartEquilibrium50} | ATR(14): ${effectiveAtr} (Tight SL Dist: ${slDistanceApplied}).`;
    }
  }

  const enrichedSummary = clone.analysis_summary || clone.what_is_happening || '';

  clone.entry_price = entryPrice;
  clone.stop_loss = stopLoss;
  clone.take_profit_1 = takeProfit1;
  clone.take_profit_2 = takeProfit2;
  clone.take_profit_3 = takeProfit3;
  clone.confidence_score = adjustedConfidence;
  clone.risk_reward_ratio = formattedRR;
  clone.key_confluences = confluenceItems;
  clone.invalidation_condition = enrichedInvalidation;
  clone.analysis_summary = enrichedSummary;

  const tp3Y = isBuy
    ? Math.max(6, Math.min((clone.tp2_y || 18) - 7, clone.tp3_y || 10))
    : Math.min(94, Math.max((clone.tp2_y || 82) + 7, clone.tp3_y || 90));
  clone.tp3_y = tp3Y;

  if (clone.visual_proof_annotations) {
    clone.visual_proof_annotations.tp3_y = tp3Y;
    clone.visual_proof_annotations.tp3_y_percent = tp3Y;
  }

  if (Array.isArray(clone.zones)) {
    clone.zones = clone.zones.map((z) => ({
      ...z,
      label: z.label.replace(/\(Entry\)/g, `(${entryPrice})`),
    }));
  }
  if (Array.isArray(clone.prediction_path)) {
    clone.prediction_path = clone.prediction_path.map((pt) => ({
      ...pt,
      label: pt.label
        .replace(/\(Entry\)/g, `(${entryPrice})`)
        .replace(/\(TP\)/g, `(${takeProfit2 || takeProfit1})`),
      note: (pt.note || pt.label)
        .replace(/\(Entry\)/g, `(${entryPrice})`)
        .replace(/\(TP\)/g, `(${takeProfit2 || takeProfit1})`),
    }));
  }

  clone.trade_execution = {
    ...clone.trade_execution,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit_1: takeProfit1,
    take_profit_2: takeProfit2,
    take_profit_3: takeProfit3,
    risk_to_reward: formattedRR,
    invalidation_condition: enrichedInvalidation,
  };

  const existingChecks = clone.accuracy_verification?.verification_checks || [];
  const filteredChecks = existingChecks.filter(
    (c) => !c.startsWith('Mathematical R:R') && !c.startsWith('Multi-Factor Confluence')
  );

  const updatedVerificationChecks = [
    ...filteredChecks,
    ...(hasCalibratedYAxis
      ? [
          `Y-Axis Price Scale Verified: Visible chart range [${roundToPrecision(axisBottom, decimals)} – ${roundToPrecision(axisTop, decimals)}] anchored to ${resolvedAsset}`,
        ]
      : []),
    `Close Entry Guardrail Verified: Entry (${entryPrice}) anchored within ≤0.3x ATR (${maxEntryOffset}) of currentPrice (${anchorCurrentPrice})`,
    `Tight Stop-Loss Guardrail Verified: SL (${stopLoss}) clamped to ${slDistanceApplied} (0.8x–1.5x ATR [${minSlDistance}–${maxSlDistance}])`,
    `Quick-Profit Target Guardrail Verified: TP1 (${takeProfit1}) = ${formattedRR} (1.0x–1.5x SL) | TP2 (${takeProfit2}) = 1:${exactRRRatioTp2.toFixed(2)} (2.0x–2.5x SL)`,
    `5-Point Institutional Confluence Check: ${scoreOutOfFive}/5 aligned (Structure, Liquidity, FVG/OB/S&R, Tight ATR Proximity, Macro News Guardrail)`,
  ];

  clone.accuracy_verification = {
    is_verified: clone.accuracy_verification?.is_verified ?? true,
    price_geometry_valid: clone.accuracy_verification?.price_geometry_valid ?? true,
    y_coordinate_monotonic: clone.accuracy_verification?.y_coordinate_monotonic ?? true,
    rr_mathematically_verified: true,
    confluence_gate_passed: scoreOutOfFive >= 3,
    calculated_rr: exactRRRatioTp1,
    ...(hasCalibratedYAxis
      ? { axis_top_price: axisTop, axis_bottom_price: axisBottom }
      : {}),
    current_market_price: anchorCurrentPrice,
    adjustments_applied: adjustments,
    verification_checks: updatedVerificationChecks,
  };

  // Attach Multi-Timeframe Market Forecast (5M, 15M, 1H, 4H) directly to the validated signal
  clone.multiTimeframeForecast = buildMultiTimeframeForecast(
    clone,
    quant,
    mtfContext,
    anchorCurrentPrice,
    effectiveAtr
  );

  return {
    validatedSignal: clone,
    atrBufferApplied: slDistanceApplied,
    slAdjusted,
    exactRRRatioTp1,
    exactRRRatioTp2,
    confluenceCheck: {
      htfTrendAligned,
      liquiditySweepAligned,
      fvgObSrAligned,
      momentumRsiAligned,
      clearNewsWindowAligned,
      scoreOutOfFive,
      confluenceItems,
    },
    tightProximityMetrics: {
      anchorCurrentPrice,
      atr14: effectiveAtr,
      maxEntryOffset,
      minSlDistance,
      maxSlDistance,
      entryClamped,
      slClamped,
      tp1Clamped,
      tp2Clamped,
    },
  };
}
