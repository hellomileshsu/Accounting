import type { Quote } from '../types';

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;

export const isFinnhubConfigured = Boolean(API_KEY);

const cache = new Map<string, { at: number; quote: Quote }>();
const TTL_MS = 60_000;

export async function getQuote(symbol: string): Promise<Quote> {
  if (!API_KEY) throw new Error('尚未設定 VITE_FINNHUB_API_KEY');
  const key = symbol.toUpperCase();
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < TTL_MS) return hit.quote;

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(key)}&token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  const data = (await res.json()) as Quote;
  if (!data || typeof data.c !== 'number' || data.c === 0) {
    throw new Error(`找不到報價：${key}`);
  }
  cache.set(key, { at: now, quote: data });
  return data;
}
