/**
 * Generates an MQL5 Expert Advisor script (.mq5) customized with the user's webhook token and server URL.
 */
export function generateMQL5ExpertAdvisor(
  webhookUrl: string,
  secretKey: string,
  symbolDefault: string = 'XAUUSD',
  fixedLot: number = 0.5
): string {
  return `//+------------------------------------------------------------------+
//|                                             ApexVisionAI_Copilot.mq5 |
//|                                  Copyright 2026, Apex Vision AI  |
//|                                        https://apexvisionai.io   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Apex Vision AI"
#property link      "https://apexvisionai.io"
#property version   "1.00"
#property description "Automated Trade Execution Copilot for Apex Vision AI (SMC Signals)"
#property strict

#include <Trade\\Trade.mqh>

//--- Inputs
input group "=== Apex Vision AI Configuration ==="
input string   InpWebhookUrl     = "${webhookUrl}"; // Apex Signal Webhook URL
input string   InpSecretKey      = "${secretKey}";   // Secret Auth Key
input int      InpPollIntervalSec= 5;                 // Poll Interval in seconds
input ulong    InpMagicNumber    = 88920194;          // Magic Number
input double   InpDefaultLotSize = ${fixedLot};       // Fixed Lot Size (0 = Auto Risk)
input double   InpRiskPercent    = 1.0;               // Risk % per trade if lot size 0
input int      InpMaxSlippage    = 30;                // Max Slippage in Points
input bool     InpSplitTP        = true;              // Split order between TP1 and TP2

CTrade trade;
datetime lastCheckTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpMaxSlippage);
   trade.SetTypeFilling(ORDER_FILLING_IOC);
   
   Print(">>> Apex Vision AI Copilot initialized successfully.");
   Print(">>> Monitoring signals from: ", InpWebhookUrl);
   EventSetTimer(InpPollIntervalSec);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print(">>> Apex Vision AI Copilot terminated.");
}

//+------------------------------------------------------------------+
//| Timer event handler                                              |
//+------------------------------------------------------------------+
void OnTimer()
{
   CheckApexSignals();
}

//+------------------------------------------------------------------+
//| Poll or check Apex Vision AI Webhook                             |
//+------------------------------------------------------------------+
void CheckApexSignals()
{
   char postData[];
   char result[];
   string headers = "Content-Type: application/json\\r\\nx-apex-secret: " + InpSecretKey + "\\r\\n";
   string resultHeaders;
   int res;
   
   string jsonPayload = StringFormat("{\\"action\\":\\"POLL\\",\\"account\\":\\"%d\\",\\"server\\":\\"%s\\"}", 
                                     AccountInfoInteger(ACCOUNT_LOGIN), 
                                     AccountInfoString(ACCOUNT_SERVER));
   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1); // remove null terminator

   ResetLastError();
   res = WebRequest("POST", InpWebhookUrl, headers, 3000, postData, result, resultHeaders);
   
   if(res == 200)
   {
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      // Process JSON signal orders
      ParseAndExecuteSignal(response);
   }
   else if(res == -1)
   {
      Print("WebRequest failed. Error code: ", GetLastError());
      Print("Tip: Enable 'Allow WebRequest for listed URL' in MT5 Tools -> Options -> Expert Advisors");
   }
}

//+------------------------------------------------------------------+
//| Parse signal payload and execute trade                          |
//+------------------------------------------------------------------+
void ParseAndExecuteSignal(string json)
{
   // In production, parse JSON attributes: symbol, type, entry, sl, tp1, tp2
   if(StringFind(json, "\\"status\\":\\"TRIGGER\\"") >= 0)
   {
      Print("Apex Signal Detected: ", json);
      // Example Buy Execution:
      // trade.Buy(InpDefaultLotSize, _Symbol, 0, stopLoss, takeProfit1, "Apex Vision AI Long");
   }
}
`;
}
