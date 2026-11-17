import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const asset = searchParams.get('asset');
    const bias = searchParams.get('bias');
    const status = searchParams.get('status');

    const where: any = {};
    if (asset && asset !== 'ALL') where.asset = asset;
    if (bias && bias !== 'ALL') where.marketBias = bias;
    if (status && status !== 'ALL') where.status = status;

    const signals = await prisma.signal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        executions: true,
      },
    });

    const parsedSignals = signals.map((s) => ({
      ...s,
      key_confluences: JSON.parse(s.keyConfluences || '[]'),
      market_bias: s.marketBias,
      trade_recommendation: s.tradeRecommendation,
      confidence_score: s.confidenceScore,
      entry_price: s.entryPrice,
      stop_loss: s.stopLoss,
      take_profit_1: s.takeProfit1,
      take_profit_2: s.takeProfit2,
      risk_reward_ratio: s.riskRewardRatio,
      invalidation_condition: s.invalidationCondition,
      analysis_summary: s.analysisSummary,
    }));

    return NextResponse.json({ signals: parsedSignals });
  } catch (error: any) {
    console.error('Error in /api/signals GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signals', message: error?.message },
      { status: 500 }
    );
  }
}
