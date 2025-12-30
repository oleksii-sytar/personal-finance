import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Personal Finance Manager - Executive Suite',
  description: 'Premium personal finance management with executive-grade insights and distilled control over your financial data. Experience the luxury of financial clarity.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system">
          <div className="min-h-screen bg-background-primary transition-colors duration-300">
            {children}
          </div>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}