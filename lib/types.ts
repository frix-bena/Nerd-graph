export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TradeRecommendation = 'BUY' | 'SELL' | 'WAIT';
export type SetupType = 'BUY SETUP' | 'SELL SETUP' | 'NO TRADE' | 'INVALID_IMAGE';
export type ChartType = 'CANDLESTICK' | 'LINE_OR_OVERLAID' | 'AREA' | string;
export type AnalysisMode = 'SMC_CANDLESTICK' | 'MACRO_PRICE_ACTION';
export type MarketPhase =
  | 'Accumulation'
  | 'Expansion'
  | 'Pullback'
  | 'Consolidation'
  | 'Manipulation'
  | 'Distribution'
  | 'Re-accumulation'
  | string;
export type SignalStatus = 'ACTIVE' | 'HIT_TP1' | 'HIT_TP2' | 'STOPPED' | 'INVALIDATED';

export interface MarketMechanicsExplanation {
  current_market_phase: MarketPhase;
  current_phase: MarketPhase;
  what_is_happening: string;
  how_it_works_steps: string[];
  how_it_works_step_by_step: string[];
}

export interface TradingToolsAnalysis {
  market_structure: string;
  liquidity_zones: string;
  imbalances_and_obs: string;
  fibonacci_or_session_context: string;
}

export interface TradeExecution {
  setup_type: SetupType;
  entry_price: number | string;
  stop_loss: number | string;
  take_profit_1: number | string;
  take_profit_2: number | string;
  take_profit_3?: number | string;
  risk_to_reward: string;
  invalidation_condition: string;
}

export type AnnotationZoneType =
  | 'FVG'
  | 'OB'
  | 'LIQUIDITY'
  | 'BOS'
  | 'SUPPORT'
  | 'RESISTANCE'
  | 'SUPPLY_DEMAND';

export interface VisualProofZone {
  label: string;
  type: AnnotationZoneType;
  x_start: number;
  y_start: number;
  x_end: number;
  y_end: number;
  x_start_percent: number;
  y_start_percent: number;
  x_end_percent: number;
  y_end_percent: number;
}

export interface PredictionPathPoint {
  x: number;
  y: number;
  label: string;
  x_percent: number;
  y_percent: number;
  note: string;
}

export interface VisualProofAnnotations {
  entry_y: number;
  stop_loss_y: number;
  tp1_y: number;
  tp2_y: number;
  tp3_y?: number;
  entry_y_percent: number;
  stop_loss_y_percent: number;
  tp1_y_percent: number;
  tp2_y_percent: number;
  tp3_y_percent?: number;
  zones: VisualProofZone[];
  prediction_path: PredictionPathPoint[];
}

export interface AccuracyVerification {
  is_verified: boolean;
  price_geometry_valid: boolean;
  y_coordinate_monotonic: boolean;
  rr_mathematically_verified: boolean;
  confluence_gate_passed: boolean;
  calculated_rr: number;
  axis_top_price?: number;
  axis_bottom_price?: number;
  current_market_price?: number;
  adjustments_applied: string[];
  verification_checks: string[];
}

export type ForecastTimeframe = '5M' | '15M' | '1H' | '4H';

export interface ForecastHistoricalCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ForecastProjectedPoint {
  time: number;
  value: number;
  label?: string;
}

export interface TimeframeForecastProjection {
  historicalCandles: ForecastHistoricalCandle[];
  projectedPath: ForecastProjectedPoint[];
  bias: MarketBias;
  shortNote: string;
}

export type MultiTimeframeForecast = {
  [timeframe in ForecastTimeframe]: TimeframeForecastProjection;
};

export interface InstitutionalSMCAnalysis {
  asset: string;
  timeframe: string;
  chart_type?: ChartType;
  analysis_mode?: AnalysisMode;
  bias: MarketBias;
  confidence_score: number;
  current_market_phase: MarketPhase;
  what_is_happening: string;
  how_it_works_steps: string[];
  entry_y: number;
  stop_loss_y: number;
  tp1_y: number;
  tp2_y: number;
  tp3_y?: number;
  zones: VisualProofZone[];
  prediction_path: PredictionPathPoint[];
  market_mechanics_explanation: MarketMechanicsExplanation;
  trading_tools_analysis: TradingToolsAnalysis;
  trade_execution: TradeExecution;
  visual_proof_annotations: VisualProofAnnotations;
  accuracy_verification?: AccuracyVerification;
  multiTimeframeForecast?: MultiTimeframeForecast;
}

export interface TradeAnalysis extends InstitutionalSMCAnalysis {
  market_bias: MarketBias;
  trade_recommendation: TradeRecommendation;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3?: number;
  risk_reward_ratio: string;
  key_confluences: string[];
  invalidation_condition: string;
  summary: string;
  chartImageUrl?: string;
}

export interface SMCSignalOutput extends InstitutionalSMCAnalysis {
  market_bias: MarketBias;
  trade_recommendation: TradeRecommendation;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3?: number;
  risk_reward_ratio: string;
  key_confluences: string[];
  invalidation_condition: string;
  analysis_summary: string;
  chartImageUrl?: string;
  error?: string;
}

export interface SignalRecord extends SMCSignalOutput {
  id: string;
  createdAt: string;
  chartImageUrl?: string;
  status: SignalStatus;
  mt5Executed?: boolean;
}

export interface MT5ExecutionPayload {
  action: 'TRADE_TRANSACTION';
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  stoploss: number;
  takeprofit1: number;
  takeprofit2: number;
  magic: number;
  comment: string;
  webhookSecret: string;
}

export interface UserProfile {
  name: string;
  email: string;
  tier: 'FREE' | 'PRO' | 'INSTITUTIONAL';
  credits: number;
  mt5Account: string;
  mt5Server: string;
  mt5Connected: boolean;
  webhookToken: string;
}

export function formatSignalPrice(value: unknown, asset?: string): string {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number.parseFloat(value.replace(/[^0-9.-]+/g, ''))
      : 0;
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
