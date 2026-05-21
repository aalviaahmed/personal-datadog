"use client";

import { FormEvent, useState } from "react";

type StockData = {
  symbol: string;
  shortName: string;
  longName: string | null;
  exchange: string | null;
  currency: string;
  price: {
    regularMarketPrice: number | null;
    regularMarketChange: number | null;
    regularMarketChangePercent: number | null;
    regularMarketPreviousClose: number | null;
    regularMarketOpen: number | null;
    regularMarketDayHigh: number | null;
    regularMarketDayLow: number | null;
    regularMarketVolume: number | null;
  };
  stats: {
    marketCap: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    epsTrailingTwelveMonths: number | null;
    dividendYield: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    beta: number | null;
  };
  profile: {
    sector: string | null;
    industry: string | null;
    website: string | null;
    country: string | null;
    fullTimeEmployees: number | null;
    longBusinessSummary: string | null;
  };
  news: Array<{
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: string | number | Date;
  }>;
};

function formatMoney(value: number | null, currency = "USD") {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value: number | null, opts: Intl.NumberFormatOptions = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", opts).format(value);
}

function formatLargeNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toString();
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState<StockData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(ticker)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to fetch data.");
      } else {
        setData(json as StockData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  const change = data?.price.regularMarketChange ?? 0;
  const isUp = change >= 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Stock Summary</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter a ticker to see live performance, key stats, and recent news.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. AAPL, DDOG, MSFT"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !symbol.trim()}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2"
          >
            {loading ? "Loading…" : "Search"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {data.exchange ?? "—"}
                  </div>
                  <h2 className="text-2xl font-semibold mt-1">
                    {data.shortName}{" "}
                    <span className="text-zinc-500 dark:text-zinc-400 font-normal">({data.symbol})</span>
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold tabular-nums">
                    {formatMoney(data.price.regularMarketPrice, data.currency)}
                  </div>
                  <div className={`text-sm font-medium tabular-nums ${isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {isUp ? "▲" : "▼"} {formatMoney(Math.abs(change), data.currency)} ({formatPercent(data.price.regularMarketChangePercent)})
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-lg font-semibold mb-4">Key statistics</h3>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Previous close" value={formatMoney(data.price.regularMarketPreviousClose, data.currency)} />
                <Stat label="Open" value={formatMoney(data.price.regularMarketOpen, data.currency)} />
                <Stat label="Day high" value={formatMoney(data.price.regularMarketDayHigh, data.currency)} />
                <Stat label="Day low" value={formatMoney(data.price.regularMarketDayLow, data.currency)} />
                <Stat label="Volume" value={formatNumber(data.price.regularMarketVolume)} />
                <Stat label="Market cap" value={formatLargeNumber(data.stats.marketCap)} />
                <Stat label="P/E (TTM)" value={formatNumber(data.stats.trailingPE, { maximumFractionDigits: 2 })} />
                <Stat label="Forward P/E" value={formatNumber(data.stats.forwardPE, { maximumFractionDigits: 2 })} />
                <Stat label="EPS (TTM)" value={formatNumber(data.stats.epsTrailingTwelveMonths, { maximumFractionDigits: 2 })} />
                <Stat label="Div yield" value={data.stats.dividendYield != null ? formatPercent(data.stats.dividendYield * 100) : "—"} />
                <Stat label="52w high" value={formatMoney(data.stats.fiftyTwoWeekHigh, data.currency)} />
                <Stat label="52w low" value={formatMoney(data.stats.fiftyTwoWeekLow, data.currency)} />
              </dl>
            </section>

            {(data.profile.longBusinessSummary || data.profile.sector) && (
              <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <h3 className="text-lg font-semibold mb-3">About</h3>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 flex flex-wrap gap-x-4 gap-y-1">
                  {data.profile.sector && <span><strong>Sector:</strong> {data.profile.sector}</span>}
                  {data.profile.industry && <span><strong>Industry:</strong> {data.profile.industry}</span>}
                  {data.profile.country && <span><strong>HQ:</strong> {data.profile.country}</span>}
                  {data.profile.fullTimeEmployees && <span><strong>Employees:</strong> {formatNumber(data.profile.fullTimeEmployees)}</span>}
                  {data.profile.website && (
                    <a href={data.profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Website ↗
                    </a>
                  )}
                </div>
                {data.profile.longBusinessSummary && (
                  <p className="text-sm leading-relaxed">{data.profile.longBusinessSummary}</p>
                )}
              </section>
            )}

            {data.news.length > 0 && (
              <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <h3 className="text-lg font-semibold mb-3">Recent news</h3>
                <ul className="space-y-3">
                  {data.news.map((item, i) => (
                    <li key={i}>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="block group">
                        <div className="text-sm font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {item.title}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.publisher}
                          {item.providerPublishTime && ` · ${new Date(item.providerPublishTime).toLocaleString()}`}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-sm font-medium tabular-nums mt-0.5">{value}</dd>
    </div>
  );
}
