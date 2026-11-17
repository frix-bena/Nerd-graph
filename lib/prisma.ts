import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// On Vercel / serverless environments, the project bundle is read-only.
// Copy the pre-seeded SQLite database to /tmp/dev.db if needed so reads & writes succeed.
function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless && (!envUrl || envUrl.startsWith('file:'))) {
    const tmpDbPath = '/tmp/dev.db';
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const bundledDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        if (fs.existsSync(bundledDbPath)) {
          fs.copyFileSync(bundledDbPath, tmpDbPath);
        }
      }
      return `file:${tmpDbPath}`;
    } catch (err) {
      console.warn('Could not copy SQLite DB to /tmp:', err);
    }
  }

  return envUrl || 'file:./dev.db';
}

const resolvedUrl = resolveDatabaseUrl();
if (resolvedUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedUrl ? { db: { url: resolvedUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

