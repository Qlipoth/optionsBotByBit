import type { BullCallSpread, ParsedOption } from '../types.js';

export function buildBullCallSpreads(options: ParsedOption[]): BullCallSpread[] {
  const calls = options.filter(o => o.type === 'Call');

  const byExpiry = new Map<string, ParsedOption[]>();
  for (const opt of calls) {
    if (!byExpiry.has(opt.expiry)) byExpiry.set(opt.expiry, []);
    byExpiry.get(opt.expiry)!.push(opt);
  }

  const spreads: BullCallSpread[] = [];

  for (const [expiry, chain] of byExpiry.entries()) {
    const sorted = chain.sort((a, b) => a.strike - b.strike);

    for (let i = 0; i < sorted.length - 1; i++) {
      const buy = sorted[i]!;
      const sell = sorted[i + 1]!;

      const cost = buy.ask - sell.bid;
      if (cost <= 0) continue;

      const width = sell.strike - buy.strike;
      const maxProfit = width - cost;
      if (maxProfit <= 0) continue;

      const rr = maxProfit / cost;
      if (rr < 1.8) continue;

      spreads.push({
        baseCoin: buy.baseCoin,
        expiry,

        buyStrike: buy.strike,
        sellStrike: sell.strike,

        cost,
        maxProfit,
        rr,

        delta: buy.delta - sell.delta,
        iv: buy.iv,
      });
    }
  }

  return spreads;
}
