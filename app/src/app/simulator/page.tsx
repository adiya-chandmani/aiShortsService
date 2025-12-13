import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { SimulatorClient } from '../../components/simulator';

function SimulatorLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-600 dark:text-gray-400">시뮬레이터 로딩 중...</p>
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: '기후 시뮬레이터',
  description: '경기도 31개 시군의 폭염·침수 위험도를 시뮬레이션하세요. 녹지, 불투수면, 쉼터 등 도시 요소를 조절하며 기후 위험 변화를 실시간으로 확인할 수 있습니다.',
  openGraph: {
    title: '기후 시뮬레이터 - CLIMATE SWITCH',
    description: '경기도 기후 위험도를 직접 시뮬레이션해보세요',
  },
};

export default function SimulatorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            CLIMATE SWITCH
          </h1>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          시뮬레이터
        </span>
      </header>
      <main className="flex-1">
        <Suspense fallback={<SimulatorLoading />}>
          <SimulatorClient />
        </Suspense>
      </main>
    </div>
  );
}

