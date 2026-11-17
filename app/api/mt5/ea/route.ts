import { NextRequest, NextResponse } from 'next/server';
import { generateMQL5ExpertAdvisor } from '@/lib/mql5-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const webhookUrl = `${protocol}://${host}/api/mt5/webhook`;
  const secretKey = process.env.MT5_WEBHOOK_SECRET || 'apex_live_sec_9934af89';

  const mql5Code = generateMQL5ExpertAdvisor(webhookUrl, secretKey);

  return new NextResponse(mql5Code, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ApexVisionAI_Copilot.mq5"',
    },
  });
}
