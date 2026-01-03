import type { BaseCoin, BullCallSpread, OptionType, ParsedOption, TickerData } from './types.js';

export function formatSpreadMessage(spreads: BullCallSpread[]): string {
  if (!spreads.length) return '🤷 No good spreads found at the moment.';

  return spreads
    .map(s => {
      const roi = ((s.maxProfit / s.cost) * 100).toFixed(0);
      const probBuy = (s.probBuyITM * 100).toFixed(0);
      const probMax = (s.probMaxProfit * 100).toFixed(0);

      return `
💎 *${s.baseCoin} Bull Call Spread*
📅 Expiry: ${s.expiry}

🔹 Buy: ${s.buyStrike} Call
🔸 Sell: ${s.sellStrike} Call

💸 Cost: $${s.cost.toFixed(2)}
🎯 Max Profit: $${s.maxProfit.toFixed(2)}
⚖️ Risk/Reward: 1:${s.rr.toFixed(2)}
📊 EV: $${s.ev.toFixed(2)}
🚀 Potential ROI: ${roi}%

🎲 Prob. Buy ITM: ~${probBuy}%
🏁 Prob. Max Profit: ~${probMax}%
      `.trim();
    })
    .join('\n\n' + '─'.repeat(20) + '\n\n');
}

export function parseOptionSymbol(symbol: string) {
  const parts = symbol.split('-');
  if (parts.length < 4) return null;

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

  // Relaxed: Allow one-sided markets (e.g. only Ask or only Bid)
  if (bid === 0 && ask === 0) return null;

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
