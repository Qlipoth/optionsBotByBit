import { getOptionsInstruments, getOptionTicker } from '../services/bybit.js';
import { normalizeOption } from '../utils.js';
import { buildBullCallSpreads } from '../strategies/bullCall.js';

export async function scanOptions(baseCoin: 'BTC' | 'ETH') {
  const instruments = await getOptionsInstruments();
  console.log('instruments:', JSON.stringify(instruments));

  const options = instruments.result.list;

  console.log('options:', JSON.stringify(options));

  const tickers = await Promise.all(options.map(o => getOptionTicker(o.symbol)));

  console.log('tickers:', JSON.stringify(tickers));

  const filteredTickers = tickers?.filter(el => !!el);
  if (!filteredTickers.length) {
    return [];
  }

  const normalized = options
    .map((opt, i) => normalizeOption(opt, filteredTickers[i]!))
    .filter(Boolean) as any[];

  console.log('normalized:', JSON.stringify(normalized));

  const spreads = buildBullCallSpreads(normalized);

  console.log('spreads:', JSON.stringify(spreads));

  return spreads
    .filter(s => s.delta > 0.25)
    .sort((a, b) => b.rr - a.rr)
    .slice(0, 3);
}
