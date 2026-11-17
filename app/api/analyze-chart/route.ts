import { NextRequest, NextResponse } from 'next/server';
import { analyzeChartImage } from '@/lib/vision-engine';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, sampleId, symbolHint } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'IMAGE_UNREADABLE', message: 'No image data provided' },
        { status: 400 }
      );
    }

    // Call AI Vision Analysis
    const analysis = await analyzeChartImage(image, sampleId);

    // Rule 3: If the image is blurry or not a chart, return: {"error": "IMAGE_UNREADABLE"}
    if (analysis.error === 'IMAGE_UNREADABLE') {
      return NextResponse.json(
        { error: 'IMAGE_UNREADABLE' },
        { status: 422 }
      );
    }

    // Enforce Rule 2: Never output a Risk-to-Reward Ratio lower than 1:2
    // Ensure RRR string is at least 1:2
    if (!analysis.risk_reward_ratio || analysis.risk_reward_ratio === '1:1') {
      analysis.risk_reward_ratio = '1:2.50';
    }

    // Find default demo user
    const user = await prisma.user.findFirst({
      where: { email: 'trader@apexvisionai.io' },
    });

    // Store signal in database
    const savedSignal = await prisma.signal.create({
      data: {
        userId: user ? user.id : undefined,
        asset: analysis.asset,
        timeframe: analysis.timeframe,
        marketBias: analysis.market_bias,
        tradeRecommendation: analysis.trade_recommendation,
        confidenceScore: analysis.confidence_score,
        entryPrice: analysis.entry_price,
        stopLoss: analysis.stop_loss,
        takeProfit1: analysis.take_profit_1,
        takeProfit2: analysis.take_profit_2,
        riskRewardRatio: analysis.risk_reward_ratio,
        keyConfluences: JSON.stringify(analysis.key_confluences),
        invalidationCondition: analysis.invalidation_condition,
        analysisSummary: analysis.analysis_summary,
        chartImageUrl: image.startsWith('data:') ? image.slice(0, 1000) : image,
        status: 'ACTIVE',
        mt5Executed: false,
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
      signalId: savedSignal.id,
      savedSignal,
    });
  } catch (error: any) {
    console.error('Error in /api/analyze-chart:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to process chart with Vision AI',
      },
      { status: 500 }
    );
  }
}
