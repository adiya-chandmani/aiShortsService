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
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
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

  const defaultCut = useMemo(() => {
    const firstUnselected = cuts.find((c) => !state.imagesByCut[c.cutId]?.selectedImageId);
    return firstUnselected ?? cuts[0];
  }, [cuts, state.imagesByCut]);

  const activeCutId = selectedCutId && cuts.some((cut) => cut.cutId === selectedCutId)
    ? selectedCutId
    : (defaultCut?.cutId ?? null);
  const activeCut = cuts.find((cut) => cut.cutId === activeCutId) ?? defaultCut;
  const activeState = activeCut ? state.imagesByCut[activeCut.cutId] : undefined;
  const activeCandidates = activeState?.candidates ?? [];
  const activeSelected = activeState?.candidates?.find((c) => c.imageId === activeState.selectedImageId);
  const activeFallback = activeState?.candidates?.[0];
  const activePreviewUrl = activeSelected?.imageDataUrl ?? activeFallback?.imageDataUrl ?? '';
  const activeIsSelected = Boolean(activeState?.selectedImageId);
  const activeIsGenerating = activeCut ? state.imageJobsByCut[activeCut.cutId]?.status === 'generating' : false;

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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <span aria-hidden="true">🖼️</span> 이미지 후보 선택 갤러리
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              컷별 후보 중 하나를 선택하면, 다음 단계에서 해당 이미지로 영상을 만들어요.
            </p>
            <div className="mt-3">
              <WorkflowStepper projectId={projectId} />
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
          </div>
        </header>

        {imageError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-100">
            <div className="font-semibold">이미지 생성 중 오류가 발생했습니다.</div>
            <div className="mt-1 break-words">{imageError}</div>
            <div className="mt-2 text-xs text-red-700 dark:text-red-200/80">{getImageErrorHint(imageError)}</div>
          </div>
        )}

        <section className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50">
          <div className="grid gap-0 lg:grid-cols-12">
            <div className="p-4 lg:col-span-7">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {activeCut ? `선택된 컷 · CUT ${activeCut.order}` : '선택된 컷'}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {activeCut?.sceneSummary ?? '컷이 아직 없습니다.'}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
                    activeIsGenerating
                      ? 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-700/40'
                      : activeIsSelected
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700/40'
                        : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-700/40'
                  }`}
                >
                  {activeIsGenerating ? '생성 중' : activeIsSelected ? '선택 완료' : '선택 필요'}
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                {activePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activePreviewUrl} alt="" className="aspect-[16/9] w-full bg-slate-200 object-cover dark:bg-slate-700" />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <div>
                      <div className="font-semibold">아직 이미지가 없어요</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">오른쪽 컷을 눌러 상세를 보고 이미지를 선택해 주세요.</div>
                    </div>
                  </div>
                )}
              </div>

              {activeCut && (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700/60">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">플롯</div>
                      <div className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">
                        {activeCut.sceneSummary}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700/60">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">캐릭터</div>
                      <div className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">
                        {activeCut.characters}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">이미지</div>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeIsGenerating) {
                            cancelImageGeneration(activeCut.cutId);
                            return;
                          }
                          setImageError(null);
                          void regenerateImagesForCut(activeCut.cutId).catch((error) => {
                            setImageError(error instanceof Error ? error.message : '이미지 재생성에 실패했습니다.');
                          });
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {activeIsGenerating ? '중지' : '재생성'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {activeCandidates.length === 0 && activeIsGenerating ? (
                        <button
                          type="button"
                          onClick={() => cancelImageGeneration(activeCut.cutId)}
                          className="col-span-3 overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-0 text-left shadow-sm transition hover:border-sky-300 dark:border-sky-800/60 dark:bg-slate-900"
                        >
                          <div className="relative h-40 overflow-hidden">
                            <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(59,130,246,0.08),rgba(16,185,129,0.18))]" />
                            <div className="relative flex h-full flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 animate-ping rounded-full bg-sky-500" />
                                <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
                                <span className="h-3 w-3 animate-bounce rounded-full bg-sky-500" />
                              </div>
                              <div className="text-sm font-semibold">이미지 생성 중...</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">탭하면 현재 생성 작업을 멈춥니다</div>
                            </div>
                          </div>
                        </button>
                      ) : activeCandidates.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setImageError(null);
                            void regenerateImagesForCut(activeCut.cutId).catch((error) => {
                              setImageError(error instanceof Error ? error.message : '이미지 생성에 실패했습니다.');
                            });
                          }}
                          className="col-span-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <div className="font-semibold text-slate-700 dark:text-slate-200">아직 생성된 이미지가 없어요</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">눌러서 후보를 생성하고 하나를 선택하세요.</div>
                        </button>
                      ) : (
                        activeCandidates.map((candidate) => {
                          const isActiveImage = candidate.imageId === activeState?.selectedImageId;
                          return (
                            <button
                              key={candidate.imageId}
                              type="button"
                              onClick={() => selectImage(activeCut.cutId, candidate.imageId)}
                              className={`relative overflow-hidden rounded-xl ring-2 transition ${
                                isActiveImage ? 'ring-emerald-400' : 'ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700'
                              }`}
                              aria-label={isActiveImage ? '선택됨' : '선택'}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={candidate.imageDataUrl} alt="" className="h-32 w-full object-cover" />
                              {isActiveImage && (
                                <div className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">
                                  선택
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 lg:col-span-5 lg:border-l lg:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {cuts.length}개 중 <span className="text-emerald-700 dark:text-emerald-300">{selectedCount}개</span> 선택 완료
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageError(null);
                    void (async () => {
                      for (const cut of cuts) {
                        try {
                          await regenerateImagesForCut(cut.cutId);
                        } catch (error) {
                          setImageError(error instanceof Error ? error.message : '이미지 재생성에 실패했습니다.');
                          break;
                        }
                      }
                    })();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  전체 재생성
                </button>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                모든 컷을 선택해야 “영상 생성하기”가 활성화됩니다.
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {cuts.map((cut) => {
                  const cutState = state.imagesByCut[cut.cutId];
                  const selectedImage = cutState?.candidates?.find((candidate) => candidate.imageId === cutState.selectedImageId);
                  const previewImage = selectedImage ?? cutState?.candidates?.[0];
                  const isActiveCut = cut.cutId === activeCut?.cutId;

                  return (
                    <button
                      key={cut.cutId}
                      type="button"
                      onClick={() => setSelectedCutId(cut.cutId)}
                      className={`overflow-hidden rounded-xl bg-white p-2 text-left ring-1 transition dark:bg-slate-800 ${
                        isActiveCut
                          ? 'ring-sky-400 shadow-sm'
                          : 'ring-slate-200 hover:ring-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">CUT {cut.order}</div>
                      <div className="mt-2 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        {previewImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewImage.imageDataUrl} alt="" className="aspect-square w-full object-cover" />
                        ) : (
                          <div className="flex aspect-square items-center justify-center text-[11px] text-slate-400 dark:text-slate-500">
                            준비 중
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
