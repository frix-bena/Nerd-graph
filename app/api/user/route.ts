import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'trader@apexvisionai.io',
          name: 'Apex Sovereign Trader',
          tier: 'PRO',
          credits: 50,
          mt5Account: '8920194',
          mt5Server: 'MetaQuotes-Demo',
          mt5Connected: true,
          webhookToken: 'apex_live_sec_9934af89',
        },
      });
    }

    const signalCount = await prisma.signal.count();
    const executionCount = await prisma.executionLog.count();

    return NextResponse.json({
      user,
      stats: {
        totalSignals: signalCount,
        executedTrades: executionCount,
        winRate: '78.4%',
        avgRRR: '1:3.45',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    let user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        mt5Connected: body.mt5Connected !== undefined ? body.mt5Connected : user.mt5Connected,
        mt5Account: body.mt5Account || user.mt5Account,
        mt5Server: body.mt5Server || user.mt5Server,
        tier: body.tier || user.tier,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
