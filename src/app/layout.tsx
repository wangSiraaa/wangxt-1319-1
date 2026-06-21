import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '公交换乘影响分析系统',
  description:
    '线网规划人员专用工具：选择施工路段，查看受影响线路和换乘站，分析高峰换乘压力和接驳需求。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
