'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { WorkflowStepper } from '@/components/studio/WorkflowStepper';

function getImageErrorHint(message: string | null) {
  if (!message) return null;
  if (message.includes('TOGETHER_API_KEY')) {
    return 'app/.env.local에 TOGETHER_API_KEY를 추가하고 개발 서버를 다시 시작하세요.';
  }
  if (
    message.toLowerCase().includes('zero or negative balance')
    || message.toLowerCase().includes('with credits')
    || message.toLowerCase().includes('credits')
  ) {
    return 'Together 이미지 모델은 계정에 크레딧이 있어야 호출됩니다. 무료 모델 이름이어도 잔액이 0이면 막힐 수 있습니다.';
  }
  if (
    message.toLowerCase().includes('build tier')
    || message.toLowerCase().includes('tier requirement')
    || message.toLowerCase().includes('tier 1')
  ) {
    return 'Together 이미지 모델은 Build Tier 제한이 있습니다. 현재 키의 Tier로 해당 모델 접근이 가능한지 확인하세요.';
  }
  if (
    message.toLowerCase().includes('image_url')
    || message.toLowerCase().includes('reference image')
    || message.toLowerCase().includes('reference_images')
  ) {
    return '모델별 레퍼런스 파라미터가 다릅니다. FLUX.1-kontext 계열은 image_url, FLUX.2와 일부 Google 모델은 reference_images를 씁니다. TOGETHER_REFERENCE_IMAGE_MODEL을 FLUX.1-kontext-pro로 두는 편이 안전합니다.';
  }
  if (message.includes('429')) {
    return 'Together 요청 한도에 걸렸습니다. 잠시 후 다시 시도하거나 한 번에 한 컷씩 재생성하세요.';
  }
  if (message.toLowerCase().includes('rate')) {
    return '요청 속도가 너무 빨라 제한되었습니다. 잠시 후 다시 시도하세요.';
  }
  return '필요하면 특정 컷만 재생성해서 다시 시도할 수 있습니다.';
}

export default function ImagesPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();
  const { getProject, getCuts, state, ensureImagesForProject, regenerateImagesForCut, selectImage, cancelImageGeneration } = useFanCutStudio();

  const project = getProject(projectId);
  const cuts = getCuts(projectId).slice().sort((a, b) => a.order - b.order);
  const [showOnlyUnselected, setShowOnlyUnselected] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const requestedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || requestedProjectIdRef.current === projectId) return;
    requestedProjectIdRef.current = projectId;
    queueMicrotask(() => setImageError(null));

    void (async () => {
      try {
        await ensureImagesForProject(projectId);
      } catch (error) {
        setImageError(error instanceof Error ? error.message : '이미지 자동 생성에 실패했습니다.');
      }
    })();
  }, [ensureImagesForProject, projectId]);

  const selectedCount = useMemo(() => {
    return cuts.filter((c) => Boolean(state.imagesByCut[c.cutId]?.selectedImageId)).length;
  }, [cuts, state.imagesByCut]);

  const allSelected = useMemo(() => {
    if (cuts.length === 0) return false;
    return cuts.every((c) => {
      const s = state.imagesByCut[c.cutId];
      return Boolean(s?.selectedImageId);
    });
  }, [cuts, state.imagesByCut]);

  const visibleCuts = useMemo(() => {
    if (!showOnlyUnselected) return cuts;
    return cuts.filter((c) => !state.imagesByCut[c.cutId]?.selectedImageId);
  }, [cuts, showOnlyUnselected, state.imagesByCut]);

  const progress = cuts.length === 0 ? 0 : Math.round((selectedCount / cuts.length) * 100);

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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 transition-theme dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <span>🖼️</span> Together AI 이미지 생성
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Together 이미지 모델로 컷별 후보를 생성합니다. 필요하면 컷 단위로 다시 뽑을 수 있어요.
            </p>
            <div className="mt-4">
              <WorkflowStepper projectId={projectId} />
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {imageError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-100">
                  <div className="font-semibold">이미지 생성 중 오류가 발생했습니다.</div>
                  <div className="mt-1 break-words">{imageError}</div>
                  <div className="mt-2 text-xs text-red-700 dark:text-red-200/80">{getImageErrorHint(imageError)}</div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {cuts.length}개 중 <span className="text-emerald-700 dark:text-emerald-300">{selectedCount}개</span> 선택 완료
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnselected((v) => !v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                      showOnlyUnselected
                        ? 'bg-slate-900 text-white ring-slate-900/10 dark:bg-white dark:text-slate-900 dark:ring-white/20'
                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    {showOnlyUnselected ? '전체 보기' : '미선택만 보기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageError(null);
                      void (async () => {
                        for (const cut of visibleCuts) {
                          try {
                            await regenerateImagesForCut(cut.cutId);
                          } catch (error) {
                            setImageError(error instanceof Error ? error.message : '이미지 재생성에 실패했습니다.');
                            break;
                          }
                        }
                      })();
                    }}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
                  >
                    {showOnlyUnselected ? '미선택 컷 재생성' : '전체 재생성'}
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                선택이 끝나면 다음 단계에서 컷별 영상을 생성할 수 있어요.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/studio/${projectId}/plot`}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← 플롯으로
            </Link>
            <button
              type="button"
              disabled={!allSelected}
              onClick={() => router.push(`/studio/${projectId}/videos`)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              영상 생성하기 →
            </button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleCuts.map((cut) => {
            const imgState = state.imagesByCut[cut.cutId];
            const candidates = imgState?.candidates ?? [];
            const selectedId = imgState?.selectedImageId;
            const isSelected = Boolean(selectedId);
            const isGenerating = state.imageJobsByCut[cut.cutId]?.status === 'generating';
            return (
          <section
            key={cut.cutId}
            className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50"
          >
                <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">CUT {cut.order}</div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700/40'
                              : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
                          }`}
                        >
                          {isSelected ? '선택 완료' : '선택 필요'}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {cut.sceneSummary}
                      </div>
                      {candidates[0]?.promptSummary && (
                        <div className="mt-2 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                          생성 프롬프트 핵심: {candidates[0].promptSummary}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isGenerating) {
                          cancelImageGeneration(cut.cutId);
                          return;
                        }
                        setImageError(null);
                        void regenerateImagesForCut(cut.cutId).catch((error) => {
                          setImageError(error instanceof Error ? error.message : '이미지 재생성에 실패했습니다.');
                        });
                      }}
                      className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
                    >
                      {isGenerating ? '중지' : '재생성'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-4">
                  {candidates.length === 0 && isGenerating ? (
                    <button
                      type="button"
                      onClick={() => cancelImageGeneration(cut.cutId)}
                      className="col-span-3 overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-0 text-left shadow-sm transition hover:border-sky-300 dark:border-sky-800/60 dark:bg-slate-900"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(59,130,246,0.08),rgba(16,185,129,0.18))]" />
                        <div className="relative flex h-full flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-sky-500 animate-ping" />
                            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="h-3 w-3 rounded-full bg-sky-500 animate-bounce" />
                          </div>
                          <div className="text-sm font-semibold">이미지 생성 중...</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">탭하면 현재 생성 작업을 멈춥니다</div>
                        </div>
                      </div>
                    </button>
                  ) : candidates.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImageError(null);
                        void regenerateImagesForCut(cut.cutId).catch((error) => {
                          setImageError(error instanceof Error ? error.message : '이미지 생성에 실패했습니다.');
                        });
                      }}
                      className="col-span-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      아직 생성된 이미지가 없습니다. 눌러서 생성하기
                    </button>
                  ) : (
                    candidates.map((c) => {
                      const active = c.imageId === selectedId;
                      return (
                        <button
                          key={c.imageId}
                          type="button"
                          onClick={() => selectImage(cut.cutId, c.imageId)}
                          className={`relative overflow-hidden rounded-xl ring-2 transition ${
                            active ? 'ring-emerald-400' : 'ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700'
                          }`}
                          aria-label={active ? '선택됨' : '선택'}
                          title={c.promptSummary}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.imageDataUrl} alt="" className="h-40 w-full object-cover" />
                          {active && (
                            <div className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">
                              선택
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
