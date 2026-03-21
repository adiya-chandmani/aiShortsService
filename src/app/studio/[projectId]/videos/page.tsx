'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { MotionType } from '@/types/fancut';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { WorkflowStepper } from '@/components/studio/WorkflowStepper';

const MOTIONS: Array<{ value: MotionType; label: string; desc: string }> = [
  { value: 'static', label: '정지', desc: '가장 안정적' },
  { value: 'zoom_in', label: '줌인', desc: '집중도 상승' },
  { value: 'pan_left', label: '팬(좌)', desc: '공간감 연출' },
  { value: 'pan_right', label: '팬(우)', desc: '공간감 연출' },
];

export default function VideosPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();
  const { getProject, getCuts, state, generateVideoForCut } = useFanCutStudio();

  const project = getProject(projectId);
  const cuts = getCuts(projectId).slice().sort((a, b) => a.order - b.order);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [motionByCut, setMotionByCut] = useState<Record<string, MotionType>>({});
  const [durationByCut, setDurationByCut] = useState<Record<string, 3 | 5>>({});
  const [busyCutId, setBusyCutId] = useState<string | null>(null);
  const [errorByCut, setErrorByCut] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const allGenerated = useMemo(() => cuts.every((c) => Boolean(state.videosByCut[c.cutId]?.providerVideoId)), [cuts, state.videosByCut]);
  const generatedCount = useMemo(() => cuts.filter((c) => Boolean(state.videosByCut[c.cutId]?.providerVideoId)).length, [cuts, state.videosByCut]);
  const remainingCutIds = useMemo(
    () => cuts.filter((c) => !state.videosByCut[c.cutId]?.providerVideoId).map((c) => c.cutId),
    [cuts, state.videosByCut]
  );
  const anyGenerated = generatedCount > 0;
  const defaultCut = cuts.find((c) => !state.videosByCut[c.cutId]?.providerVideoId) ?? cuts[0];
  const activeCutId = selectedCutId && cuts.some((cut) => cut.cutId === selectedCutId)
    ? selectedCutId
    : (defaultCut?.cutId ?? null);
  const activeCut = cuts.find((cut) => cut.cutId === activeCutId) ?? defaultCut;

  const getSelectedImage = (cutId: string) => {
    const imgState = state.imagesByCut[cutId];
    return imgState?.candidates?.find((candidate) => candidate.imageId === imgState.selectedImageId);
  };

  const getCutStatus = (cutId: string): 'needs_image' | 'waiting' | 'generating' | 'done' | 'error' => {
    const selected = getSelectedImage(cutId);
    const video = state.videosByCut[cutId];
    const isBusy = busyCutId === cutId;
    const hasError = Boolean(errorByCut[cutId]);

    if (isBusy) return 'generating';
    if (hasError) return 'error';
    if (video?.providerVideoId) return 'done';
    if (selected) return 'waiting';
    return 'needs_image';
  };

  const activeSelectedImage = activeCut ? getSelectedImage(activeCut.cutId) : undefined;
  const activeVideo = activeCut ? state.videosByCut[activeCut.cutId] : undefined;
  const activeMotion = activeCut ? (motionByCut[activeCut.cutId] ?? 'zoom_in') : 'zoom_in';
  const activeDuration = activeCut ? (durationByCut[activeCut.cutId] ?? 3) : 3;
  const activeIsBusy = activeCut ? busyCutId === activeCut.cutId : false;
  const activeHasError = activeCut ? Boolean(errorByCut[activeCut.cutId]) : false;
  const activeStatus = activeCut ? getCutStatus(activeCut.cutId) : 'needs_image';
  const progress = cuts.length ? Math.round((generatedCount / cuts.length) * 100) : 0;

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

  const handleGenerate = async (cutId: string) => {
    setBusyCutId(cutId);
    try {
      setErrorByCut((prev) => {
        const next = { ...prev };
        delete next[cutId];
        return next;
      });
      const motionType = motionByCut[cutId] ?? 'zoom_in';
      const durationSec = durationByCut[cutId] ?? 3;
      await generateVideoForCut({ cutId, motionType, durationSec });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '생성에 실패했습니다.';
      setErrorByCut((prev) => ({ ...prev, [cutId]: msg }));
    } finally {
      setBusyCutId(null);
    }
  };

  const handleBulkGenerate = async (cutIds: string[]) => {
    if (cutIds.length === 0) return;
    setBulkBusy(true);
    try {
      for (const [index, cutId] of cutIds.entries()) {
        await handleGenerate(cutId);
        if (index < cutIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 transition-theme dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <span aria-hidden="true">🎞️</span> 컷별 영상 제작
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              선택된 이미지로 컷 영상을 만들고, 모두 완료되면 최종 렌더로 넘어가세요.
            </p>
            <div className="mt-3">
              <WorkflowStepper projectId={projectId} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/studio/${projectId}/images`}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← 이미지로
            </Link>
            <button
              type="button"
              disabled={!allGenerated}
              onClick={() => router.push(`/studio/${projectId}/render`)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {allGenerated ? '최종 렌더 →' : `${generatedCount}/${cuts.length} 완료`}
            </button>
          </div>
          </div>
        </header>

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
                    activeStatus === 'done'
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700/40'
                      : activeStatus === 'generating'
                        ? 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-700/40'
                        : activeStatus === 'error'
                          ? 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-700/40'
                          : activeStatus === 'needs_image'
                            ? 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-700/40'
                            : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
                  }`}
                >
                  {activeStatus === 'done'
                    ? '완료'
                    : activeStatus === 'generating'
                      ? '생성 중'
                      : activeStatus === 'error'
                        ? '실패'
                        : activeStatus === 'needs_image'
                          ? '이미지 필요'
                          : '생성 대기'}
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                {activeVideo?.videoObjectUrl ? (
                  <video src={activeVideo.videoObjectUrl} controls className="aspect-[16/9] w-full bg-black object-cover" />
                ) : activeSelectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeSelectedImage.imageDataUrl} alt="" className="aspect-[16/9] w-full bg-slate-200 object-cover dark:bg-slate-700" />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <div>
                      <div className="font-semibold">선택된 이미지가 필요해요</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        이전 단계에서 컷 이미지를 하나 선택해 주세요.
                      </div>
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
                    <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">영상 설정</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700/60">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">카메라 모션</label>
                        <select
                          value={activeMotion}
                          onChange={(e) => setMotionByCut((prev) => ({ ...prev, [activeCut.cutId]: e.target.value as MotionType }))}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          {MOTIONS.map((motion) => (
                            <option key={motion.value} value={motion.value}>
                              {motion.label} · {motion.desc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700/60">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">길이</label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {[3, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setDurationByCut((prev) => ({ ...prev, [activeCut.cutId]: value as 3 | 5 }))}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                activeDuration === value
                                  ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-200'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              {value}초
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={!activeSelectedImage || activeIsBusy || bulkBusy}
                      onClick={() => void handleGenerate(activeCut.cutId)}
                      className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {activeIsBusy ? '생성 중...' : activeVideo?.providerVideoId ? '재생성' : '영상 생성'}
                    </button>
                    {activeVideo?.videoObjectUrl && (
                      <a
                        href={activeVideo.videoObjectUrl}
                        download={`cut-${activeCut.order}.mp4`}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        다운로드
                      </a>
                    )}
                  </div>

                  {activeHasError && (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-700/40">
                      {errorByCut[activeCut.cutId]}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 lg:col-span-5 lg:border-l lg:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {cuts.length}개 중 <span className="text-emerald-700 dark:text-emerald-300">{generatedCount}개</span> 생성 완료
                </div>
                <button
                  type="button"
                  disabled={bulkBusy || remainingCutIds.length === 0}
                  onClick={() => void handleBulkGenerate(remainingCutIds)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition ${
                    remainingCutIds.length === 0
                      ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      : 'bg-slate-900 text-white hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500'
                  }`}
                >
                  {bulkBusy ? '생성 중…' : anyGenerated ? '남은 컷 생성' : '전체 생성'}
                </button>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                모든 컷이 생성되면 “최종 렌더”가 활성화됩니다.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {cuts.map((cut) => {
                  const selectedImage = getSelectedImage(cut.cutId);
                  const status = getCutStatus(cut.cutId);
                  const isActiveCut = cut.cutId === activeCut?.cutId;
                  const cardAccent =
                    status === 'done'
                      ? 'ring-emerald-300 dark:ring-emerald-700/50'
                      : status === 'error'
                        ? 'ring-red-300 dark:ring-red-700/50'
                        : status === 'generating'
                          ? 'ring-sky-300 dark:ring-sky-700/50'
                          : isActiveCut
                            ? 'ring-sky-400'
                            : 'ring-slate-200 dark:ring-slate-700';

                  return (
                    <button
                      key={cut.cutId}
                      type="button"
                      onClick={() => setSelectedCutId(cut.cutId)}
                      className={`overflow-hidden rounded-xl bg-white p-2 text-left ring-1 transition hover:ring-slate-300 dark:bg-slate-800 dark:hover:ring-slate-600 ${cardAccent} ${isActiveCut ? 'shadow-sm' : ''}`}
                    >
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">CUT {cut.order}</div>
                      <div className="mt-2 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                        {selectedImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedImage.imageDataUrl} alt="" className="aspect-square w-full object-cover" />
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
