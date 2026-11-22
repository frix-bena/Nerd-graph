import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality, Type, Behavior } from '@google/genai';
import { fetchMultiTimeframeMarketData, normalizeAssetSymbol, normalizeTimeframeKey } from '@/lib/tools/marketData';
import { runQuantEngine } from '@/lib/tools/quantEngine';
import { checkMacroNewsGuardrail } from '@/lib/tools/macroNews';

export const runtime = 'nodejs';

const LIVE_PRIMARY_MODEL = 'gemini-3.8-live';
const LIVE_FALLBACK_MODEL = 'gemini-3.1-flash-live-preview';

interface CachedEphemeralToken {
  token: string;
  expireTime: string;
  createdAt: number;
}

let cachedLiveToken: CachedEphemeralToken | null = null;
const TOKEN_CACHE_TTL_MS = 3 * 60 * 1000; // Reuse pre-warmed token for 3 minutes for instant connection

const APEX_LIVE_SYSTEM_INSTRUCTION = `You are Apex, the Apex Vision AI Live Institutional SMC Trading Co-Pilot. You are on a real-time two-way voice and screen-sharing call with an active trader watching their chart (TradingView, MetaTrader 5, or browser chart).

INTRODUCTION & IDENTITY PROTOCOL:
- Your name is Apex (the Apex Vision AI Live SMC Trading Co-Pilot).
- At the start of a session (or whenever greeted/asked who you are), immediately speak a warm, confident, concise spoken introduction (2 to 3 sentences): state your name ("Hi, I'm Apex, your Apex Vision AI Live SMC Trading Co-Pilot"), explain what you do ("I analyze your live shared trading charts in real time for Smart Money Concepts like Order Blocks, Fair Value Gaps, Break of Structure, and liquidity sweeps, verify multi-timeframe quant structure, and monitor red-folder macro news"), and invite the trader to share their screen or ask about any market setup.

CORE VOICE & CO-PILOT PROTOCOL:
1. CONCISE & NATURAL SPEECH: Keep spoken responses brief, sharp, and institutional (1 to 3 concise sentences per turn). Speak naturally like a senior prop-desk execution co-pilot sitting next to the trader. Never read out markdown formatting, bullet asterisks, or raw JSON.
2. LIVE SCREEN AWARENESS: The trader can share their screen at any time. When screen sharing starts or is active, you receive 1 FPS JPEG snapshots of their screen. Immediately acknowledge when they start sharing their screen, and read the visible ticker header, timeframe, Y-axis price scale, candlesticks or spot line, liquidity sweeps (BSL/SSL), Break of Structure (BOS), Change of Character (CHoCH), Fair Value Gaps (FVG), Order Blocks (OB), and support/resistance levels directly from the live video feed.
3. ANTI-HALLUCINATION MANDATE: Never guess or invent prices disconnected from the visible chart Y-axis or your live quantitative tools. When quoting entry, stop loss (buffered by 0.5x ATR), or take profit levels, state clear, exact numbers.
4. REAL-TIME QUANTITATIVE TOOLS:
   - Call "fetch_market_data" when the trader asks for live spot prices, multi-timeframe OHLCV ranges, 24h high/low, or MT5 bridge status on any asset (e.g. XAUUSD, EURUSD, NAS100, BTCUSDT, USDJPY, GBPUSD).
   - Call "analyze_market_structure" when the trader asks to verify bias (e.g. "Verify the 4H bias on Gold"), check BOS/CHoCH, unmitigated FVGs, Order Blocks, Premium/Discount Fibonacci OTE zones, ATR(14), RSI(14), EMA stack, or session liquidity sweeps.
   - Call "check_macro_news" when the trader asks about red-folder news, high-impact economic releases, or whether the macro calendar window is clear for execution.
5. BARGE-IN READY: Yield immediately if the trader interrupts or changes topic.`;

const LIVE_TOOL_DECLARATIONS = [
  {
    name: 'fetch_market_data',
    description:
      'Fetches live multi-timeframe OHLCV market data (4H, 1H, 15M, 5M), current spot price, 24h high/low range, and percentage change for a trading asset (e.g., XAUUSD, EURUSD, GBPUSD, USDJPY, NAS100, US30, SPX500, BTCUSDT, ETHUSDT).',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: Type.OBJECT,
      properties: {
        asset: {
          type: Type.STRING,
          description: 'Market ticker symbol such as XAUUSD, EURUSD, NAS100, BTCUSDT, USDJPY, GBPUSD.',
        },
        timeframe: {
          type: Type.STRING,
          description: 'Primary timeframe to inspect: 1M, 5M, 15M, 30M, 1H, 4H, or 1D.',
        },
      },
      required: ['asset'],
    },
  },
  {
    name: 'analyze_market_structure',
    description:
      'Runs the deterministic Institutional Smart Money Concepts (SMC) & Quantitative Engine on an asset and timeframe. Returns HTF (4H/1H) and LTF (15M/5M) directional bias, BOS/CHoCH breaks, unmitigated Fair Value Gaps (FVG), Order Blocks (OB), Premium/Discount Fibonacci OTE levels, ATR(14), RSI(14), Session VWAP, EMA 20/50/200 alignment, and session liquidity sweeps.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: Type.OBJECT,
      properties: {
        asset: {
          type: Type.STRING,
          description: 'Market ticker symbol such as XAUUSD (Gold), EURUSD, NAS100, BTCUSDT, USDJPY.',
        },
        timeframe: {
          type: Type.STRING,
          description: 'Timeframe to verify structure on, e.g., 5M, 15M, 1H, 4H, 1D.',
        },
      },
      required: ['asset'],
    },
  },
  {
    name: 'check_macro_news',
    description:
      'Checks the live macro economic calendar for high-impact Red-Folder news events affecting the asset or currency within a +/- 60 minute execution window and upcoming 12 hours.',
    behavior: Behavior.NON_BLOCKING,
    parameters: {
      type: Type.OBJECT,
      properties: {
        asset: {
          type: Type.STRING,
          description: 'Asset or currency to check for high-impact red-folder macro news (e.g., XAUUSD, USD, EURUSD, GBPUSD, NAS100).',
        },
      },
      required: ['asset'],
    },
  },
];

/**
 * GET /api/live-token
 * Generates a short-lived ephemeral token using process.env.GEMINI_API_KEY so the raw key
 * is never exposed to the browser client, along with the pre-configured Live API session setup.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY_MISSING',
        message:
          'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY to your environment variables to enable Go Live voice & screen co-pilot.',
      },
      { status: 503 }
    );
  }

  const requestedModel = request.nextUrl.searchParams.get('model')?.trim();
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';
  const preferredModel =
    requestedModel === LIVE_FALLBACK_MODEL ? LIVE_FALLBACK_MODEL : LIVE_PRIMARY_MODEL;

  const now = Date.now();

  if (
    !forceRefresh &&
    cachedLiveToken &&
    now - cachedLiveToken.createdAt < TOKEN_CACHE_TTL_MS
  ) {
    return NextResponse.json({
      token: cachedLiveToken.token,
      apiVersion: 'v1alpha',
      model: preferredModel,
      fallbackModel: LIVE_FALLBACK_MODEL,
      expireTime: cachedLiveToken.expireTime,
      cached: true,
      sessionConfig: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: APEX_LIVE_SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: LIVE_TOOL_DECLARATIONS }],
      },
    });
  }

  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 10 * 60 * 1000).toISOString();

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const authToken = await ai.authTokens.create({
      config: {
        uses: 25,
        expireTime,
        newSessionExpireTime,
      },
    });

    if (!authToken?.name) {
      throw new Error('Ephemeral token response did not include a token name.');
    }

    cachedLiveToken = {
      token: authToken.name,
      expireTime,
      createdAt: now,
    };

    return NextResponse.json({
      token: authToken.name,
      apiVersion: 'v1alpha',
      model: preferredModel,
      fallbackModel: LIVE_FALLBACK_MODEL,
      expireTime,
      sessionConfig: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: APEX_LIVE_SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: LIVE_TOOL_DECLARATIONS }],
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Failed to create ephemeral Live API token.';
    console.error('Error generating Gemini Live ephemeral token:', err);
    return NextResponse.json(
      {
        error: 'LIVE_TOKEN_CREATION_FAILED',
        message: errMsg,
      },
      { status: 502 }
    );
  }
}

/**
 * POST /api/live-token
 * Executes live quantitative tool calls (`fetch_market_data`, `analyze_market_structure`, `check_macro_news`)
 * requested by the Gemini Live model during an active voice/screen-share session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const toolName = String(body?.name || '').trim();
    const args = (body?.args && typeof body.args === 'object' ? body.args : {}) as Record<
      string,
      unknown
    >;

    const rawAsset = typeof args.asset === 'string' && args.asset.trim() ? args.asset.trim() : 'XAUUSD';
    const rawTimeframe =
      typeof args.timeframe === 'string' && args.timeframe.trim() ? args.timeframe.trim() : '15M';

    const asset = normalizeAssetSymbol(rawAsset);
    const timeframe = normalizeTimeframeKey(rawTimeframe);

    if (toolName === 'fetch_market_data') {
      const mtf = await fetchMultiTimeframeMarketData(asset, timeframe);
      const primary = mtf.timeframes[timeframe] || mtf.timeframes['15M'];
      const h4 = mtf.timeframes['4H'];
      const h1 = mtf.timeframes['1H'];
      const m15 = mtf.timeframes['15M'];
      const m5 = mtf.timeframes['5M'];

      return NextResponse.json({
        success: true,
        toolName,
        result: {
          asset: mtf.asset,
          primaryTimeframe: mtf.primaryTimeframe,
          currentSpotPrice: mtf.currentSpotPrice,
          source: mtf.source,
          mt5BridgeStatus: mtf.mt5BridgeStatus,
          fetchedAt: mtf.fetchedAt,
          primaryStats: {
            timeframe: primary.timeframe,
            latestPrice: primary.latestPrice,
            openPrice: primary.openPrice,
            high24h: primary.high24h,
            low24h: primary.low24h,
            changePercent: primary.changePercent,
          },
          multiTimeframeCloses: {
            '4H': h4 ? { close: h4.latestPrice, high: h4.high24h, low: h4.low24h, changePercent: h4.changePercent } : null,
            '1H': h1 ? { close: h1.latestPrice, high: h1.high24h, low: h1.low24h, changePercent: h1.changePercent } : null,
            '15M': m15 ? { close: m15.latestPrice, high: m15.high24h, low: m15.low24h, changePercent: m15.changePercent } : null,
            '5M': m5 ? { close: m5.latestPrice, high: m5.high24h, low: m5.low24h, changePercent: m5.changePercent } : null,
          },
        },
      });
    }

    if (toolName === 'analyze_market_structure') {
      const mtf = await fetchMultiTimeframeMarketData(asset, timeframe);
      const quant = runQuantEngine(mtf, timeframe);
      const snap = quant.snapshots[timeframe] || quant.snapshots['15M'];

      return NextResponse.json({
        success: true,
        toolName,
        result: {
          asset: quant.asset,
          requestedTimeframe: quant.primaryTimeframe,
          currentPrice: quant.currentPrice,
          htfBias_4H_1H: quant.htfBias,
          ltfBias_15M_5M: quant.ltfBias,
          overallQuantBias: quant.overallQuantBias,
          timeframeTrendBias: snap?.trendBias || quant.overallQuantBias,
          structureSummary: quant.structure.summary,
          swingHigh: quant.structure.swingHigh,
          swingLow: quant.structure.swingLow,
          lastBOS: quant.structure.lastBOS?.description || null,
          lastCHoCH: quant.structure.lastCHoCH?.description || null,
          unmitigatedFVGs: quant.unmitigatedFVGs.map((f) => ({
            type: f.type,
            range: `${f.bottom} - ${f.top}`,
            midpoint: f.midpoint,
          })),
          activeOrderBlocks: quant.activeOrderBlocks.map((o) => ({
            type: o.type,
            range: `${o.bottom} - ${o.top}`,
            meanThreshold: o.meanThreshold,
          })),
          fibonacci: {
            dealingRangeLow: quant.fibonacci.dealingRangeLow,
            dealingRangeHigh: quant.fibonacci.dealingRangeHigh,
            equilibrium50: quant.fibonacci.equilibrium50,
            currentPosition: quant.fibonacci.currentPosition,
            bullishDiscountOTE: quant.fibonacci.bullishDiscountOTE,
            bearishPremiumOTE: quant.fibonacci.bearishPremiumOTE,
          },
          indicators: {
            atr14: quant.atr14,
            halfAtrStopBuffer: quant.halfAtrBuffer,
            rsi14: quant.rsi14,
            rsiState: quant.rsiState,
            sessionVwap: quant.sessionVwap,
            emaStack: quant.ema.stackLabel,
          },
          session: {
            name: quant.session.sessionName,
            window: quant.session.sessionWindowLabel,
            isKillzone: quant.session.isKillzone,
            liquiditySweep: quant.session.liquiditySweep.description,
          },
          multiTimeframeBiasMap: {
            '4H': quant.snapshots['4H']?.trendBias,
            '1H': quant.snapshots['1H']?.trendBias,
            '15M': quant.snapshots['15M']?.trendBias,
            '5M': quant.snapshots['5M']?.trendBias,
          },
        },
      });
    }

    if (toolName === 'check_macro_news') {
      const news = await checkMacroNewsGuardrail(rawAsset);
      return NextResponse.json({
        success: true,
        toolName,
        result: {
          asset: news.asset,
          affectedCurrencies: news.affectedCurrencies,
          hasRedFolderRisk: news.hasRedFolderRisk,
          clearNewsWindow: news.clearNewsWindow,
          statusSummary: news.statusSummary,
          invalidationWarning: news.invalidationWarning,
          activeRedFolderEvents: news.activeRedFolderEvents,
          upcomingHighImpactEvents: news.upcomingHighImpactEvents,
          source: news.source,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'UNKNOWN_TOOL',
        message: `Unsupported Live tool call: ${toolName}`,
      },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution error';
    console.error('Error executing Live API tool call:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'TOOL_EXECUTION_ERROR',
        message,
      },
      { status: 500 }
    );
  }
}
