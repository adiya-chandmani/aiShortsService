import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '서비스 소개',
  description: 'FanCut AI는 아이디어 한 줄로 플롯부터 이미지·영상까지 이어서 15~30초 숏폼을 완성하는 IP 기반 2차 창작 제작 스튜디오(데모)입니다.',
  openGraph: {
    title: '서비스 소개 - FanCut AI',
    description: 'FanCut AI의 핵심 가치와 제작 플로우를 소개합니다',
  },
};

const FEATURES = [
  { name: '아이디어 한 줄 입력', icon: '✍️' },
  { name: '5~10컷 플롯 자동 생성', icon: '🧠' },
  { name: '컷 단위 수정/순서 조정', icon: '🧩' },
  { name: '컷별 이미지 생성/선택/재생성', icon: '🖼️' },
  { name: '컷별 3~5초 영상 생성', icon: '🎞️' },
  { name: '자동 병합/다운로드(데모)', icon: '✨' },
];

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-white to-green-50 transition-theme dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="animate-fade-in mb-8 lg:mb-12">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            FanCut AI 소개
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            IP 기반 2차 창작 숏폼 제작 스튜디오 (MVP 데모)
          </p>
        </header>

        <div className="animate-slide-up space-y-8 lg:space-y-12">
          {/* 서비스 개요 */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              <span>📋</span> 서비스 개요
            </h2>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
              FanCut AI는 팬이 짧은 아이디어만 입력하면, AI가 <strong>플롯 기획 → 이미지 생성 → 영상 생성</strong>을
              한 서비스 안에서 이어서 <strong>15~30초 숏폼 결과물</strong>을 빠르게 완성해주는 제작 스튜디오입니다.
              (현재 버전은 해커톤 MVP 데모를 위한 플레이스홀더 생성 로직을 포함합니다.)
            </p>
          </section>

          {/* 주요 기능 */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              <span>⚡</span> 주요 기능
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300" role="list">
              <li className="flex items-start gap-3">
                <span className="text-xl">🧠</span>
                <span><strong>AI 플롯 기획:</strong> 아이디어 기반으로 5~10컷 시나리오 생성</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">🖼️</span>
                <span><strong>AI 이미지 생성:</strong> 컷별 이미지 후보 생성, 선택/재생성</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">🎞️</span>
                <span><strong>AI 영상 생성:</strong> 이미지+컷 설명 기반 3~5초 컷 영상 생성</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">✨</span>
                <span><strong>자동 병합/내보내기:</strong> 기본 트랜지션·BGM·자막 템플릿으로 결과물 다운로드</span>
              </li>
            </ul>
          </section>

          {/* 제작 플로우 */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              <span>🧭</span> 제작 플로우
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              초보자도 따라갈 수 있도록 단계별로 “다음 단계로 이동”을 제공합니다:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FEATURES.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50"
                >
                  <span className="text-lg">{source.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{source.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="flex justify-center pt-4">
            <Link
              href="/studio/new"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
            >
              스튜디오 시작하기
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

