import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Finsight Auto - AI 财报自动化下载平台',
  description: 'AI行业上市公司财报自动化下载与分析系统，覆盖24家AI龙头企业',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
