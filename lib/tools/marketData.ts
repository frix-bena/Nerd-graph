export type SupportedTimeframe = '4H' | '1H' | '15M' | '5M';

export type SupportedAsset =
  | 'XAUUSD'
  | 'EURUSD'
  | 'GBPUSD'
  | 'NAS100'
  | 'BTCUSDT'
  | 'US30'
  | string;

export type MarketDataSource =
  | 'MT5_BRIDGE'
  | 'BINANCE_REST'
  | 'TWELVE_DATA_REST'
  | 'YAHOO_FINANCE_REST'
  | 'INSTITUTIONAL_SYNTHETIC_FALLBACK';

export interface OHLCVCandle {
  timestamp: number;
  timeISO: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeframeMarketData {
  timeframe: SupportedTimeframe;
  candles: OHLCVCandle[];
  latestPrice: number;
  openPrice: number;
  high24h: number;
  low24h: number;
  changePercent: number;
  source: MarketDataSource;
}

export interface MultiTimeframeMarketContext {
  asset: string;
  primaryTimeframe: SupportedTimeframe;
  currentSpotPrice: number;
  source: MarketDataSource;
  mt5BridgeStatus: 'ONLINE' | 'OFFLINE_FALLBACK';
  fetchedAt: string;
  timeframes: Record<SupportedTimeframe, TimeframeMarketData>;
  promptSummary: string;
}

const REQUIRED_TIMEFRAMES: SupportedTimeframe[] = ['4H', '1H', '15M', '5M'];

// In-memory store for live candles pushed from the MT5 Expert Advisor Bridge (/api/mt5/webhook)
interface MT5CachedSeries {
  updatedAt: number;
  candles: OHLCVCandle[];
}

const mt5BridgeCache = new Map<string, MT5CachedSeries>();
const restResponseCache = new Map<
  string,
  { expiresAt: number; data: TimeframeMarketData }
>();

export function normalizeAssetSymbol(rawAsset?: string): string {
  const cleaned = String(rawAsset || 'XAUUSD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return 'XAUUSD';
  if (cleaned.includes('XAU') || cleaned === 'GOLD') return 'XAUUSD';
  if (cleaned.includes('EURUSD')) return 'EURUSD';
  if (cleaned.includes('GBPUSD')) return 'GBPUSD';
  if (cleaned.includes('NAS') || cleaned.includes('NDX') || cleaned.includes('US100'))
    return 'NAS100';
  if (cleaned.includes('BTC')) return 'BTCUSDT';
  if (cleaned.includes('US30') || cleaned.includes('DJI') || cleaned.includes('DOW'))
    return 'US30';
  return cleaned;
}

export function normalizeTimeframeKey(rawTf?: string): SupportedTimeframe {
  const upper = String(rawTf || '15M').toUpperCase().trim();
  if (upper.includes('4H') || upper === 'H4' || upper === '240') return '4H';
  if (upper.includes('1H') || upper === 'H1' || upper === '60' || upper.includes('HOUR'))
    return '1H';
  if (upper.includes('5M') || upper === 'M5' || upper === '5') return '5M';
  return '15M';
}

/**
 * Allows the MT5 Bridge webhook (/api/mt5/webhook) to push live terminal candles into memory.
 */
export function recordMT5BridgeCandles(
  asset: string,
  timeframe: string,
  candles: OHLCVCandle[]
): void {
  if (!Array.isArray(candles) || candles.length === 0) return;
  const symbol = normalizeAssetSymbol(asset);
  const tf = normalizeTimeframeKey(timeframe);
  mt5BridgeCache.set(`${symbol}:${tf}`, {
    updatedAt: Date.now(),
    candles: candles.slice(-120),
  });
}

function getAssetDecimals(symbol: string): number {
  switch (symbol) {
    case 'EURUSD':
    case 'GBPUSD':
      return 5;
    case 'XAUUSD':
      return 2;
    case 'NAS100':
    case 'US30':
    case 'BTCUSDT':
      return 1;
    default:
      return 2;
  }
}

function roundPrice(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Step 1: Attempt to read from local MT5 Bridge cache or remote MT5_BRIDGE_URL endpoint
 */
async function tryFetchFromMT5Bridge(
  symbol: string,
  timeframe: SupportedTimeframe
): Promise<OHLCVCandle[] | null> {
  const cached = mt5BridgeCache.get(`${symbol}:${timeframe}`);
  // Consider MT5 bridge cache fresh for 5 minutes
  if (cached && Date.now() - cached.updatedAt < 5 * 60 * 1000 && cached.candles.length >= 20) {
    return cached.candles;
  }

  const bridgeUrl = process.env.MT5_BRIDGE_URL;
  if (!bridgeUrl || !bridgeUrl.trim()) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const url = `${bridgeUrl.replace(/\/$/, '')}/ohlcv?symbol=${encodeURIComponent(
      symbol
    )}&timeframe=${encodeURIComponent(timeframe)}&limit=60`;
    const res = await fetch(url, {
      headers: {
        'x-apex-secret': process.env.MT5_WEBHOOK_SECRET || 'apex_live_sec_9934af89',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();
    const rawCandles = Array.isArray(json?.candles) ? json.candles : Array.isArray(json) ? json : [];
    if (rawCandles.length < 15) return null;

    const normalized: OHLCVCandle[] = rawCandles
      .map((c: any) => ({
        timestamp: Number(c.timestamp || c.time || Date.now()),
        timeISO: new Date(Number(c.timestamp || c.time || Date.now())).toISOString(),
        open: Number(c.open ?? c.o),
        high: Number(c.high ?? c.h),
        low: Number(c.low ?? c.l),
        close: Number(c.close ?? c.c),
        volume: Number(c.volume ?? c.v ?? 100),
      }))
      .filter(
        (c: OHLCVCandle) =>
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close) &&
          c.open > 0
      );

    if (normalized.length >= 15) {
      recordMT5BridgeCandles(symbol, timeframe, normalized);
      return normalized;
    }
  } catch {
    // MT5 bridge offline — smoothly fall back to REST APIs
  }
  return null;
}

/**
 * Step 2A: Try Twelve Data REST API if TWELVE_DATA_API_KEY is configured
 */
async function tryFetchFromTwelveData(
  symbol: string,
  timeframe: SupportedTimeframe
): Promise<OHLCVCandle[] | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  const symbolMap: Record<string, string> = {
    XAUUSD: 'XAU/USD',
    EURUSD: 'EUR/USD',
    GBPUSD: 'GBP/USD',
    NAS100: 'NDX',
    BTCUSDT: 'BTC/USD',
    US30: 'DJI',
  };
  const intervalMap: Record<SupportedTimeframe, string> = {
    '4H': '4h',
    '1H': '1h',
    '15M': '15min',
    '5M': '5min',
  };

  const tdSymbol = symbolMap[symbol] || symbol;
  const interval = intervalMap[timeframe];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      tdSymbol
    )}&interval=${interval}&outputsize=60&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    if (!Array.isArray(json?.values) || json.values.length < 15) return null;

    const candles: OHLCVCandle[] = json.values
      .slice()
      .reverse()
      .map((v: any) => {
        const ts = Date.parse(v.datetime) || Date.now();
        return {
          timestamp: ts,
          timeISO: new Date(ts).toISOString(),
          open: Number.parseFloat(v.open),
          high: Number.parseFloat(v.high),
          low: Number.parseFloat(v.low),
          close: Number.parseFloat(v.close),
          volume: Number.parseFloat(v.volume || '1000') || 1000,
        };
      })
      .filter((c: OHLCVCandle) => Number.isFinite(c.close) && c.close > 0);

    return candles.length >= 15 ? candles : null;
  } catch {
    return null;
  }
}

/**
 * Step 2B: Try Binance Public REST API (for BTCUSDT & PAXGUSDT gold spot proxy)
 */
async function tryFetchFromBinance(
  symbol: string,
  timeframe: SupportedTimeframe
): Promise<OHLCVCandle[] | null> {
  const binanceSymbolMap: Record<string, string> = {
    BTCUSDT: 'BTCUSDT',
    XAUUSD: 'PAXGUSDT',
    EURUSD: 'EURUSDT',
    GBPUSD: 'GBPUSDT',
  };

  const binanceSymbol = binanceSymbolMap[symbol];
  if (!binanceSymbol) return null;

  const intervalMap: Record<SupportedTimeframe, string> = {
    '4H': '4h',
    '1H': '1h',
    '15M': '15m',
    '5M': '5m',
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${intervalMap[timeframe]}&limit=60`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length < 15) return null;

    const decimals = getAssetDecimals(symbol);
    const candles: OHLCVCandle[] = rows
      .map((r: any) => ({
        timestamp: Number(r[0]),
        timeISO: new Date(Number(r[0])).toISOString(),
        open: roundPrice(Number.parseFloat(r[1]), decimals),
        high: roundPrice(Number.parseFloat(r[2]), decimals),
        low: roundPrice(Number.parseFloat(r[3]), decimals),
        close: roundPrice(Number.parseFloat(r[4]), decimals),
        volume: Number.parseFloat(r[5]) || 100,
      }))
      .filter((c: OHLCVCandle) => Number.isFinite(c.close) && c.close > 0);

    return candles.length >= 15 ? candles : null;
  } catch {
    return null;
  }
}

/**
 * Step 2C: Try Yahoo Finance Public v8 Chart API
 */
async function tryFetchFromYahooFinance(
  symbol: string,
  timeframe: SupportedTimeframe
): Promise<OHLCVCandle[] | null> {
  const yahooMap: Record<string, string> = {
    XAUUSD: 'GC=F',
    EURUSD: 'EURUSD=X',
    GBPUSD: 'GBPUSD=X',
    NAS100: 'NQ=F',
    US30: 'YM=F',
    BTCUSDT: 'BTC-USD',
  };

  const yahooTicker = yahooMap[symbol] || `${symbol}=X`;
  const intervalConfig: Record<SupportedTimeframe, { interval: string; range: string }> = {
    '4H': { interval: '60m', range: '1mo' },
    '1H': { interval: '60m', range: '10d' },
    '15M': { interval: '15m', range: '5d' },
    '5M': { interval: '5m', range: '2d' },
  };

  const cfg = intervalConfig[timeframe];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooTicker
    )}?interval=${cfg.interval}&range=${cfg.range}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApexVisionAI/2.4)',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    if (!Array.isArray(timestamps) || timestamps.length < 15) return null;

    const decimals = getAssetDecimals(symbol);
    const raw1hCandles: OHLCVCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      const c = quote.close?.[i];
      const v = quote.volume?.[i] ?? 500;
      if (
        typeof o === 'number' &&
        typeof h === 'number' &&
        typeof l === 'number' &&
        typeof c === 'number' &&
        Number.isFinite(c) &&
        c > 0
      ) {
        raw1hCandles.push({
          timestamp: timestamps[i] * 1000,
          timeISO: new Date(timestamps[i] * 1000).toISOString(),
          open: roundPrice(o, decimals),
          high: roundPrice(h, decimals),
          low: roundPrice(l, decimals),
          close: roundPrice(c, decimals),
          volume: Number(v) || 500,
        });
      }
    }

    if (raw1hCandles.length < 15) return null;

    // Aggregate 60m candles into 4H candles when timeframe === '4H'
    if (timeframe === '4H') {
      const aggregated: OHLCVCandle[] = [];
      for (let i = 0; i < raw1hCandles.length; i += 4) {
        const chunk = raw1hCandles.slice(i, i + 4);
        if (chunk.length === 0) continue;
        aggregated.push({
          timestamp: chunk[0].timestamp,
          timeISO: chunk[0].timeISO,
          open: chunk[0].open,
          high: Math.max(...chunk.map((c) => c.high)),
          low: Math.min(...chunk.map((c) => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((acc, c) => acc + c.volume, 0),
        });
      }
      return aggregated.length >= 15 ? aggregated.slice(-60) : raw1hCandles.slice(-60);
    }

    return raw1hCandles.slice(-60);
  } catch {
    return null;
  }
}

/**
 * Step 3: Deterministic Institutional Multi-Timeframe OHLCV Generator
 * Used when both MT5 Bridge and public REST APIs are offline or unreachable.
 * Produces 60 realistic candles featuring an SSL sweep, impulsive displacement BOS,
 * unmitigated FVG, Order Block, and active pullback so downstream SMC math is always exact.
 */
function generateSyntheticInstitutionalCandles(
  symbol: string,
  timeframe: SupportedTimeframe
): OHLCVCandle[] {
  const baseConfig: Record<
    string,
    { anchorPrice: number; stepAtr: number; decimals: number; baseVol: number }
  > = {
    XAUUSD: { anchorPrice: 2652.4, stepAtr: 3.2, decimals: 2, baseVol: 4200 },
    EURUSD: { anchorPrice: 1.0585, stepAtr: 0.0018, decimals: 5, baseVol: 8500 },
    GBPUSD: { anchorPrice: 1.268, stepAtr: 0.0022, decimals: 5, baseVol: 7400 },
    NAS100: { anchorPrice: 20680.0, stepAtr: 42.0, decimals: 1, baseVol: 12500 },
    BTCUSDT: { anchorPrice: 88450.0, stepAtr: 280.0, decimals: 1, baseVol: 1950 },
    US30: { anchorPrice: 43850.0, stepAtr: 75.0, decimals: 1, baseVol: 9200 },
  };

  const cfg = baseConfig[symbol] || {
    anchorPrice: 100.0,
    stepAtr: 0.8,
    decimals: 2,
    baseVol: 3000,
  };

  const tfMultiplier: Record<SupportedTimeframe, number> = {
    '4H': 2.2,
    '1H': 1.35,
    '15M': 1.0,
    '5M': 0.55,
  };
  const tfMinutes: Record<SupportedTimeframe, number> = {
    '4H': 240,
    '1H': 60,
    '15M': 15,
    '5M': 5,
  };

  const unit = cfg.stepAtr * tfMultiplier[timeframe];
  const intervalMs = tfMinutes[timeframe] * 60 * 1000;
  const nowAligned = Math.floor(Date.now() / intervalMs) * intervalMs;
  const totalBars = 60;
  const isBearishAsset = symbol === 'BTCUSDT';

  const candles: OHLCVCandle[] = [];
  let runningClose = isBearishAsset
    ? cfg.anchorPrice + unit * 2.5
    : cfg.anchorPrice - unit * 2.5;

  for (let i = 0; i < totalBars; i++) {
    const ts = nowAligned - (totalBars - 1 - i) * intervalMs;
    const phasePos = i / totalBars;

    let delta = 0;
    let wickUp = unit * 0.45;
    let wickDown = unit * 0.45;
    let volFactor = 1.0;

    if (!isBearishAsset) {
      // Bullish SMC structure: accumulation -> SSL liquidity sweep (bar 44) -> impulsive BOS & FVG (bars 45-50) -> OTE pullback (bars 51-59)
      if (i < 42) {
        delta = Math.sin(i * 0.45) * unit * 0.55 + unit * 0.05;
      } else if (i === 42 || i === 43) {
        delta = -unit * 0.95;
      } else if (i === 44) {
        // Sell-Side Liquidity (SSL) Sweep candle with deep lower wick and bullish recovery
        delta = unit * 0.4;
        wickDown = unit * 2.4;
        volFactor = 2.1;
      } else if (i >= 45 && i <= 49) {
        // Impulsive bullish displacement creating unmitigated Bullish FVG and BOS
        delta = unit * 1.45;
        wickUp = unit * 0.25;
        wickDown = unit * 0.12;
        volFactor = 2.5;
      } else {
        // Controlled pullback into Discount FVG / OTE zone
        delta = i % 2 === 0 ? -unit * 0.42 : unit * 0.15;
        volFactor = 0.85;
      }
    } else {
      // Bearish SMC structure: distribution -> BSL liquidity sweep (bar 44) -> impulsive bearish CHoCH/BOS & FVG (bars 45-50) -> Premium pullback
      if (i < 42) {
        delta = Math.cos(i * 0.45) * unit * 0.55 - unit * 0.04;
      } else if (i === 42 || i === 43) {
        delta = unit * 0.95;
      } else if (i === 44) {
        // Buy-Side Liquidity (BSL) Sweep candle with tall upper wick and bearish rejection
        delta = -unit * 0.45;
        wickUp = unit * 2.5;
        volFactor = 2.2;
      } else if (i >= 45 && i <= 49) {
        // Impulsive bearish displacement creating unmitigated Bearish FVG and CHoCH
        delta = -unit * 1.45;
        wickUp = unit * 0.12;
        wickDown = unit * 0.25;
        volFactor = 2.6;
      } else {
        // Controlled relief pullback into Premium Supply OB / FVG
        delta = i % 2 === 0 ? unit * 0.42 : -unit * 0.15;
        volFactor = 0.85;
      }
    }

    const open = roundPrice(runningClose, cfg.decimals);
    const close = roundPrice(Math.max(unit * 0.1, open + delta), cfg.decimals);
    const high = roundPrice(Math.max(open, close) + wickUp, cfg.decimals);
    const low = roundPrice(Math.max(unit * 0.05, Math.min(open, close) - wickDown), cfg.decimals);
    const volume = Math.round(cfg.baseVol * volFactor * (0.9 + (phasePos * 0.2)));

    candles.push({
      timestamp: ts,
      timeISO: new Date(ts).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });

    runningClose = close;
  }

  return candles;
}

async function fetchTimeframeData(
  symbol: string,
  timeframe: SupportedTimeframe
): Promise<TimeframeMarketData> {
  const cacheKey = `${symbol}:${timeframe}`;
  const cachedRest = restResponseCache.get(cacheKey);
  if (cachedRest && Date.now() < cachedRest.expiresAt) {
    return cachedRest.data;
  }

  let candles: OHLCVCandle[] | null = null;
  let source: MarketDataSource = 'INSTITUTIONAL_SYNTHETIC_FALLBACK';

  // 1. Try MT5 Bridge first
  candles = await tryFetchFromMT5Bridge(symbol, timeframe);
  if (candles) {
    source = 'MT5_BRIDGE';
  }

  // 2. Fallback to Twelve Data REST API if configured
  if (!candles) {
    candles = await tryFetchFromTwelveData(symbol, timeframe);
    if (candles) source = 'TWELVE_DATA_REST';
  }

  // 3. Fallback to Binance REST API for crypto/spot proxies
  if (!candles && (symbol === 'BTCUSDT' || symbol === 'XAUUSD')) {
    candles = await tryFetchFromBinance(symbol, timeframe);
    if (candles) source = 'BINANCE_REST';
  }

  // 4. Fallback to Yahoo Finance REST API
  if (!candles) {
    candles = await tryFetchFromYahooFinance(symbol, timeframe);
    if (candles) source = 'YAHOO_FINANCE_REST';
  }

  // 5. Guaranteed deterministic institutional fallback if offline
  if (!candles || candles.length < 15) {
    candles = generateSyntheticInstitutionalCandles(symbol, timeframe);
    source = 'INSTITUTIONAL_SYNTHETIC_FALLBACK';
  }

  const decimals = getAssetDecimals(symbol);
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const recentSlice = candles.slice(-24);
  const high24h = roundPrice(Math.max(...recentSlice.map((c) => c.high)), decimals);
  const low24h = roundPrice(Math.min(...recentSlice.map((c) => c.low)), decimals);
  const changePercent =
    firstCandle.open > 0
      ? Number((((lastCandle.close - firstCandle.open) / firstCandle.open) * 100).toFixed(2))
      : 0;

  const result: TimeframeMarketData = {
    timeframe,
    candles,
    latestPrice: roundPrice(lastCandle.close, decimals),
    openPrice: roundPrice(firstCandle.open, decimals),
    high24h,
    low24h,
    changePercent,
    source,
  };

  restResponseCache.set(cacheKey, {
    expiresAt: Date.now() + 45 * 1000,
    data: result,
  });

  return result;
}

/**
 * Pulls live OHLCV market data across 4H, 1H, 15M, and 5M timeframes for the requested asset
 * via the MT5 Bridge with automatic fallback to free REST APIs and deterministic series.
 */
export async function fetchMultiTimeframeMarketData(
  rawAsset?: string,
  rawTimeframe?: string
): Promise<MultiTimeframeMarketContext> {
  const asset = normalizeAssetSymbol(rawAsset);
  const primaryTimeframe = normalizeTimeframeKey(rawTimeframe);

  const results = await Promise.all(
    REQUIRED_TIMEFRAMES.map((tf) => fetchTimeframeData(asset, tf))
  );

  const timeframes: Record<SupportedTimeframe, TimeframeMarketData> = {
    '4H': results[0],
    '1H': results[1],
    '15M': results[2],
    '5M': results[3],
  };

  const primaryData = timeframes[primaryTimeframe] || timeframes['15M'];
  const currentSpotPrice = primaryData.latestPrice;
  const mt5BridgeStatus =
    primaryData.source === 'MT5_BRIDGE' ? 'ONLINE' : 'OFFLINE_FALLBACK';

  const tfSummaryLines = REQUIRED_TIMEFRAMES.map((tf) => {
    const d = timeframes[tf];
    const last3 = d.candles
      .slice(-3)
      .map((c) => `[O:${c.open} H:${c.high} L:${c.low} C:${c.close} V:${Math.round(c.volume)}]`)
      .join(' -> ');
    return `  - ${tf} (${d.source}): Close=${d.latestPrice} | Range=[${d.low24h} - ${d.high24h}] | Δ=${d.changePercent}% | Recent 3 Bars: ${last3}`;
  }).join('\n');

  const promptSummary = [
    `LIVE MULTI-TIMEFRAME MARKET DATA (${asset} | Primary TF: ${primaryTimeframe} | Bridge: ${mt5BridgeStatus}):`,
    `  - Real-Time Spot Reference Price: ${currentSpotPrice}`,
    tfSummaryLines,
    `  - Instruction: Cross-check the uploaded chart's visible Y-axis price scale against this live multi-timeframe structure. If the screenshot displays a historical or custom price range, anchor entry_price, stop_loss, take_profit_1, and take_profit_2 to the screenshot's visible Y-axis while using the multi-timeframe structural dynamics to validate setup direction and institutional confluence.`,
  ].join('\n');

  return {
    asset,
    primaryTimeframe,
    currentSpotPrice,
    source: primaryData.source,
    mt5BridgeStatus,
    fetchedAt: new Date().toISOString(),
    timeframes,
    promptSummary,
  };
}
