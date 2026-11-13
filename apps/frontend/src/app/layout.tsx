import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlashReserve — High-Concurrency Flash Sale Platform',
  description: 'Enterprise flash-sale and inventory reservation engine with sub-2.5ms P95 latency.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}

