import { scanOptions } from './scanner.js';
import { formatSpreadMessage } from '../utils.js';
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

        if (spreads.length > 0) {
          const msg = formatSpreadMessage(spreads);
          await onMessage(msg);
        }
      } catch (e) {
        console.error('[OptionsWatcher] Scan error:', e);
      }
    },
    10 * 60 * 1000 // 10 minutes
  );

  // 👇 ВАЖНО: возвращаем stop-функцию
  return () => {
    console.log('🛑 Options watcher stopped');
    stopped = true;
    clearInterval(interval);
  };
}
