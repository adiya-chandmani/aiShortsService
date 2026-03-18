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
      for (const cutId of cutIds) {
        await handleGenerate(cutId);
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 transition-theme dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <span>🎞️</span> AI 영상 생성
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              선택된 이미지로 Gemini Veo 컷 영상을 생성하고, 미리보기용 mp4로 정리합니다.
            </p>
            <div className="mt-4">
              <WorkflowStepper projectId={projectId} />
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {cuts.length}개 중 <span className="text-emerald-700 dark:text-emerald-300">{generatedCount}개</span> 생성 완료
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={bulkBusy || remainingCutIds.length === 0}
                    onClick={() => void handleBulkGenerate(remainingCutIds)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition ${
                      remainingCutIds.length === 0
                        ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        : 'bg-slate-900 text-white hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500'
                    }`}
                  >
                    {bulkBusy ? '생성 중…' : anyGenerated ? '남은 컷 생성' : '전체 생성'}
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
                    컷별로도 개별 생성/재생성이 가능합니다.
                  </span>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                  style={{ width: `${cuts.length ? Math.round((generatedCount / cuts.length) * 100) : 0}%` }}
                />
              </div>
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
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cuts.map((cut) => {
            const imgState = state.imagesByCut[cut.cutId];
            const selected = imgState?.candidates?.find((c) => c.imageId === imgState.selectedImageId);
            const video = state.videosByCut[cut.cutId];
            const motionType = motionByCut[cut.cutId] ?? 'zoom_in';
            const durationSec = durationByCut[cut.cutId] ?? 3;
            const isBusy = busyCutId === cut.cutId;
            const hasError = Boolean(errorByCut[cut.cutId]);
            const status: 'waiting' | 'generating' | 'done' | 'error' =
              isBusy ? 'generating' : hasError ? 'error' : video?.providerVideoId ? 'done' : 'waiting';

            return (
          <section
            key={cut.cutId}
            className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50"
          >
                <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">CUT {cut.order}</div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                        status === 'done'
                          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700/40'
                          : status === 'generating'
                            ? 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-700/40'
                            : status === 'error'
                              ? 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-700/40'
                              : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
                      }`}
                    >
                      {status === 'done' ? '완료' : status === 'generating' ? '생성중' : status === 'error' ? '실패' : '대기중'}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{cut.sceneSummary}</div>
                </div>

                <div className="p-4">
                  {selected ? (
                    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.imageDataUrl} alt="" className="h-44 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      선택된 이미지가 없어요
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">카메라 모션</label>
                      <select
                        value={motionType}
                        onChange={(e) => setMotionByCut((prev) => ({ ...prev, [cut.cutId]: e.target.value as MotionType }))}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {MOTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label} · {m.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">길이</label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[3, 5].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDurationByCut((prev) => ({ ...prev, [cut.cutId]: v as 3 | 5 }))}
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                              durationSec === v
                                ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-200'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {v}초
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={!selected || isBusy || bulkBusy}
                      onClick={() => void handleGenerate(cut.cutId)}
                      className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {isBusy ? '생성 중...' : video?.providerVideoId ? '재생성' : '영상 생성'}
                    </button>
                    {video?.videoObjectUrl && (
                      <a
                        href={video.videoObjectUrl}
                        download={`cut-${cut.order}.mp4`}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        다운로드
                      </a>
                    )}
                  </div>

                  {hasError && (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-700/40">
                      {errorByCut[cut.cutId]}
                    </div>
                  )}

                  {video?.videoObjectUrl && (
                    <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                      <video src={video.videoObjectUrl} controls className="h-44 w-full bg-black object-cover" />
                    </div>
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
