export interface TickerData {
  symbol: string;
  bid: string;
  ask: string;
  markPrice: string;
  iv: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
  openInterest: string;
  volume24h: string;
}

export type OptionType = 'Call' | 'Put';

export interface ParsedOption {
  symbol: string;
  baseCoin: string;
  expiry: string; // 27DEC24
  strike: number;
  type: OptionType;

  bid: number;
  ask: number;
  markPrice: number;
  iv: number;

  delta: number;
  gamma: number;
  vega: number;
  theta: number;

  openInterest: number;
  volume24h: number;
}

export interface BullCallSpread {
  baseCoin: string;
  expiry: string;

  buyStrike: number;
  sellStrike: number;

  cost: number;
  maxProfit: number;
  rr: number;

  delta: number; // Net delta of the spread
  probBuyITM: number;
  probMaxProfit: number;
  ev: number;

  iv: number;
}

export type BaseCoin = 'BTC' | 'ETH';
