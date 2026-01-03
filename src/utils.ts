import type { BaseCoin, OptionType, ParsedOption, TickerData } from './types.js';

export function parseOptionSymbol(symbol: string) {
  const parts = symbol.split('-');
  if (parts.length !== 4) return null;

  const [base, expiry, strikeRaw, typeRaw] = parts;

  return {
    baseCoin: base as BaseCoin,
    expiry: expiry || '', // '27DEC24'
    strike: Number(strikeRaw), // 2600
    type: (typeRaw === 'C' ? 'Call' : 'Put') as OptionType,
  };
}

export function normalizeOption(opt: any, ticker: TickerData): ParsedOption | null {
  const parsed = parseOptionSymbol(opt.symbol);
  if (!parsed || !ticker) return null;

  const bid = Number(ticker.bid ?? 0);
  const ask = Number(ticker.ask ?? 0);

  if (!bid || !ask) return null;

  return {
    symbol: opt.symbol,
    ...parsed,

    bid,
    ask,
    markPrice: Number(ticker.markPrice),
    iv: Number(ticker.iv),

    delta: Number(ticker.delta),
    gamma: Number(ticker.gamma),
    vega: Number(ticker.vega),
    theta: Number(ticker.theta),

    openInterest: Number(ticker.openInterest),
    volume24h: Number(ticker.volume24h),
  };
}
