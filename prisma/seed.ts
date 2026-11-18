import { PrismaClient } from '@prisma/client';
import { SAMPLE_CHARTS } from '../lib/sample-charts';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Apex Vision AI database...');

  // Create or update default Demo User
  const user = await prisma.user.upsert({
    where: { email: 'trader@apexvisionai.io' },
    update: {},
    create: {
      email: 'trader@apexvisionai.io',
      name: 'Apex Sovereign Trader',
      tier: 'PRO',
      credits: 48,
      mt5Account: '8920194',
      mt5Server: 'MetaQuotes-Demo',
      mt5Connected: true,
      webhookToken: 'apex_live_sec_9934af89',
    },
  });

  console.log(`User created: ${user.name} (${user.email})`);

  // Clear existing sample signals to prevent duplication
  await prisma.executionLog.deleteMany({});
  await prisma.signal.deleteMany({});
  await prisma.tradePrediction.deleteMany({});

  for (const sample of SAMPLE_CHARTS) {
    const analysis = sample.mockAnalysis;
    const signal = await prisma.signal.create({
      data: {
        userId: user.id,
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
        chartImageUrl: sample.thumbnailUrl,
        status: sample.id.includes('gold') ? 'ACTIVE' : sample.id.includes('btc') ? 'HIT_TP1' : 'ACTIVE',
        mt5Executed: true,
      },
    });

    await prisma.tradePrediction.create({
      data: {
        asset: analysis.asset,
        timeframe: analysis.timeframe,
        setupType: analysis.trade_execution?.setup_type || 'BUY SETUP',
        bias: analysis.bias,
        confidenceScore: analysis.confidence_score,
        entryPrice: analysis.entry_price,
        stopLoss: analysis.stop_loss,
        tp1: analysis.take_profit_1,
        tp2: analysis.take_profit_2,
        sessionName: 'New York Open',
        outcome: sample.id.includes('btc') ? 'WIN_TP1' : 'WIN_TP2',
      },
    });

    // Create execution log for MT5
    await prisma.executionLog.create({
      data: {
        userId: user.id,
        signalId: signal.id,
        symbol: signal.asset,
        action: signal.tradeRecommendation === 'BUY' ? 'BUY' : 'SELL',
        volume: 0.5,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit1,
        status: 'EXECUTED',
        mt5Ticket: `#${Math.floor(1000000 + Math.random() * 9000000)}`,
        responseMsg: `MT5 order filled via Webhook. Slippage 0.2 pts. Ticket logged.`,
      },
    });
  }

  console.log('Seed completed successfully with 4 realistic signals & MT5 logs.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
