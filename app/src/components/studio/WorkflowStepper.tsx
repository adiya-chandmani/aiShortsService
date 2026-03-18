'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { key: 'plot', label: '플롯', suffix: '/plot' },
  { key: 'images', label: '이미지', suffix: '/images' },
  { key: 'videos', label: '영상', suffix: '/videos' },
  { key: 'render', label: '렌더', suffix: '/render' },
] as const;

export function WorkflowStepper({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const currentIdx = Math.max(
    0,
    STEPS.findIndex((s) => pathname.includes(`/studio/${projectId}${s.suffix}`))
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, idx) => {
        const href = `/studio/${projectId}${s.suffix}`;
        const active = idx === currentIdx;
        const done = idx < currentIdx;
        return (
          <Link
            key={s.key}
            href={href}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              active
                ? 'bg-slate-900 text-white ring-slate-900/10 dark:bg-white dark:text-slate-900 dark:ring-white/20'
                : done
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700/40'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              active
                ? 'bg-white/15 text-white dark:bg-slate-900 dark:text-white'
                : done
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {done ? '✓' : idx + 1}
            </span>
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

