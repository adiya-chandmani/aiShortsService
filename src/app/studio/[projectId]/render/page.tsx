'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { WorkflowStepper } from '@/components/studio/WorkflowStepper';

function formatDuration(totalSec: number) {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return minutes > 0 ? `${minutes}분 ${seconds.toString().padStart(2, '0')}초` : `${seconds}초`;
}

function aspectRatioLabel(aspectRatio: '9:16' | '16:9') {
  return aspectRatio === '9:16' ? '세로형 9:16' : '가로형 16:9';
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

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
  const completedVideoCount = useMemo(
    () => cuts.filter((c) => Boolean(state.videosByCut[c.cutId]?.providerVideoId)).length,
    [cuts, state.videosByCut]
  );
  const estimatedDurationSec = useMemo(
    () => render?.totalDurationSec ?? cuts.reduce((total, cut) => total + cut.durationSec, 0),
    [cuts, render?.totalDurationSec]
  );
  const coverImage = useMemo(
    () => render?.thumbnailDataUrl ?? state.imagesByCut[cuts[0]?.cutId ?? '']?.candidates?.[0]?.imageDataUrl ?? '',
    [cuts, render?.thumbnailDataUrl, state.imagesByCut]
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

  const handleRender = async () => {
    setIsRendering(true);
    try {
      await renderFinalVideo({
        projectId,
        motionTypeDefault: 'zoom_in',
        bgmOn: false,
        subtitleTemplate: 'none',
      });
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 transition-theme dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 rounded-[28px] border border-slate-200/80 bg-white px-6 py-6 shadow-sm shadow-slate-200/40 dark:border-slate-700/70 dark:bg-slate-800 dark:shadow-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <span>✨</span> 최종 편집/결과
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{project.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                선택한 컷 영상을 병합해 최종 MP4를 생성합니다. 이 단계에서는 결과물 확인과 다운로드가 중심이며,
                실험 기능은 별도 후속 작업으로 분리되어 있습니다.
              </p>
              <div className="mt-4">
                <WorkflowStepper projectId={projectId} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/studio/${projectId}/videos`}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                ← 영상으로
              </Link>
              <button
                type="button"
                disabled={!allVideosPresent || isRendering}
                onClick={() => void handleRender()}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
              >
                {isRendering ? '최종 결과 생성 중...' : '최종 렌더 생성'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 dark:border-slate-700/70 dark:bg-slate-800 dark:shadow-none">
              <div className="text-base font-bold text-slate-900 dark:text-white">출력 설정</div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                현재 렌더 단계는 안정적인 결과 병합에 집중합니다. 미구현 기능은 비활성화되어 있으며, 결과물 확인과 다운로드가 우선입니다.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">출력 포맷</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                        최종 결과는 MP4로 정리되며, 현재 프로젝트 비율에 맞춰 병합됩니다.
                      </div>
                    </div>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                      활성
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">배경음악</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                        현재 MVP에서는 오디오 합성을 적용하지 않습니다. 결과물은 무음 MP4로 내려갑니다.
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      준비 중
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">자막 템플릿</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                        자막은 후속 단계에서 별도 옵션으로 제공할 예정입니다. 현재는 영상 병합 품질을 우선합니다.
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      준비 중
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm shadow-amber-100/60 dark:border-amber-800/50 dark:bg-slate-800 dark:shadow-none">
              <div className="text-base font-bold text-slate-900 dark:text-white">출력 요약</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">컷</div>
                  <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    {completedVideoCount}/{cuts.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">길이</div>
                  <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{formatDuration(estimatedDurationSec)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">비율</div>
                  <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{aspectRatioLabel(project.aspectRatio)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">포맷</div>
                  <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">MP4 다운로드</div>
                </div>
              </div>
            </section>
          </aside>

          <section className="rounded-[30px] bg-[#0f172a] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/10 dark:ring-white/10 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                  결과 미리보기
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">최종 결과를 가장 크게 확인하는 단계</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                  썸네일은 참고용으로 축소하고, 실제 성과물인 최종 영상을 메인 영역에 배치했습니다. 렌더 전에는 플레이어 위치에서 바로 결과 상태를 확인할 수 있습니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                <MetaChip label="프로젝트 비율" value={project.aspectRatio} />
                <MetaChip label="예상 길이" value={formatDuration(estimatedDurationSec)} />
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/30 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Final Output</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">
                      {render?.outputObjectUrl ? '렌더가 완료된 결과입니다.' : '렌더를 생성하면 이 위치에 최종 MP4가 표시됩니다.'}
                    </div>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
                    {render?.outputObjectUrl ? '준비 완료' : allVideosPresent ? '렌더 대기' : '소스 부족'}
                  </span>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-white/6 ring-1 ring-white/10">
                  {render?.outputObjectUrl ? (
                    <video
                      src={render.outputObjectUrl}
                      controls
                      className="mx-auto aspect-[9/16] max-h-[760px] w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[9/16] min-h-[520px] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-8 text-center">
                      <div>
                        <div className="text-lg font-bold text-white">최종 결과 플레이어</div>
                        <div className="mt-2 text-sm leading-6 text-white/60">
                          {allVideosPresent
                            ? '버튼을 눌러 최종 렌더를 생성하면 바로 재생할 수 있습니다.'
                            : '모든 컷 영상이 준비되어야 최종 렌더를 만들 수 있습니다.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Reference</div>
                  <div className="mt-2 text-sm font-semibold text-white/85">대표 썸네일</div>
                  <div className="mt-3 overflow-hidden rounded-[20px] ring-1 ring-white/10">
                    {coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImage} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-white/6 text-sm text-white/50">미리보기 없음</div>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Export Notes</div>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-white/65">
                    <p>렌더 단계에서는 준비된 컷 영상을 그대로 병합합니다.</p>
                    <p>오디오와 자막은 아직 포함되지 않으며, 결과는 MP4로 정리됩니다.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {render?.outputObjectUrl && (
                <a
                  href={render.outputObjectUrl}
                  download={`${project.title.replaceAll(' ', '-')}.mp4`}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  MP4 다운로드
                </a>
              )}
              <button
                type="button"
                disabled={!allVideosPresent || isRendering}
                onClick={() => void handleRender()}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRendering ? '최종 결과 생성 중...' : render?.outputObjectUrl ? '다시 렌더하기' : '지금 렌더 생성'}
              </button>
              <Link
                href="/studio/new"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
              >
                새 프로젝트 만들기
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
