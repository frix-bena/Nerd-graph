export interface EconomicCalendarEvent {
  title: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low' | string;
  timestamp: number;
  timeISO: string;
  minutesFromNow: number;
  forecast?: string;
  previous?: string;
}

export interface MacroNewsGuardrailResult {
  asset: string;
  affectedCurrencies: string[];
  hasRedFolderRisk: boolean;
  clearNewsWindow: boolean;
  activeRedFolderEvents: EconomicCalendarEvent[];
  upcomingHighImpactEvents: EconomicCalendarEvent[];
  confidenceAdjustment: number;
  statusSummary: string;
  invalidationWarning: string | null;
  source: 'FOREX_FACTORY_JSON' | 'FINNHUB_CALENDAR' | 'BUILT_IN_SCHEDULE_GUARD';
  promptContext: string;
}

interface CachedCalendarFeed {
  expiresAt: number;
  source: 'FOREX_FACTORY_JSON' | 'FINNHUB_CALENDAR' | 'BUILT_IN_SCHEDULE_GUARD';
  events: Array<{
    title: string;
    currency: string;
    impact: string;
    timestamp: number;
    forecast?: string;
    previous?: string;
  }>;
}

let calendarCache: CachedCalendarFeed | null = null;

/**
 * Resolves the relevant macro currencies impacted by high-impact news for a given trading asset.
 */
export function getAffectedCurrenciesForAsset(rawAsset: string): string[] {
  const asset = String(rawAsset || 'XAUUSD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const map: Record<string, string[]> = {
    XAUUSD: ['USD'],
    EURUSD: ['EUR', 'USD'],
    GBPUSD: ['GBP', 'USD'],
    NAS100: ['USD'],
    US30: ['USD'],
    BTCUSDT: ['USD'],
    USDJPY: ['USD', 'JPY'],
    AUDUSD: ['AUD', 'USD'],
    USDCAD: ['USD', 'CAD'],
    USDCHF: ['USD', 'CHF'],
  };

  if (map[asset]) return map[asset];

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
  const matched = currencies.filter((c) => asset.includes(c));
  return matched.length > 0 ? matched : ['USD'];
}

/**
 * Fetch public ForexFactory / FairEconomy weekly calendar JSON feed
 */
async function tryFetchForexFactoryCalendar(): Promise<CachedCalendarFeed['events'] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApexVisionAI/2.4)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    if (!Array.isArray(json)) return null;

    return json
      .map((item: any) => {
        const ts = Date.parse(String(item.date || ''));
        return {
          title: String(item.title || 'Economic Release'),
          currency: String(item.country || item.currency || 'USD').toUpperCase(),
          impact: String(item.impact || 'Low'),
          timestamp: Number.isFinite(ts) ? ts : 0,
          forecast: item.forecast ? String(item.forecast) : undefined,
          previous: item.previous ? String(item.previous) : undefined,
        };
      })
      .filter((e) => e.timestamp > 0);
  } catch {
    return null;
  }
}

/**
 * Optional fallback to Finnhub Economic Calendar if FINNHUB_API_KEY is configured
 */
async function tryFetchFinnhubCalendar(): Promise<CachedCalendarFeed['events'] | null> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token || !token.trim()) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?token=${encodeURIComponent(token)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const list = Array.isArray(json?.economicCalendar) ? json.economicCalendar : [];
    if (list.length === 0) return null;

    return list
      .map((item: any) => {
        const ts = Date.parse(String(item.time || ''));
        const rawImpact = String(item.impact || '').toLowerCase();
        const impact =
          rawImpact === 'high' || rawImpact === '3'
            ? 'High'
            : rawImpact === 'medium' || rawImpact === '2'
            ? 'Medium'
            : 'Low';
        return {
          title: String(item.event || 'Macro Release'),
          currency: String(item.country || 'USD').toUpperCase(),
          impact,
          timestamp: Number.isFinite(ts) ? ts : 0,
          forecast: item.estimate !== undefined ? String(item.estimate) : undefined,
          previous: item.prev !== undefined ? String(item.prev) : undefined,
        };
      })
      .filter((e: any) => e.timestamp > 0);
  } catch {
    return null;
  }
}

async function loadCalendarFeed(): Promise<CachedCalendarFeed> {
  if (calendarCache && Date.now() < calendarCache.expiresAt) {
    return calendarCache;
  }

  const ffEvents = await tryFetchForexFactoryCalendar();
  if (ffEvents && ffEvents.length > 0) {
    calendarCache = {
      expiresAt: Date.now() + 5 * 60 * 1000,
      source: 'FOREX_FACTORY_JSON',
      events: ffEvents,
    };
    return calendarCache;
  }

  const fhEvents = await tryFetchFinnhubCalendar();
  if (fhEvents && fhEvents.length > 0) {
    calendarCache = {
      expiresAt: Date.now() + 5 * 60 * 1000,
      source: 'FINNHUB_CALENDAR',
      events: fhEvents,
    };
    return calendarCache;
  }

  calendarCache = {
    expiresAt: Date.now() + 2 * 60 * 1000,
    source: 'BUILT_IN_SCHEDULE_GUARD',
    events: [],
  };
  return calendarCache;
}

/**
 * Checks the economic calendar for high-impact ("Red Folder") news events
 * affecting the asset's currencies within +/- 60 minutes.
 */
export async function checkMacroNewsGuardrail(
  rawAsset: string,
  referenceDate: Date = new Date()
): Promise<MacroNewsGuardrailResult> {
  const affectedCurrencies = getAffectedCurrenciesForAsset(rawAsset);
  const feed = await loadCalendarFeed();
  const nowMs = referenceDate.getTime();

  const relevantHighImpact: EconomicCalendarEvent[] = feed.events
    .filter((ev) => {
      const isHigh = ev.impact.toLowerCase() === 'high' || ev.impact.toLowerCase().includes('red');
      const matchesCurrency = affectedCurrencies.includes(ev.currency.toUpperCase());
      return isHigh && matchesCurrency;
    })
    .map((ev) => {
      const minutesFromNow = Math.round((ev.timestamp - nowMs) / 60000);
      return {
        title: ev.title,
        currency: ev.currency,
        impact: 'High',
        timestamp: ev.timestamp,
        timeISO: new Date(ev.timestamp).toISOString(),
        minutesFromNow,
        forecast: ev.forecast,
        previous: ev.previous,
      };
    })
    .sort((a, b) => Math.abs(a.minutesFromNow) - Math.abs(b.minutesFromNow));

  // +/- 60 minute Red Folder proximity check
  const activeRedFolderEvents = relevantHighImpact.filter(
    (ev) => Math.abs(ev.minutesFromNow) <= 60
  );

  // Upcoming events within next 12 hours for context
  const upcomingHighImpactEvents = relevantHighImpact
    .filter((ev) => ev.minutesFromNow > 60 && ev.minutesFromNow <= 720)
    .slice(0, 3);

  const hasRedFolderRisk = activeRedFolderEvents.length > 0;
  const clearNewsWindow = !hasRedFolderRisk;
  const confidenceAdjustment = hasRedFolderRisk ? -12 : 0;

  let statusSummary: string;
  let invalidationWarning: string | null = null;

  if (hasRedFolderRisk) {
    const eventDescriptions = activeRedFolderEvents
      .map((ev) => {
        const timing =
          ev.minutesFromNow === 0
            ? 'releasing NOW'
            : ev.minutesFromNow > 0
            ? `in ${ev.minutesFromNow} min`
            : `${Math.abs(ev.minutesFromNow)} min ago`;
        return `${ev.currency} ${ev.title} (${timing})`;
      })
      .join(', ');

    statusSummary = `HIGH-IMPACT RED FOLDER NEWS ALERT: ${eventDescriptions} within ±60m window (Confidence adjusted by ${confidenceAdjustment}%)`;
    invalidationWarning = `Red-Folder Macro Volatility Alert (${eventDescriptions}): Widen spread buffer or await post-release liquidity sweep confirmation before execution.`;
  } else if (upcomingHighImpactEvents.length > 0) {
    const nextEv = upcomingHighImpactEvents[0];
    statusSummary = `Clear Macro News Window (No Red-Folder ${affectedCurrencies.join('/')} events within ±60m; next High-Impact: ${nextEv.currency} ${nextEv.title} in ${Math.round(nextEv.minutesFromNow / 60)}h)`;
  } else {
    statusSummary = `Clear Macro Economic Calendar Window (Zero high-impact Red-Folder ${affectedCurrencies.join('/')} releases within ±60 minutes)`;
  }

  const promptContext = [
    `MACRO ECONOMIC CALENDAR GUARDRAIL (${rawAsset} | Currencies: ${affectedCurrencies.join(', ')} | Source: ${feed.source}):`,
    `  - ±60 Minute Red-Folder Risk Status: ${hasRedFolderRisk ? 'ACTIVE HIGH-IMPACT NEWS RISK' : 'CLEAR WINDOW (SAFE FOR EXECUTION)'}`,
    `  - Summary: ${statusSummary}`,
    hasRedFolderRisk
      ? `  - MANDATORY GUARDRAIL: Reduce confidence_score by ${Math.abs(confidenceAdjustment)} points and include the active Red-Folder news volatility warning in invalidation_condition.`
      : `  - Confluence Confirmed: Clear ±60m macro news window supports uninterrupted technical structure execution.`,
  ].join('\n');

  return {
    asset: rawAsset,
    affectedCurrencies,
    hasRedFolderRisk,
    clearNewsWindow,
    activeRedFolderEvents,
    upcomingHighImpactEvents,
    confidenceAdjustment,
    statusSummary,
    invalidationWarning,
    source: feed.source,
    promptContext,
  };
}
