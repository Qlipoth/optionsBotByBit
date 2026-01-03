import { RestClientV5 } from 'bybit-api';
import type { TickerData } from '../types.js';
import { parseOptionSymbol } from '../utils.js';

let bybitClient: RestClientV5 | null = null;

type InitBybitClientParams = {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
  demoTrading?: boolean;
};

export function initBybitClient(config: InitBybitClientParams): RestClientV5 {
  if (!bybitClient) {
    bybitClient = new RestClientV5({
      key: config.apiKey,
      secret: config.apiSecret,
      testnet: config.testnet || false,
      demoTrading: config.demoTrading || false,
    });
  }
  return bybitClient;
}

export function getBybitClient(): RestClientV5 {
  if (!bybitClient) {
    throw new Error('Bybit client is not initialized. Call initBybitClient first.');
  }
  return bybitClient;
}

// Получение списка опционов
export async function getOptionsInstruments() {
  const client = getBybitClient();
  return client.getInstrumentsInfo({
    category: 'option',
  });
}

// Получение стакана цен для опциона
export async function getOptionOrderBook(symbol: string) {
  const client = getBybitClient();
  return client.getOrderbook({
    category: 'option',
    symbol,
    limit: 25, // Количество уровней стакана
  });
}

// Получение греков и волатильности
export async function getOptionTicker(symbol: string): Promise<TickerData | null> {
  const client = getBybitClient();
  const result = await client.getTickers({
    category: 'option',
    symbol,
  });

  // Возвращаем только нужные данные
  const ticker = result.result.list?.[0];
  debugger;
  if (!ticker) return null;

  return {
    symbol: ticker.symbol,
    bid: ticker.bid1Price,
    ask: ticker.ask1Price,
    markPrice: ticker.markPrice,
    iv: ticker.markIv, // Подразумеваемая волатильность
    delta: ticker.delta,
    gamma: ticker.gamma,
    vega: ticker.vega,
    theta: ticker.theta,
    openInterest: ticker.openInterest,
    volume24h: ticker.volume24h,
  };
}

// Поиск спредов для заданного страйка
export async function findSpreads(baseCoin: string, expiryDate: string, strikePrice: string) {
  const client = getBybitClient();

  // Получаем все опционы для базового актива
  const allOptions = await client.getInstrumentsInfo({
    category: 'option',
    baseCoin,
  });

  if (!allOptions.result?.list) {
    throw new Error('Failed to fetch options data');
  }

  const optionsAtStrike = allOptions.result.list.filter(opt => {
    const parsed = parseOptionSymbol(opt.symbol);
    if (!parsed) return false;

    return (
      parsed.baseCoin === baseCoin &&
      parsed.expiry === expiryDate &&
      parsed.strike === Number(strikePrice)
    );
  });

  // Разделяем на коллы и путы
  const calls = optionsAtStrike.filter(opt => opt.optionsType === 'Call');
  const puts = optionsAtStrike.filter(opt => opt.optionsType === 'Put');

  // Получаем данные по грекам для каждого опциона
  const enrichedCalls = await Promise.all(
    calls.map(async call => {
      const ticker = await getOptionTicker(call.symbol);
      return { ...call, greeks: ticker };
    })
  );

  const enrichedPuts = await Promise.all(
    puts.map(async put => {
      const ticker = await getOptionTicker(put.symbol);
      return { ...put, greeks: ticker };
    })
  );

  // Возвращаем данные для анализа спредов
  return {
    calls: enrichedCalls,
    puts: enrichedPuts,
    // Дополнительные расчеты можно добавить здесь
  };
}
