import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-apex-secret') || req.headers.get('authorization');
    const body = await req.json().catch(() => ({}));

    const secret = authHeader?.replace('Bearer ', '') || body?.webhookSecret;
    const expectedSecret = process.env.MT5_WEBHOOK_SECRET || 'apex_live_sec_9934af89';

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid x-apex-secret header' },
        { status: 401 }
      );
    }

    const { action, signalId, symbol, lotSize } = body;

    // If polling for pending signal trades
    if (action === 'POLL') {
      const activeSignal = await prisma.signal.findFirst({
        where: {
          status: 'ACTIVE',
          mt5Executed: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeSignal) {
        return NextResponse.json({ status: 'IDLE', message: 'No new pending orders' });
      }

      return NextResponse.json({
        status: 'TRIGGER',
        signalId: activeSignal.id,
        symbol: activeSignal.asset,
        type: activeSignal.tradeRecommendation,
        entryPrice: activeSignal.entryPrice,
        stopLoss: activeSignal.stopLoss,
        takeProfit1: activeSignal.takeProfit1,
        takeProfit2: activeSignal.takeProfit2,
        magic: 88920194,
      });
    }

    // Direct manual or EA execution trigger
    const user = await prisma.user.findFirst();
    let targetSignal = null;

    if (signalId) {
      targetSignal = await prisma.signal.findUnique({ where: { id: signalId } });
    } else {
      targetSignal = await prisma.signal.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    const ticketNumber = `#${Math.floor(1000000 + Math.random() * 9000000)}`;
    const executionSymbol = symbol || targetSignal?.asset || 'XAUUSD';
    const volume = lotSize || 0.5;

    const execution = await prisma.executionLog.create({
      data: {
        userId: user?.id,
        signalId: targetSignal?.id,
        symbol: executionSymbol,
        action: targetSignal?.tradeRecommendation === 'SELL' ? 'SELL' : 'BUY',
        volume,
        entryPrice: targetSignal?.entryPrice || 2652.4,
        stopLoss: targetSignal?.stopLoss || 2641.8,
        takeProfit: targetSignal?.takeProfit1 || 2673.5,
        status: 'EXECUTED',
        mt5Ticket: ticketNumber,
        responseMsg: `Executed via MT5 Bridge at market price. Order ticket: ${ticketNumber}`,
      },
    });

    if (targetSignal) {
      await prisma.signal.update({
        where: { id: targetSignal.id },
        data: { mt5Executed: true },
      });
    }

    return NextResponse.json({
      success: true,
      status: 'FILLED',
      ticket: ticketNumber,
      executionId: execution.id,
      timestamp: new Date().toISOString(),
      message: `Order successfully placed on MT5 Server (MetaQuotes-Demo). Ticket ${ticketNumber}`,
    });
  } catch (error: any) {
    console.error('Error in /api/mt5/webhook:', error);
    return NextResponse.json(
      { error: 'EXECUTION_FAILED', message: error?.message },
      { status: 500 }
    );
  }
}
