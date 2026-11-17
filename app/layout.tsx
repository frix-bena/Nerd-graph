import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apex Vision AI — Institutional SMC Chart Analysis & MT5 Signal Copilot',
  description:
    'Clean, modern AI-powered financial chart analysis engine specializing in Smart Money Concepts (SMC), live MT5 execution bridge, and instant trade setups.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">
        {children}
      </body>
    </html>
  );
}
