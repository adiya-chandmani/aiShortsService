import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '서비스 소개',
  description: 'CLIMATE SWITCH는 경기 기후위성 데이터와 공간정보를 활용하여 도시 요소를 ON/OFF 했을 때 폭염·침수 위험이 어떻게 변하는지 시각화하는 체험형 지도 서비스입니다.',
  openGraph: {
    title: '서비스 소개 - CLIMATE SWITCH',
    description: 'CLIMATE SWITCH 서비스의 주요 기능과 사용 데이터를 소개합니다',
  },
};

const DATA_SOURCES = [
  { name: '폭염 체감온도 / 열환경지도', icon: '🌡️' },
  { name: '경기도 열쾌적성 평가', icon: '☀️' },
  { name: '녹지 현황도', icon: '🌳' },
  { name: '투수·불투수 유형 지도', icon: '🏗️' },
  { name: '침수흔적지도', icon: '💧' },
  { name: '극한호우 위험도 지수', icon: '🌧️' },
  { name: '무더위쉼터 POI', icon: '🏠' },
];

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-white to-green-50 transition-theme dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="animate-fade-in mb-8 lg:mb-12">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            CLIMATE SWITCH 소개
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            경기도 기후 위험도 시뮬레이션 서비스
          </p>
        </header>

        <div className="animate-slide-up space-y-8 lg:space-y-12">
          {/* 서비스 개요 */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              <span>📋</span> 서비스 개요
            </h2>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
              CLIMATE SWITCH는 경기 기후위성 데이터와 공간정보(지도)를 활용하여, 도시 요소(녹지·불투수면·쉼터 등)를
              ON/OFF 했을 때 폭염·침수 위험이 어떻게 변하는지 즉시 시각화하고 정량화하는 체험형 지도 서비스입니다.
            </p>
          </section>

          {/* 주요 기능 */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              <span>⚡</span> 주요 기능
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300" role="list">
              <li className="flex items-start gap-3">
                <span className="text-xl">🌡️</span>
                <span><strong>폭염 위험도 시뮬레이션:</strong> 녹지 감소, 불투수면 증가가 폭염에 미치는 영향 분석</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">🌊</span>
                <span><strong>침수 위험도 시뮬레이션:</strong> 도시 구조 변화가 침수에 미치는 영향 분석</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <span><strong>Before/After 비교:</strong> 시뮬레이션 전후 위험도 변화를 수치와 그래프로 비교</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">📈</span>
                <span><strong>결과 리포트:</strong> 실험 결과를 정리한 리포트와 정책적 시사점 제공</span>
              </li>
            </ul>
          </section>

          {/* 사용 데이터 */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              <span>📡</span> 사용 데이터
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              경기기후플랫폼 API를 통해 다음 데이터를 활용합니다:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DATA_SOURCES.map((source) => (
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
              href="/simulator"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
            >
              시뮬레이션 시작하기
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

