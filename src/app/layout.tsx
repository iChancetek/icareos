
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://icareos.tech'),
  title: 'iCareOS by ChanceTEK',
  description: 'AI-Native Clinical Operating System — iCareOS by ChanceTEK. Modular agentic AI for clinical documentation, imaging, risk, billing and care coordination.',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: 'iCareOS by ChanceTEK',
    url: 'https://icareos.tech',
    title: 'iCareOS by ChanceTEK',
    description: 'AI-Native Clinical Operating System — modular agentic AI for healthcare.',
    type: 'website',
  },
  appleWebApp: {
    title: 'iCareOS',
    capable: true,
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
