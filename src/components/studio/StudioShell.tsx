'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

const SIDEBAR_SECTIONS: Array<{
  title?: string;
  items: Array<{ href: string; label: string; icon: React.ReactNode }>;
}> = [
  {
    items: [
      { href: '/studio/new', label: 'Gen space', icon: <span className="text-sm">✨</span> },
      { href: '/studio', label: 'Projects', icon: <span className="text-sm">📁</span> },
      { href: '/studio/settings', label: 'Settings', icon: <span className="text-sm">⚙️</span> },
    ],
  },
];

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200 group-hover:bg-slate-200 dark:bg-white/5 dark:ring-white/10 dark:group-hover:bg-white/10">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export function StudioShell({
  title,
  subtitle,
  children,
  topRight,
  bottomBar,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  topRight?: React.ReactNode;
  bottomBar?: React.ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();

  const activeMatcher = useMemo(() => {
    return (href: string) => {
      if (href === '/studio') return pathname === '/studio';
      return pathname === href || pathname.startsWith(`${href}/`);
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0b0b0d] dark:text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[240px] shrink-0 self-start border-r border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-[#0b0b0d] lg:block">
          <nav className="mt-2 space-y-6">
            {SIDEBAR_SECTIONS.map((sec, i) => (
              <div key={i}>
                {sec.title && (
                  <div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-slate-400 dark:text-white/40">
                    {sec.title}
                  </div>
                )}
                <div className="space-y-1">
                  {sec.items.map((it) => (
                    <NavItem
                      key={`${it.href}-${it.label}`}
                      href={it.href}
                      label={it.label}
                      icon={it.icon}
                      active={activeMatcher(it.href)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-[#0b0b0d]/80 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900 dark:text-white">{title}</div>
                {subtitle && <div className="mt-1 text-xs text-slate-500 dark:text-white/50">{subtitle}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href="/studio/settings"
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    activeMatcher('/studio/settings')
                      ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
                  }`}
                >
                  설정
                </Link>
                {topRight}
              </div>
            </div>
          </header>

          <div className="relative flex-1">
            <div className={contentClassName ?? 'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6'}>{children}</div>
            {bottomBar && (
              <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20">
                <div className="pointer-events-auto mx-auto w-full max-w-5xl px-4 pb-5 sm:px-6">
                  {bottomBar}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
