'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  usePathname(); // keep as client component; pathname used by Header active state

  return (
    <>
      {/* 스킵 네비게이션 - 접근성 */}
      <a href="#main-content" className="skip-link">
        본문으로 바로가기
      </a>
      <Header />
      <main id="main-content">{children}</main>
    </>
  );
}

