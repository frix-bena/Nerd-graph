export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TradeRecommendation = 'BUY' | 'SELL' | 'WAIT';
export type SignalStatus = 'ACTIVE' | 'HIT_TP1' | 'HIT_TP2' | 'STOPPED' | 'INVALIDATED';

export interface TradeAnalysis {
  asset: string;
  timeframe: string;
  market_bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trade_recommendation: 'BUY' | 'SELL' | 'WAIT';
  confidence_score: number;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward_ratio: string;
  key_confluences: string[];
  invalidation_condition: string;
  summary: string;
}

export interface SMCSignalOutput {
  asset: string;
  timeframe: string;
  market_bias: MarketBias;
  trade_recommendation: TradeRecommendation;
  confidence_score: number;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward_ratio: string;
  key_confluences: string[];
  invalidation_condition: string;
  analysis_summary: string;
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
