import { NextRequest } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return Response.json({ error: "Missing 'symbol' query parameter." }, { status: 400 });
  }

  try {
    const [quote, summary, searchResult] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: ["assetProfile", "summaryDetail", "defaultKeyStatistics", "price"],
      }),
      yahooFinance.search(symbol, { newsCount: 6, quotesCount: 0 }),
    ]);

    if (!quote || !quote.regularMarketPrice) {
      return Response.json({ error: `No data found for symbol '${symbol}'.` }, { status: 404 });
    }

    const news = (searchResult.news ?? []).map((n) => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      providerPublishTime: n.providerPublishTime,
    }));

    return Response.json({
      symbol: quote.symbol,
      shortName: quote.shortName ?? quote.longName ?? quote.symbol,
      longName: quote.longName ?? null,
      exchange: quote.fullExchangeName ?? quote.exchange ?? null,
      currency: quote.currency ?? "USD",
      price: {
        regularMarketPrice: quote.regularMarketPrice ?? null,
        regularMarketChange: quote.regularMarketChange ?? null,
        regularMarketChangePercent: quote.regularMarketChangePercent ?? null,
        regularMarketPreviousClose: quote.regularMarketPreviousClose ?? null,
        regularMarketOpen: quote.regularMarketOpen ?? null,
        regularMarketDayHigh: quote.regularMarketDayHigh ?? null,
        regularMarketDayLow: quote.regularMarketDayLow ?? null,
        regularMarketVolume: quote.regularMarketVolume ?? null,
      },
      stats: {
        marketCap: quote.marketCap ?? null,
        trailingPE: quote.trailingPE ?? summary.summaryDetail?.trailingPE ?? null,
        forwardPE: quote.forwardPE ?? summary.summaryDetail?.forwardPE ?? null,
        epsTrailingTwelveMonths: quote.epsTrailingTwelveMonths ?? null,
        dividendYield: summary.summaryDetail?.dividendYield ?? null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
        beta: summary.summaryDetail?.beta ?? summary.defaultKeyStatistics?.beta ?? null,
      },
      profile: {
        sector: summary.assetProfile?.sector ?? null,
        industry: summary.assetProfile?.industry ?? null,
        website: summary.assetProfile?.website ?? null,
        country: summary.assetProfile?.country ?? null,
        fullTimeEmployees: summary.assetProfile?.fullTimeEmployees ?? null,
        longBusinessSummary: summary.assetProfile?.longBusinessSummary ?? null,
      },
      news,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const notFound = /not found|no fundamentals|HTTP 404/i.test(message);
    return Response.json(
      { error: notFound ? `Symbol '${symbol}' not found.` : `Failed to fetch data: ${message}` },
      { status: notFound ? 404 : 500 },
    );
  }
}
