import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apex Vision AI — Institutional SMC Chart Analysis & MT5 Signal Copilot',
  description:
    'Full-stack AI-powered financial chart analysis engine specializing in Smart Money Concepts (SMC), live MT5 execution bridge, and instant trade setups.',
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0B0B] text-[#F5EBE6] antialiased">
        {children}
      </body>
    </html>
  );
}
