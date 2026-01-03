import type { BullCallSpread, ParsedOption } from '../types.js';

export function buildBullCallSpreads(options: ParsedOption[], feeRate = 0): BullCallSpread[] {
  const calls = options.filter(o => o.type === 'Call');

  const byExpiry = new Map<string, ParsedOption[]>();
  for (const opt of calls) {
    if (!byExpiry.has(opt.expiry)) byExpiry.set(opt.expiry, []);
    byExpiry.get(opt.expiry)!.push(opt);
  }

  const spreads: BullCallSpread[] = [];

  for (const [expiry, chain] of byExpiry.entries()) {
    const sorted = chain.sort((a, b) => a.strike - b.strike);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const buy = sorted[i]!;
        const sell = sorted[j]!;

        // 1. Liquidity checks
        if (buy.ask === 0 || sell.bid === 0) continue;
        
        // Skip low OI (ghost options)
        if (buy.openInterest < 0.1 || sell.openInterest < 0.1) continue;

        // 3. Probability Check (Delta)
        // Buy Leg: > 0.30 (approx 30% chance ITM)
        // User requested separation.
        const probBuyITM = buy.delta;
        const probMaxProfit = sell.delta; // sell.delta is approx prob of price > sell strike

        if (probBuyITM < 0.30) continue;
        if (probMaxProfit < 0.10) continue; // sell.delta >= 0.1 as requested

        // 2. Spread width check (avoid massive slippage)
        const buySpread = (buy.ask - buy.bid) / buy.markPrice;
        const sellSpread = (sell.ask - sell.bid) / sell.markPrice;
        
        if (buySpread > 0.3 || sellSpread > 0.3) continue;

        const rawCost = buy.ask - sell.bid;
        if (rawCost <= 0) continue; // Credit spread or broken market data

        const openFees = (buy.ask + sell.bid) * feeRate;
        const cost = rawCost + openFees;

        const width = sell.strike - buy.strike;
        
        // 4. Spread Structure Check
        // Width shouldn't be too wide relative to strike (e.g. max 20-25%)
        if (width / buy.strike > 0.25) continue;

        const maxProfit = width - cost;
        if (maxProfit <= 0) continue;

        const rr = maxProfit / cost;
        // User requested RR <= 6 (no lottos)
        // And we usually want RR > 1.5 or so for a spread to be worth it
        if (rr < 1.5 || rr > 6) continue;

        // EV Calculation
        // Simplified: (Prob_Max_Profit * Max_Profit) - (Prob_Loss * Cost)
        // Prob_Loss approximated as 1 - Prob_Max_Profit (Binary model)
        const ev = (probMaxProfit * maxProfit) - ((1 - probMaxProfit) * cost);

        if (ev <= 0) continue;
        
        // EV Efficiency Check: EV should be at least 10% of risk (Cost)
        if (ev / cost < 0.1) continue;

        spreads.push({
          baseCoin: buy.baseCoin,
          expiry,

          buyStrike: buy.strike,
          sellStrike: sell.strike,

          cost,
          maxProfit,
          rr,

          delta: buy.delta - sell.delta,
          probBuyITM,
          probMaxProfit,
          ev,
          iv: buy.iv,
        });
      }
    }
  }

  return spreads;
}
