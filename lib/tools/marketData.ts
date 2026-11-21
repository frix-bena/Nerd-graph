import { MarketBias } from '../types';

export type SupportedTimeframe =
  | '1M'
  | '3M'
  | '5M'
  | '15M'
  | '30M'
  | '1H'
  | '2H'
  | '4H'
  | '1D'
  | '1W'
  | '1MO';

export const SELECTABLE_TIMEFRAMES: {
  value: SupportedTimeframe;
  label: string;
  group: 'Scalping' | 'Intraday' | 'Swing & Macro';
}[] = [
  { value: '1M', label: '1m', group: 'Scalping' },
  { value: '3M', label: '3m', group: 'Scalping' },
  { value: '5M', label: '5m', group: 'Scalping' },
  { value: '15M', label: '15m', group: 'Intraday' },
  { value: '30M', label: '30m', group: 'Intraday' },
  { value: '1H', label: '1H', group: 'Intraday' },
  { value: '2H', label: '2H', group: 'Swing & Macro' },
  { value: '4H', label: '4H', group: 'Swing & Macro' },
  { value: '1D', label: '1D', group: 'Swing & Macro' },
  { value: '1W', label: '1W', group: 'Swing & Macro' },
  { value: '1MO', label: '1M (Monthly)', group: 'Swing & Macro' },
];

export type SupportedAsset =
  | 'XAUUSD'
  | 'XAGUSD'
  | 'EURUSD'
  | 'GBPUSD'
  | 'USDJPY'
  | 'GBPJPY'
  | 'EURJPY'
  | 'AUDUSD'
  | 'USDCAD'
  | 'USDCHF'
  | 'NZDUSD'
  | 'NAS100'
  | 'US30'
  | 'SPX500'
  | 'GER40'
  | 'USOIL'
  | 'BTCUSDT'
  | 'ETHUSDT'
  | 'SOLUSDT'
  | 'XRPUSDT'
  | 'BNBUSDT'
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
  timeframes: Record<string, TimeframeMarketData>;
  promptSummary: string;
}

export interface MarketProfile {
  symbol: string;
  anchorPrice: number;
  stepAtr: number;
  decimals: number;
  baseVol: number;
  minValidPrice: number;
  maxValidPrice: number;
}

const REQUIRED_TIMEFRAMES: SupportedTimeframe[] = ['4H', '1H', '15M', '5M'];

const ISO_CURRENCIES = new Set([
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'NZD',
  'SGD',
  'HKD',
  'NOK',
  'SEK',
  'DKK',
  'PLN',
  'ZAR',
  'MXN',
  'TRY',
  'CNH',
  'CNY',
]);

// Comprehensive market profiles so every asset class has accurate decimals, volatility, and price domain validation
const MARKET_PROFILES: Record<string, Omit<MarketProfile, 'symbol'>> = {
  // Precious Metals & Commodities
  XAUUSD: { anchorPrice: 2745.0, stepAtr: 3.4, decimals: 2, baseVol: 4500, minValidPrice: 800, maxValidPrice: 15000 },
  XAGUSD: { anchorPrice: 32.45, stepAtr: 0.14, decimals: 3, baseVol: 3600, minValidPrice: 8, maxValidPrice: 250 },
  XPTUSD: { anchorPrice: 985.0, stepAtr: 3.2, decimals: 2, baseVol: 2100, minValidPrice: 300, maxValidPrice: 5000 },
  USOIL: { anchorPrice: 71.4, stepAtr: 0.35, decimals: 2, baseVol: 5200, minValidPrice: 15, maxValidPrice: 250 },
  UKOIL: { anchorPrice: 75.2, stepAtr: 0.35, decimals: 2, baseVol: 4900, minValidPrice: 15, maxValidPrice: 250 },
  NATGAS: { anchorPrice: 2.85, stepAtr: 0.035, decimals: 3, baseVol: 4100, minValidPrice: 0.5, maxValidPrice: 30 },

  // Forex Majors
  EURUSD: { anchorPrice: 1.0845, stepAtr: 0.0016, decimals: 5, baseVol: 8500, minValidPrice: 0.7, maxValidPrice: 1.8 },
  GBPUSD: { anchorPrice: 1.2965, stepAtr: 0.0021, decimals: 5, baseVol: 7400, minValidPrice: 0.85, maxValidPrice: 2.2 },
  USDJPY: { anchorPrice: 153.45, stepAtr: 0.24, decimals: 3, baseVol: 8100, minValidPrice: 65, maxValidPrice: 320 },
  AUDUSD: { anchorPrice: 0.6585, stepAtr: 0.0014, decimals: 5, baseVol: 6200, minValidPrice: 0.35, maxValidPrice: 1.35 },
  USDCAD: { anchorPrice: 1.3895, stepAtr: 0.0017, decimals: 5, baseVol: 6400, minValidPrice: 0.8, maxValidPrice: 2.0 },
  USDCHF: { anchorPrice: 0.8765, stepAtr: 0.0015, decimals: 5, baseVol: 5900, minValidPrice: 0.5, maxValidPrice: 1.6 },
  NZDUSD: { anchorPrice: 0.5985, stepAtr: 0.0014, decimals: 5, baseVol: 5300, minValidPrice: 0.3, maxValidPrice: 1.2 },

  // Forex Crosses
  EURJPY: { anchorPrice: 165.4, stepAtr: 0.28, decimals: 3, baseVol: 6800, minValidPrice: 80, maxValidPrice: 350 },
  GBPJPY: { anchorPrice: 197.8, stepAtr: 0.36, decimals: 3, baseVol: 7200, minValidPrice: 95, maxValidPrice: 400 },
  AUDJPY: { anchorPrice: 100.8, stepAtr: 0.22, decimals: 3, baseVol: 5400, minValidPrice: 45, maxValidPrice: 240 },
  CADJPY: { anchorPrice: 110.4, stepAtr: 0.22, decimals: 3, baseVol: 5100, minValidPrice: 50, maxValidPrice: 250 },
  CHFJPY: { anchorPrice: 175.1, stepAtr: 0.29, decimals: 3, baseVol: 4900, minValidPrice: 70, maxValidPrice: 360 },
  NZDJPY: { anchorPrice: 91.6, stepAtr: 0.21, decimals: 3, baseVol: 4600, minValidPrice: 40, maxValidPrice: 220 },
  EURGBP: { anchorPrice: 0.8365, stepAtr: 0.0012, decimals: 5, baseVol: 5800, minValidPrice: 0.5, maxValidPrice: 1.3 },
  EURAUD: { anchorPrice: 1.646, stepAtr: 0.0025, decimals: 5, baseVol: 5200, minValidPrice: 1.0, maxValidPrice: 2.5 },
  GBPAUD: { anchorPrice: 1.968, stepAtr: 0.0032, decimals: 5, baseVol: 5400, minValidPrice: 1.1, maxValidPrice: 3.0 },
  EURCAD: { anchorPrice: 1.507, stepAtr: 0.0022, decimals: 5, baseVol: 5100, minValidPrice: 0.9, maxValidPrice: 2.3 },
  GBPCAD: { anchorPrice: 1.801, stepAtr: 0.0028, decimals: 5, baseVol: 5200, minValidPrice: 1.0, maxValidPrice: 2.7 },
  EURCHF: { anchorPrice: 0.942, stepAtr: 0.0013, decimals: 5, baseVol: 4800, minValidPrice: 0.6, maxValidPrice: 1.6 },
  GBPCHF: { anchorPrice: 1.126, stepAtr: 0.0019, decimals: 5, baseVol: 4900, minValidPrice: 0.7, maxValidPrice: 2.0 },
  AUDCAD: { anchorPrice: 0.915, stepAtr: 0.0014, decimals: 5, baseVol: 4400, minValidPrice: 0.5, maxValidPrice: 1.5 },
  AUDCHF: { anchorPrice: 0.577, stepAtr: 0.0012, decimals: 5, baseVol: 4200, minValidPrice: 0.3, maxValidPrice: 1.2 },
  AUDNZD: { anchorPrice: 1.101, stepAtr: 0.0014, decimals: 5, baseVol: 4300, minValidPrice: 0.8, maxValidPrice: 1.6 },
  EURNZD: { anchorPrice: 1.812, stepAtr: 0.0028, decimals: 5, baseVol: 4500, minValidPrice: 1.1, maxValidPrice: 2.8 },
  GBPNZD: { anchorPrice: 2.165, stepAtr: 0.0036, decimals: 5, baseVol: 4600, minValidPrice: 1.3, maxValidPrice: 3.3 },

  // Global Indices & Dollar Index
  NAS100: { anchorPrice: 20680.0, stepAtr: 42.0, decimals: 1, baseVol: 12500, minValidPrice: 4000, maxValidPrice: 65000 },
  US30: { anchorPrice: 43850.0, stepAtr: 75.0, decimals: 1, baseVol: 9200, minValidPrice: 12000, maxValidPrice: 110000 },
  SPX500: { anchorPrice: 5880.0, stepAtr: 11.5, decimals: 1, baseVol: 11000, minValidPrice: 1500, maxValidPrice: 20000 },
  US2000: { anchorPrice: 2260.0, stepAtr: 6.5, decimals: 1, baseVol: 6800, minValidPrice: 600, maxValidPrice: 8000 },
  GER40: { anchorPrice: 19450.0, stepAtr: 38.0, decimals: 1, baseVol: 7600, minValidPrice: 5000, maxValidPrice: 55000 },
  UK100: { anchorPrice: 8280.0, stepAtr: 16.0, decimals: 1, baseVol: 6400, minValidPrice: 3500, maxValidPrice: 25000 },
  JPN225: { anchorPrice: 38900.0, stepAtr: 110.0, decimals: 1, baseVol: 7100, minValidPrice: 10000, maxValidPrice: 100000 },
  DXY: { anchorPrice: 104.25, stepAtr: 0.16, decimals: 3, baseVol: 5500, minValidPrice: 65, maxValidPrice: 160 },

  // Crypto Markets
  BTCUSDT: { anchorPrice: 88450.0, stepAtr: 280.0, decimals: 1, baseVol: 9500, minValidPrice: 5000, maxValidPrice: 500000 },
  ETHUSDT: { anchorPrice: 3120.0, stepAtr: 18.5, decimals: 2, baseVol: 8200, minValidPrice: 200, maxValidPrice: 30000 },
  SOLUSDT: { anchorPrice: 188.5, stepAtr: 1.85, decimals: 2, baseVol: 7400, minValidPrice: 5, maxValidPrice: 3000 },
  BNBUSDT: { anchorPrice: 625.0, stepAtr: 4.2, decimals: 2, baseVol: 5600, minValidPrice: 40, maxValidPrice: 10000 },
  XRPUSDT: { anchorPrice: 1.125, stepAtr: 0.014, decimals: 4, baseVol: 8900, minValidPrice: 0.05, maxValidPrice: 50 },
  ADAUSDT: { anchorPrice: 0.745, stepAtr: 0.0095, decimals: 4, baseVol: 6700, minValidPrice: 0.02, maxValidPrice: 30 },
  DOGEUSDT: { anchorPrice: 0.365, stepAtr: 0.0055, decimals: 5, baseVol: 9100, minValidPrice: 0.005, maxValidPrice: 15 },
  AVAXUSDT: { anchorPrice: 34.2, stepAtr: 0.45, decimals: 2, baseVol: 5200, minValidPrice: 2, maxValidPrice: 1000 },
  LINKUSDT: { anchorPrice: 15.8, stepAtr: 0.22, decimals: 3, baseVol: 4900, minValidPrice: 1, maxValidPrice: 500 },
  DOTUSDT: { anchorPrice: 5.85, stepAtr: 0.085, decimals: 3, baseVol: 4500, minValidPrice: 0.5, maxValidPrice: 300 },
  LTCUSDT: { anchorPrice: 88.5, stepAtr: 0.95, decimals: 2, baseVol: 4800, minValidPrice: 10, maxValidPrice: 2000 },
  SUIUSDT: { anchorPrice: 3.15, stepAtr: 0.045, decimals: 4, baseVol: 6100, minValidPrice: 0.1, maxValidPrice: 100 },
  TONUSDT: { anchorPrice: 5.45, stepAtr: 0.065, decimals: 3, baseVol: 4700, minValidPrice: 0.2, maxValidPrice: 200 },
  PEPEUSDT: { anchorPrice: 0.0000195, stepAtr: 0.0000004, decimals: 7, baseVol: 9800, minValidPrice: 0.0000001, maxValidPrice: 0.1 },
  SHIBUSDT: { anchorPrice: 0.0000245, stepAtr: 0.0000005, decimals: 7, baseVol: 9400, minValidPrice: 0.0000001, maxValidPrice: 0.1 },

  // Major Equities / ETFs
  NVDA: { anchorPrice: 142.5, stepAtr: 1.65, decimals: 2, baseVol: 9500, minValidPrice: 10, maxValidPrice: 3000 },
  AAPL: { anchorPrice: 228.4, stepAtr: 1.45, decimals: 2, baseVol: 8200, minValidPrice: 20, maxValidPrice: 2000 },
  TSLA: { anchorPrice: 338.0, stepAtr: 4.2, decimals: 2, baseVol: 9100, minValidPrice: 15, maxValidPrice: 3000 },
  MSFT: { anchorPrice: 425.0, stepAtr: 2.6, decimals: 2, baseVol: 7400, minValidPrice: 50, maxValidPrice: 3000 },
  AMZN: { anchorPrice: 210.5, stepAtr: 1.8, decimals: 2, baseVol: 7800, minValidPrice: 20, maxValidPrice: 2500 },
  META: { anchorPrice: 585.0, stepAtr: 4.5, decimals: 2, baseVol: 6900, minValidPrice: 40, maxValidPrice: 3500 },
  GOOGL: { anchorPrice: 178.5, stepAtr: 1.5, decimals: 2, baseVol: 7200, minValidPrice: 20, maxValidPrice: 2000 },
  AMD: { anchorPrice: 138.0, stepAtr: 1.9, decimals: 2, baseVol: 7600, minValidPrice: 10, maxValidPrice: 1500 },
  SPY: { anchorPrice: 586.0, stepAtr: 2.1, decimals: 2, baseVol: 9900, minValidPrice: 100, maxValidPrice: 2500 },
  QQQ: { anchorPrice: 504.0, stepAtr: 2.4, decimals: 2, baseVol: 9400, minValidPrice: 80, maxValidPrice: 2500 },
};

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

export function isAutoAsset(rawAsset?: string): boolean {
  if (!rawAsset) return true;
  const upper = rawAsset.trim().toUpperCase();
  return (
    upper === '' ||
    upper === 'AUTO' ||
    upper === 'AUTODETECT' ||
    upper === 'AUTO-DETECT' ||
    upper === 'DETECT' ||
    upper === 'NONE' ||
    upper === 'UNKNOWN' ||
    upper === 'DETECT FROM CHART'
  );
}

export function isAutoTimeframe(rawTf?: string): boolean {
  if (!rawTf) return true;
  const upper = rawTf.trim().toUpperCase();
  return (
    upper === '' ||
    upper === 'AUTO' ||
    upper === 'AUTODETECT' ||
    upper === 'AUTO-DETECT' ||
    upper === 'DETECT' ||
    upper === 'NONE' ||
    upper === 'UNKNOWN'
  );
}

export function isStandardForexPair(symbol: string): boolean {
  if (symbol.length !== 6) return false;
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);
  return ISO_CURRENCIES.has(base) && ISO_CURRENCIES.has(quote);
}

export function normalizeAssetSymbol(rawAsset?: string, fallback = 'XAUUSD'): string {
  if (!rawAsset || isAutoAsset(rawAsset)) return fallback;

  // Strip common exchange prefixes (e.g. "OANDA:XAUUSD", "BINANCE:BTCUSDT", "FX:EURUSD")
  let stripped = String(rawAsset)
    .toUpperCase()
    .trim()
    .replace(/^[A-Z0-9_]+\s*:\s*/, '');

  // Strip parenthetical descriptions or timeframe trailers (e.g. "EUR/USD (15M)" -> "EUR/USD")
  stripped = stripped.replace(/\([^)]*\)/g, ' ').trim();

  // Strip common MT4/MT5 broker suffixes (e.g., ".pro", ".ecn", ".raw", ".m", ".c", "-PERP")
  stripped = stripped
    .replace(/[._-](PRO|ECN|RAW|STD|MINI|MICRO|PERP|SWAP|CASH|SPOT|FUT|INDEX|CFD)\b.*$/i, '')
    .replace(/\b(PERP|PERPETUAL|SPOT|CFD|FUTURES)\b/gi, '');

  const cleaned = stripped.replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return fallback;

  // Metals & Commodities
  if (cleaned.includes('XAU') || cleaned === 'GOLD' || cleaned === 'GCF' || cleaned === 'GC') {
    return 'XAUUSD';
  }
  if (cleaned.includes('XAG') || cleaned === 'SILVER' || cleaned === 'SIF' || cleaned === 'SI') {
    return 'XAGUSD';
  }
  if (cleaned.includes('XPT') || cleaned === 'PLATINUM') {
    return 'XPTUSD';
  }
  if (
    cleaned.includes('WTI') ||
    cleaned.includes('USOIL') ||
    cleaned.includes('XTI') ||
    cleaned === 'CRUDE' ||
    cleaned === 'CRUDEOIL' ||
    cleaned === 'CL' ||
    cleaned === 'CLF'
  ) {
    return 'USOIL';
  }
  if (
    cleaned.includes('BRENT') ||
    cleaned.includes('UKOIL') ||
    cleaned.includes('XBR') ||
    cleaned === 'BZF'
  ) {
    return 'UKOIL';
  }
  if (
    cleaned.includes('NATGAS') ||
    cleaned.includes('NATURALGAS') ||
    cleaned.includes('XNG') ||
    cleaned === 'NGF'
  ) {
    return 'NATGAS';
  }

  // Global Indices
  if (
    cleaned.includes('NAS100') ||
    cleaned.includes('NDX') ||
    cleaned.includes('US100') ||
    cleaned.includes('USTEC') ||
    cleaned === 'NASDAQ' ||
    cleaned === 'NQ' ||
    cleaned === 'NQF'
  ) {
    return 'NAS100';
  }
  if (
    cleaned.includes('US30') ||
    cleaned.includes('DJI') ||
    cleaned.includes('DJ30') ||
    cleaned === 'DOW' ||
    cleaned === 'DOWJONES' ||
    cleaned === 'WALLSTREET' ||
    cleaned === 'YM' ||
    cleaned === 'YMF'
  ) {
    return 'US30';
  }
  if (
    cleaned.includes('SPX500') ||
    cleaned.includes('US500') ||
    cleaned === 'SPX' ||
    cleaned === 'SP500' ||
    cleaned === 'ES' ||
    cleaned === 'ESF' ||
    cleaned === 'GSPC'
  ) {
    return 'SPX500';
  }
  if (
    cleaned.includes('GER40') ||
    cleaned.includes('DE40') ||
    cleaned.includes('DAX') ||
    cleaned === 'GDAXI' ||
    cleaned === 'GER30'
  ) {
    return 'GER40';
  }
  if (cleaned.includes('UK100') || cleaned.includes('FTSE')) {
    return 'UK100';
  }
  if (
    cleaned.includes('JPN225') ||
    cleaned.includes('JP225') ||
    cleaned.includes('NI225') ||
    cleaned.includes('NIKKEI')
  ) {
    return 'JPN225';
  }
  if (cleaned.includes('US2000') || cleaned === 'RUT' || cleaned === 'RTY' || cleaned === 'RUSSELL') {
    return 'US2000';
  }
  if (cleaned === 'DXY' || cleaned === 'USDX' || cleaned === 'DOLLARINDEX' || cleaned === 'DXYNYB') {
    return 'DXY';
  }

  // Check if cleaned starts with a valid 6-letter Forex pair (handling single-letter MT5 broker suffixes like "EURUSDm" or "USDJPYc")
  if (cleaned.length >= 6) {
    const first6 = cleaned.slice(0, 6);
    if (isStandardForexPair(first6)) {
      return first6;
    }
  }

  // Crypto Majors & Altcoins
  const cryptoBases: Record<string, string> = {
    BTC: 'BTCUSDT',
    BITCOIN: 'BTCUSDT',
    XBT: 'BTCUSDT',
    ETH: 'ETHUSDT',
    ETHEREUM: 'ETHUSDT',
    SOL: 'SOLUSDT',
    SOLANA: 'SOLUSDT',
    BNB: 'BNBUSDT',
    XRP: 'XRPUSDT',
    RIPPLE: 'XRPUSDT',
    ADA: 'ADAUSDT',
    CARDANO: 'ADAUSDT',
    DOGE: 'DOGEUSDT',
    DOGECOIN: 'DOGEUSDT',
    AVAX: 'AVAXUSDT',
    AVALANCHE: 'AVAXUSDT',
    LINK: 'LINKUSDT',
    CHAINLINK: 'LINKUSDT',
    DOT: 'DOTUSDT',
    POLKADOT: 'DOTUSDT',
    LTC: 'LTCUSDT',
    LITECOIN: 'LTCUSDT',
    SUI: 'SUIUSDT',
    TON: 'TONUSDT',
    PEPE: 'PEPEUSDT',
    SHIB: 'SHIBUSDT',
  };

  if (cryptoBases[cleaned]) {
    return cryptoBases[cleaned];
  }
  for (const [base, canonical] of Object.entries(cryptoBases)) {
    if (
      cleaned === `${base}USD` ||
      cleaned === `${base}USDT` ||
      cleaned === `${base}USDC` ||
      cleaned === `${base}BUSD`
    ) {
      return canonical;
    }
  }

  return cleaned;
}

export function getMarketProfile(rawSymbol: string, referencePrice?: number): MarketProfile {
  const symbol = normalizeAssetSymbol(rawSymbol);
  const known = MARKET_PROFILES[symbol];

  if (known) {
    if (
      referencePrice &&
      Number.isFinite(referencePrice) &&
      referencePrice > 0 &&
      referencePrice >= known.minValidPrice &&
      referencePrice <= known.maxValidPrice
    ) {
      const scale = referencePrice / known.anchorPrice;
      return {
        symbol,
        ...known,
        anchorPrice: referencePrice,
        stepAtr: Number((known.stepAtr * scale).toFixed(known.decimals)),
      };
    }
    return { symbol, ...known };
  }

  // Dynamic profile for any custom forex cross, crypto pair, or stock ticker
  if (isStandardForexPair(symbol)) {
    const isJpy = symbol.includes('JPY');
    const anchor =
      referencePrice && referencePrice > 0 ? referencePrice : isJpy ? 155.0 : 1.1;
    return {
      symbol,
      anchorPrice: anchor,
      stepAtr: isJpy ? 0.24 : 0.0018,
      decimals: isJpy ? 3 : 5,
      baseVol: 6000,
      minValidPrice: isJpy ? 40 : 0.2,
      maxValidPrice: isJpy ? 400 : 3.5,
    };
  }

  const ref = referencePrice && referencePrice > 0 ? referencePrice : 100.0;
  const decimals =
    ref < 0.01 ? 6 : ref < 1 ? 5 : ref < 10 ? 4 : ref < 5000 ? 2 : 1;
  return {
    symbol,
    anchorPrice: ref,
    stepAtr: Number((ref * 0.0045).toFixed(decimals)),
    decimals,
    baseVol: 5000,
    minValidPrice: ref * 0.05,
    maxValidPrice: ref * 20,
  };
}

/**
 * Checks whether a price read from a chart's Y-axis is compatible with the known price domain of an asset.
 * Prevents labeling a EURUSD (1.08) or USDJPY (154.0) or BTC (88000) chart as XAUUSD (2700) or vice versa.
 */
export function isPriceCompatibleWithAsset(price: number, rawAsset?: string): boolean {
  if (!Number.isFinite(price) || price <= 0 || !rawAsset || isAutoAsset(rawAsset)) {
    return false;
  }
  const symbol = normalizeAssetSymbol(rawAsset);
  const known = MARKET_PROFILES[symbol];
  if (known) {
    return price >= known.minValidPrice && price <= known.maxValidPrice;
  }
  if (isStandardForexPair(symbol)) {
    return symbol.includes('JPY')
      ? price >= 40 && price <= 400
      : price >= 0.2 && price <= 3.5;
  }
  return true;
}

export function getAssetDecimals(symbol: string, samplePrice?: number): number {
  const clean = normalizeAssetSymbol(symbol);
  const known = MARKET_PROFILES[clean];
  if (known) return known.decimals;

  if (isStandardForexPair(clean)) {
    return clean.includes('JPY') ? 3 : 5;
  }
  if (clean.includes('JPY')) return 3;

  if (samplePrice && Number.isFinite(samplePrice) && samplePrice > 0) {
    if (samplePrice < 0.01) return 6;
    if (samplePrice < 2) return 5;
    if (samplePrice < 10) return 4;
    if (samplePrice < 10000) return 2;
    return 1;
  }
  return 2;
}

export function normalizeTimeframeKey(rawTf?: string): SupportedTimeframe {
  const upper = String(rawTf || '15M').toUpperCase().trim();
  if (
    upper === '1MO' ||
    upper === 'MN' ||
    upper === 'MN1' ||
    upper === '1MTH' ||
    upper.includes('MONTH')
  ) {
    return '1MO';
  }
  if (upper === '1W' || upper === 'W1' || upper === 'WK' || upper.includes('WEEK')) {
    return '1W';
  }
  if (
    upper === '1D' ||
    upper === 'D1' ||
    upper === 'D' ||
    upper === '24H' ||
    upper.includes('DAY') ||
    upper.includes('DAILY')
  ) {
    return '1D';
  }
  if (upper.includes('4H') || upper === 'H4' || upper === '240' || upper === '240M') {
    return '4H';
  }
  if (upper.includes('2H') || upper === 'H2' || upper === '120' || upper === '120M') {
    return '2H';
  }
  if (
    upper.includes('1H') ||
    upper === 'H1' ||
    upper === '60' ||
    upper === '60M' ||
    upper.includes('HOUR')
  ) {
    return '1H';
  }
  if (upper.includes('30M') || upper === 'M30' || upper === '30') {
    return '30M';
  }
  if (upper.includes('15M') || upper === 'M15' || upper === '15') {
    return '15M';
  }
  if (upper === '5M' || upper === 'M5' || upper === '5' || upper === '5MIN') {
    return '5M';
  }
  if (upper === '3M' || upper === 'M3' || upper === '3' || upper === '3MIN') {
    return '3M';
  }
  if (upper === '1M' || upper === 'M1' || upper === '1' || upper === '1MIN') {
    return '1M';
  }
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
    XAGUSD: 'XAG/USD',
    XPTUSD: 'XPT/USD',
    EURUSD: 'EUR/USD',
    GBPUSD: 'GBP/USD',
    USDJPY: 'USD/JPY',
    GBPJPY: 'GBP/JPY',
    EURJPY: 'EUR/JPY',
    AUDUSD: 'AUD/USD',
    USDCAD: 'USD/CAD',
    USDCHF: 'USD/CHF',
    NZDUSD: 'NZD/USD',
    EURGBP: 'EUR/GBP',
    NAS100: 'NDX',
    US30: 'DJI',
    SPX500: 'SPX',
    BTCUSDT: 'BTC/USD',
    ETHUSDT: 'ETH/USD',
    SOLUSDT: 'SOL/USD',
    BNBUSDT: 'BNB/USD',
    XRPUSDT: 'XRP/USD',
    ADAUSDT: 'ADA/USD',
    DOGEUSDT: 'DOGE/USD',
  };

  let tdSymbol = symbolMap[symbol];
  if (!tdSymbol) {
    if (isStandardForexPair(symbol)) {
      tdSymbol = `${symbol.slice(0, 3)}/${symbol.slice(3, 6)}`;
    } else if (symbol.endsWith('USDT')) {
      tdSymbol = `${symbol.slice(0, -4)}/USD`;
    } else {
      tdSymbol = symbol;
    }
  }

  const intervalMap: Record<SupportedTimeframe, string> = {
    '1M': '1min',
    '3M': '5min',
    '5M': '5min',
    '15M': '15min',
    '30M': '30min',
    '1H': '1h',
    '2H': '2h',
    '4H': '4h',
    '1D': '1day',
    '1W': '1week',
    '1MO': '1month',
  };

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
 * Step 2B: Try Binance Public REST API (supports all crypto pairs + PAXGUSDT gold & EUR/GBP spot proxies)
 */
async function tryFetchFromBinance(
  symbol: string,
  timeframe: SupportedTimeframe
): Promise<OHLCVCandle[] | null> {
  const binanceSymbolMap: Record<string, string> = {
    BTCUSDT: 'BTCUSDT',
    ETHUSDT: 'ETHUSDT',
    SOLUSDT: 'SOLUSDT',
    BNBUSDT: 'BNBUSDT',
    XRPUSDT: 'XRPUSDT',
    ADAUSDT: 'ADAUSDT',
    DOGEUSDT: 'DOGEUSDT',
    AVAXUSDT: 'AVAXUSDT',
    LINKUSDT: 'LINKUSDT',
    DOTUSDT: 'DOTUSDT',
    LTCUSDT: 'LTCUSDT',
    SUIUSDT: 'SUIUSDT',
    TONUSDT: 'TONUSDT',
    PEPEUSDT: 'PEPEUSDT',
    SHIBUSDT: 'SHIBUSDT',
    XAUUSD: 'PAXGUSDT',
    EURUSD: 'EURUSDT',
    GBPUSD: 'GBPUSDT',
    AUDUSD: 'AUDUSDT',
  };

  const binanceSymbol =
    binanceSymbolMap[symbol] ||
    (/^[A-Z0-9]{2,10}USDT$/.test(symbol) ? symbol : undefined);
  if (!binanceSymbol) return null;

  const intervalMap: Record<SupportedTimeframe, string> = {
    '1M': '1m',
    '3M': '3m',
    '5M': '5m',
    '15M': '15m',
    '30M': '30m',
    '1H': '1h',
    '2H': '2h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w',
    '1MO': '1M',
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

    const sampleClose = Number.parseFloat(rows[rows.length - 1]?.[4] || '0');
    const decimals = getAssetDecimals(symbol, sampleClose);
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
    XAGUSD: 'SI=F',
    XPTUSD: 'PL=F',
    USOIL: 'CL=F',
    UKOIL: 'BZ=F',
    NATGAS: 'NG=F',
    EURUSD: 'EURUSD=X',
    GBPUSD: 'GBPUSD=X',
    USDJPY: 'JPY=X',
    GBPJPY: 'GBPJPY=X',
    EURJPY: 'EURJPY=X',
    AUDUSD: 'AUDUSD=X',
    USDCAD: 'CAD=X',
    USDCHF: 'CHF=X',
    NZDUSD: 'NZDUSD=X',
    EURGBP: 'EURGBP=X',
    AUDJPY: 'AUDJPY=X',
    CADJPY: 'CADJPY=X',
    CHFJPY: 'CHFJPY=X',
    NZDJPY: 'NZDJPY=X',
    EURAUD: 'EURAUD=X',
    GBPAUD: 'GBPAUD=X',
    EURCAD: 'EURCAD=X',
    GBPCAD: 'GBPCAD=X',
    EURCHF: 'EURCHF=X',
    GBPCHF: 'GBPCHF=X',
    AUDCAD: 'AUDCAD=X',
    AUDCHF: 'AUDCHF=X',
    AUDNZD: 'AUDNZD=X',
    NAS100: 'NQ=F',
    US30: 'YM=F',
    SPX500: 'ES=F',
    US2000: 'RTY=F',
    GER40: '^GDAXI',
    UK100: '^FTSE',
    JPN225: '^N225',
    DXY: 'DX-Y.NYB',
    BTCUSDT: 'BTC-USD',
    ETHUSDT: 'ETH-USD',
    SOLUSDT: 'SOL-USD',
    BNBUSDT: 'BNB-USD',
    XRPUSDT: 'XRP-USD',
    ADAUSDT: 'ADA-USD',
    DOGEUSDT: 'DOGE-USD',
    AVAXUSDT: 'AVAX-USD',
    LINKUSDT: 'LINK-USD',
    DOTUSDT: 'DOT-USD',
    LTCUSDT: 'LTC-USD',
    SUIUSDT: 'SUI-USD',
    TONUSDT: 'TON11419-USD',
  };

  let yahooTicker = yahooMap[symbol];
  if (!yahooTicker) {
    if (isStandardForexPair(symbol)) {
      yahooTicker = `${symbol}=X`;
    } else if (symbol.endsWith('USDT')) {
      yahooTicker = `${symbol.slice(0, -4)}-USD`;
    } else if (/^[A-Z]{1,5}$/.test(symbol)) {
      // Standard stock / ETF ticker (e.g., NVDA, AAPL, TSLA, SPY, QQQ)
      yahooTicker = symbol;
    } else {
      yahooTicker = `${symbol}=X`;
    }
  }

  const intervalConfig: Record<SupportedTimeframe, { interval: string; range: string }> = {
    '1M': { interval: '1m', range: '1d' },
    '3M': { interval: '5m', range: '2d' },
    '5M': { interval: '5m', range: '2d' },
    '15M': { interval: '15m', range: '5d' },
    '30M': { interval: '30m', range: '10d' },
    '1H': { interval: '60m', range: '10d' },
    '2H': { interval: '60m', range: '1mo' },
    '4H': { interval: '60m', range: '1mo' },
    '1D': { interval: '1d', range: '3mo' },
    '1W': { interval: '1wk', range: '2y' },
    '1MO': { interval: '1mo', range: '5y' },
  };

  const cfg = intervalConfig[timeframe];
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2200);
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
        yahooTicker
      )}?interval=${cfg.interval}&range=${cfg.range}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ApexVisionAI/2.4)',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const quote = result?.indicators?.quote?.[0] || {};
      if (!Array.isArray(timestamps) || timestamps.length < 15) continue;

      const validCloses = (quote.close || []).filter(
        (c: unknown) => typeof c === 'number' && Number.isFinite(c) && c > 0
      );
      const sampleClose = validCloses[validCloses.length - 1] || 0;
      const decimals = getAssetDecimals(symbol, sampleClose);
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

      if (raw1hCandles.length < 15) continue;

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
      // try next Yahoo host
    }
  }

  return null;
}

/**
 * Step 3: Deterministic Institutional Multi-Timeframe OHLCV Generator
 * Used only when both MT5 Bridge and public REST APIs are offline or unreachable.
 * Anchors directly to the chart's calibrated price (`referencePrice`) and direction (`preferredBias`)
 * when provided so downstream SMC math never conflicts with the uploaded chart.
 */
function generateSyntheticInstitutionalCandles(
  symbol: string,
  timeframe: SupportedTimeframe,
  options?: { referencePrice?: number; preferredBias?: MarketBias }
): OHLCVCandle[] {
  const cfg = getMarketProfile(symbol, options?.referencePrice);

  const tfMultiplier: Record<SupportedTimeframe, number> = {
    '1M': 0.25,
    '3M': 0.4,
    '5M': 0.55,
    '15M': 1.0,
    '30M': 1.18,
    '1H': 1.35,
    '2H': 1.75,
    '4H': 2.2,
    '1D': 4.5,
    '1W': 9.0,
    '1MO': 18.0,
  };
  const tfMinutes: Record<SupportedTimeframe, number> = {
    '1M': 1,
    '3M': 3,
    '5M': 5,
    '15M': 15,
    '30M': 30,
    '1H': 60,
    '2H': 120,
    '4H': 240,
    '1D': 1440,
    '1W': 10080,
    '1MO': 43200,
  };

  const unit = Math.max(
    cfg.stepAtr * tfMultiplier[timeframe],
    Math.pow(10, -cfg.decimals) * 4
  );
  const intervalMs = tfMinutes[timeframe] * 60 * 1000;
  const nowAligned = Math.floor(Date.now() / intervalMs) * intervalMs;
  const totalBars = 60;
  const isBearishAsset =
    options?.preferredBias === 'BEARISH'
      ? true
      : options?.preferredBias === 'BULLISH'
      ? false
      : symbol === 'BTCUSDT';

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
      if (i < 42) {
        delta = Math.sin(i * 0.45) * unit * 0.55 + unit * 0.05;
      } else if (i === 42 || i === 43) {
        delta = -unit * 0.95;
      } else if (i === 44) {
        delta = unit * 0.4;
        wickDown = unit * 2.4;
        volFactor = 2.1;
      } else if (i >= 45 && i <= 49) {
        delta = unit * 1.45;
        wickUp = unit * 0.25;
        wickDown = unit * 0.12;
        volFactor = 2.5;
      } else {
        delta = i % 2 === 0 ? -unit * 0.42 : unit * 0.15;
        volFactor = 0.85;
      }
    } else {
      if (i < 42) {
        delta = Math.cos(i * 0.45) * unit * 0.55 - unit * 0.04;
      } else if (i === 42 || i === 43) {
        delta = unit * 0.95;
      } else if (i === 44) {
        delta = -unit * 0.45;
        wickUp = unit * 2.5;
        volFactor = 2.2;
      } else if (i >= 45 && i <= 49) {
        delta = -unit * 1.45;
        wickUp = unit * 0.12;
        wickDown = unit * 0.25;
        volFactor = 2.6;
      } else {
        delta = i % 2 === 0 ? unit * 0.42 : -unit * 0.15;
        volFactor = 0.85;
      }
    }

    const minFloor = Math.pow(10, -cfg.decimals);
    const open = roundPrice(runningClose, cfg.decimals);
    const close = roundPrice(Math.max(minFloor, open + delta), cfg.decimals);
    const high = roundPrice(Math.max(open, close) + wickUp, cfg.decimals);
    const low = roundPrice(Math.max(minFloor, Math.min(open, close) - wickDown), cfg.decimals);
    const volume = Math.round(cfg.baseVol * volFactor * (0.9 + phasePos * 0.2));

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

export interface FetchMarketDataOptions {
  referencePrice?: number;
  preferredBias?: MarketBias;
}

async function fetchTimeframeData(
  symbol: string,
  timeframe: SupportedTimeframe,
  options?: FetchMarketDataOptions
): Promise<TimeframeMarketData> {
  const hasCustomOptions =
    (options?.referencePrice && options.referencePrice > 0) || Boolean(options?.preferredBias);
  const cacheKey = `${symbol}:${timeframe}`;
  const cachedRest = restResponseCache.get(cacheKey);
  if (
    cachedRest &&
    Date.now() < cachedRest.expiresAt &&
    (cachedRest.data.source !== 'INSTITUTIONAL_SYNTHETIC_FALLBACK' || !hasCustomOptions)
  ) {
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

  // 3. Fallback to Binance REST API for all supported crypto & spot proxies
  if (!candles) {
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
    candles = generateSyntheticInstitutionalCandles(symbol, timeframe, options);
    source = 'INSTITUTIONAL_SYNTHETIC_FALLBACK';
  }

  const lastCloseSample = candles[candles.length - 1]?.close;
  const decimals = getAssetDecimals(symbol, lastCloseSample);
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

  if (source !== 'INSTITUTIONAL_SYNTHETIC_FALLBACK' || !hasCustomOptions) {
    restResponseCache.set(cacheKey, {
      expiresAt: Date.now() + 45 * 1000,
      data: result,
    });
  }

  return result;
}

/**
 * Pulls live OHLCV market data across 4H, 1H, 15M, and 5M timeframes for the requested asset
 * via the MT5 Bridge with automatic fallback to free REST APIs and chart-anchored series.
 */
export async function fetchMultiTimeframeMarketData(
  rawAsset?: string,
  rawTimeframe?: string,
  options?: FetchMarketDataOptions
): Promise<MultiTimeframeMarketContext> {
  const asset = normalizeAssetSymbol(rawAsset);
  const primaryTimeframe = normalizeTimeframeKey(rawTimeframe);

  const timeframesToFetch: SupportedTimeframe[] = Array.from(
    new Set<SupportedTimeframe>([...REQUIRED_TIMEFRAMES, primaryTimeframe])
  );

  const results = await Promise.all(
    timeframesToFetch.map((tf) => fetchTimeframeData(asset, tf, options))
  );

  const timeframes: Record<string, TimeframeMarketData> = {};
  timeframesToFetch.forEach((tf, idx) => {
    timeframes[tf] = results[idx];
  });

  const primaryData = timeframes[primaryTimeframe] || timeframes['15M'];
  const currentSpotPrice = primaryData.latestPrice;
  const mt5BridgeStatus =
    primaryData.source === 'MT5_BRIDGE' ? 'ONLINE' : 'OFFLINE_FALLBACK';

  const tfSummaryLines = timeframesToFetch
    .map((tf) => {
      const d = timeframes[tf];
      const last3 = d.candles
        .slice(-3)
        .map((c) => `[O:${c.open} H:${c.high} L:${c.low} C:${c.close} V:${Math.round(c.volume)}]`)
        .join(' -> ');
      return `  - ${tf} (${d.source}): Close=${d.latestPrice} | Range=[${d.low24h} - ${d.high24h}] | Δ=${d.changePercent}% | Recent 3 Bars: ${last3}`;
    })
    .join('\n');

  const promptSummary =
    primaryData.source === 'INSTITUTIONAL_SYNTHETIC_FALLBACK'
      ? [
          `MARKET TELEMETRY STATUS (${asset} | Primary TF: ${primaryTimeframe}):`,
          `  - External live market feed is offline; DO NOT invent or guess external prices.`,
          `  - MANDATORY ANTI-HALLUCINATION RULE: Derive 100% of price levels (entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3), swing highs/lows, and zones strictly from the visible Y-axis price scale on the uploaded screenshot.`,
        ].join('\n')
      : [
          `LIVE MULTI-TIMEFRAME MARKET DATA (${asset} | Primary TF: ${primaryTimeframe} | Source: ${primaryData.source}):`,
          `  - Real-Time Spot Reference Price: ${currentSpotPrice}`,
          tfSummaryLines,
          `  - ANTI-HALLUCINATION INSTRUCTION: First read the uploaded screenshot's visible Y-axis price scale (axis_bottom_price to axis_top_price). ONLY use this live reference price if the screenshot lacks a visible Y-axis or matches this exact price window. If the screenshot displays a different price range or historical window, anchor 100% of entry_price, stop_loss, and take_profit levels strictly to the screenshot's visible Y-axis.`,
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
