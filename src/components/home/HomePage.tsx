'use client';

import Link from 'next/link';
import { useState } from 'react';

/* ============================================
   DESIGN DIRECTION: Creator Studio
   - Aesthetic: Modern, cinematic, tool-like
   - Display Font: Space Grotesk
   - Body Font: Plus Jakarta Sans
   - Colors: Sky Blue, Orange, Emerald
   - Motion: Staggered fade-ins, smooth transitions
   ============================================ */

// ============================================
// HERO SECTION (Elements 3-5: Title, CTA, Social Proof)
// ============================================
function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden">
      {/* Background with gradient mesh */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-sky-200/50 dark:bg-sky-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200/50 dark:bg-orange-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/30 dark:bg-emerald-500/5 rounded-full filter blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div
              className="animate-fade-in inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
              style={{ animationDelay: '0ms' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
              </span>
              아이디어 한 줄 → 15~30초 숏폼 완성
            </div>

            {/* Title - Element 3 */}
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              <span className="animate-fade-in inline-block" style={{ animationDelay: '100ms' }}>
                팬이
              </span>{' '}
              <span className="animate-fade-in inline-block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500" style={{ animationDelay: '200ms' }}>
                아이디어만
              </span>
              <span className="animate-fade-in inline-block" style={{ animationDelay: '300ms' }}>
                넣으면
              </span>
              <br />
              <span className="animate-fade-in inline-block" style={{ animationDelay: '400ms' }}>
                AI가
              </span>{' '}
              <span className="animate-fade-in inline-block text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500" style={{ animationDelay: '500ms' }}>
                숏폼을 완성해줘요
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="animate-fade-in max-w-xl text-lg text-slate-600 dark:text-slate-300 sm:text-xl"
              style={{ animationDelay: '600ms' }}
            >
              복잡한 프롬프트 없이도{' '}
              <span className="font-semibold text-slate-900 dark:text-white">플롯 → 이미지 → 영상</span>까지
              한 번에 이어집니다. 캐릭터 바이블, 스타일 규칙, 컷 단위 수정/재생성으로 일관성을 관리하세요.
            </p>

            {/* CTA Buttons - Element 4 */}
            <div
              className="animate-fade-in flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: '700ms' }}
            >
              <Link
                href="/studio/new"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40 hover:scale-105"
              >
                <span className="relative z-10">스튜디오 시작하기</span>
                <svg className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-sky-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white/80 px-8 py-4 text-lg font-semibold text-slate-700 backdrop-blur transition-all hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                서비스 소개
              </Link>
            </div>

          </div>

          {/* Right: Visual - Element 6 */}
          <div
            className="animate-fade-in relative"
            style={{ animationDelay: '400ms' }}
          >
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-2 shadow-2xl ring-1 ring-slate-200/50 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-700/50">
              <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-800">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-400">fancut-ai.app</div>
                </div>
                <div className="relative aspect-[4/3] bg-gradient-to-br from-sky-100 via-emerald-50 to-orange-50 dark:from-sky-900/30 dark:via-emerald-900/20 dark:to-orange-900/20">
                  {/* Studio mockup */}
                  <div className="absolute inset-4 rounded-lg bg-slate-200/50 dark:bg-slate-700/50">
                    <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-2xl bg-orange-400/60 blur-sm" />
                    <div className="absolute right-1/4 top-1/2 h-16 w-16 rounded-2xl bg-emerald-400/60 blur-sm" />
                    <div className="absolute bottom-1/4 left-1/3 h-24 w-24 rounded-2xl bg-red-400/60 blur-sm" />
                    <div className="absolute right-1/3 bottom-1/3 h-18 w-18 rounded-2xl bg-sky-400/60 blur-sm" />
                  </div>
                  {/* Control panel mockup */}
                  <div className="absolute right-4 top-4 w-40 space-y-2 rounded-lg bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-slate-800/90">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">플롯 → 이미지 → 영상</div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>6컷 생성</span>
                      <span>완료</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating stats */}
            <div className="absolute -bottom-4 -left-4 rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/50">
                  🧠
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">6컷</div>
                  <div className="text-xs text-slate-500">플롯 자동 생성</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-2xl dark:bg-sky-900/50">
                  🎞️
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">18초</div>
                  <div className="text-xs text-slate-500">숏폼 결과물</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// BENEFITS SECTION (Element 7)
// ============================================
const BENEFITS = [
  {
    icon: '🧠',
    title: 'AI 플롯 기획',
    description: '아이디어 한 줄로 5~10컷 시나리오를 구조적으로 생성합니다.',
    color: 'from-sky-500 to-cyan-500',
    bgColor: 'bg-sky-50 dark:bg-sky-900/30',
  },
  {
    icon: '🖼️',
    title: 'AI 이미지 생성',
    description: '컷별 이미지 후보를 만들고, 캐릭터/스타일 가이드를 바탕으로 톤을 맞춥니다.',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
  },
  {
    icon: '🎞️',
    title: 'AI 영상 생성',
    description: '선택 이미지를 3~5초 컷 영상으로 만들고 컷 단위로 재생성합니다.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    icon: '✨',
    title: '자동 병합/내보내기',
    description: '컷 영상을 mp4로 병합하고 다운로드하거나 업로드 단계로 넘깁니다.',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
  },
];

function BenefitsSection() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-100/50 via-transparent to-transparent dark:from-sky-900/20" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            주요 기능
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            제작 흐름을{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-500">
              한 번에 연결
            </span>
            하세요
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            여러 툴을 오가지 않고도, 컷 단위로 수정/재생성하며 완성도를 올릴 수 있어요.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-xl hover:-translate-y-1 dark:bg-slate-800 dark:ring-slate-700/50"
            >
              {/* Gradient border on hover */}
              <div className={`absolute inset-0 bg-gradient-to-r ${benefit.color} opacity-0 transition-opacity group-hover:opacity-5`} />

              <div className="relative flex gap-6">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${benefit.bgColor} text-3xl`}>
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// STATS SECTION (Additional Social Proof)
// ============================================
const STATS = [
  { value: '6', label: '기본 컷 수', suffix: '컷' },
  { value: '3', label: '컷 영상 길이', suffix: '초' },
  { value: '15~30', label: '최종 결과물', suffix: '초' },
  { value: '< 30', label: '첫 플롯', suffix: '초' },
];

function StatsSection() {
  return (
    <section className="py-16 bg-gradient-to-r from-sky-600 to-cyan-600 dark:from-sky-800 dark:to-cyan-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-white lg:text-5xl">
                {stat.value}
                <span className="text-sky-200">{stat.suffix}</span>
              </div>
              <div className="mt-2 text-sm text-sky-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ SECTION (Element 9)
// ============================================
const FAQS = [
  {
    question: '어떤 모델과 도구를 사용하나요?',
    answer: '플롯은 Gemini, 이미지는 Together AI, 컷 영상은 deAPI, 최종 병합은 ffmpeg로 처리합니다.',
  },
  {
    question: '컷 간 일관성은 어떻게 맞추나요?',
    answer: '프로젝트 단위 character bible과 style bible을 만들고, 컷별 프롬프트와 재생성, 인접 컷 문맥을 함께 사용합니다. 선택한 레퍼런스 이미지는 현재 첫 컷 기준으로 우선 활용되며 완전한 동일 얼굴 lock을 보장하는 방식은 아닙니다.',
  },
  {
    question: '사용하려면 무엇이 필요한가요?',
    answer: 'Node.js 환경과 Gemini, Together, deAPI 키가 필요합니다. 이미지와 영상 생성은 각 제공사의 사용량과 크레딧 정책을 따릅니다.',
  },
  {
    question: '결과를 저장하거나 공유할 수 있나요?',
    answer: '컷별 영상과 최종 결과물을 mp4로 다운로드할 수 있고, YouTube Shorts 업로드와 TikTok mock 업로드를 지원합니다.',
  },
  {
    question: '모바일에서도 사용할 수 있나요?',
    answer: '랜딩과 주요 화면은 반응형이지만, 실제 생성 작업과 업로드 검증은 데스크톱 환경이 더 안정적입니다.',
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 lg:py-32 bg-white dark:bg-slate-800">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 mb-6">
            <span>❓</span>
            자주 묻는 질문
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            궁금한 점이 있으신가요?
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-lg font-semibold text-slate-900 dark:text-white pr-4">
                  {faq.question}
                </span>
                <svg
                  className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-5 text-slate-600 dark:text-slate-400">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FINAL CTA SECTION (Element 10)
// ============================================
function FinalCTASection() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-sky-900 to-slate-900" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          지금 바로{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
            FanCut 스튜디오
          </span>
          을
          <br />
          시작해보세요
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          아이디어를 넣고, 컷을 고치고, 이미지와 영상을 생성해 15~30초 결과물을 내보내세요.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/studio/new"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-10 py-4 text-lg font-semibold text-slate-900 shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            스튜디오 시작하기
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            로컬 실행
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            MP4 다운로드
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            컷 단위 재생성
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FOOTER (Element 11)
// ============================================
function FooterSection() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl">🎬</span>
              <span className="text-xl font-bold">
                FanCut<span className="text-sky-400">AI</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm">
              아이디어 한 줄로 플롯부터 이미지·영상까지 이어서 숏폼을 완성하는 제작 스튜디오(데모)입니다.
            </p>
            <div className="mt-6 flex gap-4">
              {['github', 'twitter'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                  aria-label={social}
                >
                  {social === 'github' ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">서비스</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link href="/studio" className="hover:text-white transition-colors">스튜디오</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">소개</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm">
          <p>&copy; 2024 FanCut AI. IP 기반 2차 창작 숏폼 제작 플로우 데모.</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function HomePage() {
  return (
    <div className="transition-theme">
      <HeroSection />
      <BenefitsSection />
      <StatsSection />
      <FAQSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
}
