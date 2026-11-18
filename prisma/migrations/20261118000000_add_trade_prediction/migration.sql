-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'PRO',
    "credits" INTEGER NOT NULL DEFAULT 50,
    "mt5Account" TEXT DEFAULT '8920194',
    "mt5Server" TEXT DEFAULT 'MetaQuotes-Demo',
    "mt5Connected" BOOLEAN NOT NULL DEFAULT true,
    "webhookToken" TEXT DEFAULT 'apex_live_sec_9934af89',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "asset" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "marketBias" TEXT NOT NULL,
    "tradeRecommendation" TEXT NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "takeProfit1" REAL NOT NULL,
    "takeProfit2" REAL NOT NULL,
    "riskRewardRatio" TEXT NOT NULL,
    "keyConfluences" TEXT NOT NULL,
    "invalidationCondition" TEXT NOT NULL,
    "analysisSummary" TEXT NOT NULL,
    "chartImageUrl" TEXT,
    "rawVisionOutput" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mt5Executed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Signal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "signalId" TEXT,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "volume" REAL NOT NULL DEFAULT 0.5,
    "entryPrice" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "takeProfit" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXECUTED',
    "mt5Ticket" TEXT,
    "responseMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExecutionLog_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradePrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "setupType" TEXT NOT NULL,
    "bias" TEXT NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "tp1" REAL NOT NULL,
    "tp2" REAL NOT NULL,
    "sessionName" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TradePrediction_asset_timeframe_idx" ON "TradePrediction"("asset", "timeframe");

