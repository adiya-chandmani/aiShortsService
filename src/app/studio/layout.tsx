import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Studio',
  description: 'FanCut AI Studio',
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}

