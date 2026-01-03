import { scanOptions } from './scanner.js';
import type { BaseCoin } from '../types.js';

type MessageCallback = (msg: string) => Promise<void>;

export async function initializeOptionsWatcher(
  symbol: BaseCoin,
  onMessage: MessageCallback
): Promise<() => void> {
  let stopped = false;

  console.log('🧠 Options watcher started for: ', symbol);

  const interval = setInterval(
    async () => {
      if (stopped) return;

      try {
        // пока ограничимся ETH
        const spreads = await scanOptions(symbol);

        for (const spread of spreads) {
          const msg = `
🟢 *${spread.baseCoin} OPTIONS*
Expiry: ${spread.expiry}

Bull Call Spread
${spread.buyStrike}C / ${spread.sellStrike}C

Cost: $${spread.cost.toFixed(2)}
Max Profit: $${spread.maxProfit.toFixed(2)}
RR: ${spread.rr.toFixed(2)}
Delta: ${spread.delta.toFixed(2)}
`;

          await onMessage(msg);
        }
      } catch (e) {
        console.error('[OptionsWatcher] Scan error:', e);
      }
    },
    1 * 60 * 1000
  ); // раз в 10 минут

  // 👇 ВАЖНО: возвращаем stop-функцию
  return () => {
    console.log('🛑 Options watcher stopped');
    stopped = true;
    clearInterval(interval);
  };
}
