'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { MotionType } from '@/types/fancut';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { WorkflowStepper } from '@/components/studio/WorkflowStepper';

export default function RenderPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { getProject, getCuts, state, renderFinalVideo } = useFanCutStudio();

  const project = getProject(projectId);
  const cuts = getCuts(projectId).slice().sort((a, b) => a.order - b.order);
  const render = state.rendersByProject[projectId];

  const [isRendering, setIsRendering] = useState(false);

  const allVideosPresent = useMemo(
    () => cuts.length > 0 && cuts.every((c) => Boolean(state.videosByCut[c.cutId]?.providerVideoId)),
    [cuts, state.videosByCut]
  );

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">프로젝트를 찾을 수 없어요</h1>
          <Link href="/studio/new" className="mt-6 inline-flex rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white">
            프로젝트 시작하기
          </Link>
        </div>
      </div>
    );
  }

  const totalDurationSec = cuts.reduce((sum, cut) => sum + (cut.durationSec ?? 0), 0);
  const aspectRatioLabel = project.aspectRatio ?? '9:16';
  const resolutionLabel = project.resolution ?? '1080p';
  const motionTypeDefault: MotionType = 'zoom_in';
  const bgmOn = false;
  const subtitleTemplate: 'none' | 'basic' = 'none';

  const handleRender = async () => {
    setIsRendering(true);
    try {
      await renderFinalVideo({ projectId, motionTypeDefault, bgmOn, subtitleTemplate });
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 transition-theme dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <span aria-hidden="true">✨</span> 최종 결과
              </div>
              <h1 className="mt-2 truncate text-xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                선택한 컷 영상을 병합해 최종 MP4를 생성합니다.
              </p>
              <div className="mt-3">
                <WorkflowStepper projectId={projectId} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/studio/${projectId}/videos`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                ← 영상으로
              </Link>
              <button
                type="button"
                disabled={!allVideosPresent || isRendering}
                onClick={() => void handleRender()}
                className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
              >
                {isRendering ? '렌더 중…' : render?.outputObjectUrl ? '다시 렌더' : '렌더 생성'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left: output summary + future features */}
          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">출력 정보</h2>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">컷 수</span>
                <span className="font-semibold text-slate-900 dark:text-white">{cuts.length}개</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">예상 길이</span>
                <span className="font-semibold text-slate-900 dark:text-white">{totalDurationSec}초</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">비율</span>
                <span className="font-semibold text-slate-900 dark:text-white">{aspectRatioLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">해상도</span>
                <span className="font-semibold text-slate-900 dark:text-white">{resolutionLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">포맷</span>
                <span className="font-semibold text-slate-900 dark:text-white">MP4</span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">추가 편집(준비 중)</h3>
              <div className="mt-3 grid gap-2">
                {[
                  {
                    title: '배경음악(BGM)',
                    desc: '현재 MVP에서는 오디오 합성을 지원하지 않습니다.',
                  },
                  {
                    title: '자막/캡션',
                    desc: '현재 MVP에서는 자막 템플릿을 지원하지 않습니다.',
                  },
                  {
                    title: '트랜지션/템포',
                    desc: '현재 MVP에서는 컷 병합 중심으로 렌더합니다.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-3 opacity-80 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.desc}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        준비 중
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/studio/new"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                새 프로젝트
              </Link>
            </div>
          </section>

          {/* Right: big final result + small thumbnail */}
          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">최종 결과</h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">렌더가 완료되면 바로 재생/다운로드할 수 있어요.</p>
              </div>
              {render?.createdAt && (
                <div className="text-xs text-slate-500 dark:text-slate-400">생성: {new Date(render.createdAt).toLocaleString()}</div>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-9">
                <div className="overflow-hidden rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                  <div className="relative bg-[radial-gradient(1200px_circle_at_30%_0%,rgba(14,165,233,0.18),transparent_45%),radial-gradient(900px_circle_at_70%_10%,rgba(16,185,129,0.16),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.78),rgba(2,6,23,0.92))] p-4">
                    <div className="mx-auto w-full max-w-[420px]">
                      <div className="overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
                        {render?.outputObjectUrl ? (
                          <video
                            src={render.outputObjectUrl}
                            controls
                            className="aspect-[9/16] w-full bg-black object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[9/16] items-center justify-center bg-black/60 px-6 text-center text-sm text-slate-200">
                            {allVideosPresent ? (
                              <div>
                                <div className="font-semibold">렌더 준비 완료</div>
                                <div className="mt-1 text-xs text-slate-300">오른쪽 상단의 “렌더 생성”을 눌러 최종 결과를 만들어요.</div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold">아직 컷 영상이 부족해요</div>
                                <div className="mt-1 text-xs text-slate-300">이전 단계에서 모든 컷 영상을 생성해 주세요.</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {render?.outputObjectUrl && (
                    <a
                      href={render.outputObjectUrl}
                      download={`${project.title.replaceAll(' ', '-')}.mp4`}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      MP4 다운로드
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={!allVideosPresent || isRendering}
                    onClick={() => void handleRender()}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isRendering ? '렌더 중…' : '다시 렌더'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">썸네일</div>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      보조 정보
                    </span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={render?.thumbnailDataUrl ?? state.imagesByCut[cuts[0]?.cutId ?? '']?.candidates?.[0]?.imageDataUrl ?? ''}
                      alt=""
                      className="aspect-video w-full bg-slate-200 object-cover dark:bg-slate-700"
                    />
                  </div>
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                    첫 컷 이미지를 기반으로 생성됩니다.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
