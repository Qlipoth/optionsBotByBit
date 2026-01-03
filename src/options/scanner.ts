import { getOptionsInstruments, getOptionTickers, getOptionsTakerFeeRate } from '../services/bybit.js';
import { normalizeOption } from '../utils.js';
import { buildBullCallSpreads } from '../strategies/bullCall.js';

export async function scanOptions(baseCoin: 'BTC' | 'ETH') {
  // 1. Получаем список всех инструментов (метаданные)
  const instruments = await getOptionsInstruments(baseCoin);
  const optionsList = instruments.result.list;
  // console.log(`🔍 Found ${optionsList.length} total option instruments for ${baseCoin}.`);

  const sampleSymbol = optionsList?.[0]?.symbol;
  const feeRate = await getOptionsTakerFeeRate(sampleSymbol);

  // 2. Получаем рыночные данные (тикеры) для всех опционов сразу
  const allTickers = await getOptionTickers(baseCoin);
  // console.log(`📊 Fetched ${allTickers.length} tickers for ${baseCoin}.`);

  // Создаем Map для быстрого поиска тикера по символу
  const tickerMap = new Map(allTickers.map(t => [t.symbol, t]));

  // 3. Собираем нормализованные данные
  const normalized = optionsList
    .map(opt => {
      const ticker = tickerMap.get(opt.symbol);
      if (!ticker) {
        return null;
      }
      return normalizeOption(opt, ticker);
    })
    .filter(Boolean) as any[];

  // console.log(`✅ Normalized ${normalized.length} valid options with market data.`);

  const spreads = buildBullCallSpreads(normalized, feeRate);
  // console.log(`💡 Generated ${spreads.length} potential spreads before final filtering.`);

  return spreads
    .filter(s => s.delta > 0) // Just ensure it's bullish
    .sort((a, b) => b.rr - a.rr)
    .slice(0, 3);
}
