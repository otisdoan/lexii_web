import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phản hồi & Hỗ trợ - Lexii',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
