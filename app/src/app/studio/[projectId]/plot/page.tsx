'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FanCutCut } from '@/types/fancut';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { WorkflowStepper } from '@/components/studio/WorkflowStepper';

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
        placeholder={placeholder}
      />
    </div>
  );
}

function reorderById(list: FanCutCut[], fromId: string, toId: string) {
  if (fromId === toId) return list;
  const fromIndex = list.findIndex((c) => c.cutId === fromId);
  const toIndex = list.findIndex((c) => c.cutId === toId);
  if (fromIndex === -1 || toIndex === -1) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function PlotPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();
  const { getProject, getCuts, updateCut, setCutsOrder, regenerateProjectPlot } = useFanCutStudio();

  const project = getProject(projectId);
  const cutsFromStore = getCuts(projectId);
  const baseCuts = useMemo(
    () => [...cutsFromStore].sort((a, b) => a.order - b.order),
    [cutsFromStore]
  );
  const [orderedCuts, setOrderedCuts] = useState<FanCutCut[]>(baseCuts);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(baseCuts[0]?.cutId ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOrderedCuts(baseCuts);
      setSelectedCutId((current) => current ?? baseCuts[0]?.cutId ?? null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [baseCuts]);

  const selectedCut = useMemo<FanCutCut | undefined>(
    () => orderedCuts.find((c) => c.cutId === selectedCutId) ?? orderedCuts[0],
    [orderedCuts, selectedCutId]
  );

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="text-3xl">🧩</div>
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">프로젝트를 찾을 수 없어요</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">새 프로젝트로 다시 시작해 주세요.</p>
          <Link
            href="/studio/new"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700"
          >
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
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <span>🧠</span> AI 플롯 기획
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {project.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              컷을 선택해 필드를 수정하고, 다음 단계로 이동하세요.
            </p>
            {regenerateError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-100">
                {regenerateError}
              </div>
            )}
            <div className="mt-4">
              <WorkflowStepper projectId={projectId} />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isRegenerating}
              onClick={() => {
                setRegenerateError(null);
                setIsRegenerating(true);
                void regenerateProjectPlot(projectId)
                  .then(() => {
                    router.push(`/studio/${projectId}/images`);
                  })
                  .catch((error) => {
                    setRegenerateError(error instanceof Error ? error.message : '플롯 재생성에 실패했습니다.');
                  })
                  .finally(() => {
                    setIsRegenerating(false);
                  });
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isRegenerating ? '플롯 재생성 중...' : '플롯 다시 생성 후 이미지로'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/studio/${projectId}/images`)}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              이미지 생성하기 →
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: cut list */}
          <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">컷 리스트</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{orderedCuts.length}개</span>
            </div>
            <div className="mt-4 space-y-2">
              {orderedCuts.map((cut) => {
                const active = cut.cutId === selectedCut?.cutId;
                return (
                  <button
                    key={cut.cutId}
                    type="button"
                    onClick={() => setSelectedCutId(cut.cutId)}
                    draggable
                    onDragStart={() => setDraggingId(cut.cutId)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggingId || draggingId === cut.cutId) return;
                      setOrderedCuts((prev) => reorderById(prev, draggingId, cut.cutId));
                    }}
                    onDragEnd={() => {
                      if (draggingId) {
                        setCutsOrder(projectId, orderedCuts);
                        setDraggingId(null);
                      }
                    }}
                    className={`relative w-full rounded-lg border p-3 text-left transition ${
                      active
                        ? 'border-sky-300 bg-sky-50 shadow-sm dark:border-sky-700 dark:bg-sky-900/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-sky-500 to-emerald-500" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[11px] text-slate-500 dark:border-slate-600 dark:text-slate-400">
                          ☰
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            CUT {cut.order}
                          </div>
                          <div className={`mt-1 line-clamp-2 text-sm ${active ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
                            {cut.sceneSummary}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right: selected cut */}
          <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  선택 컷 상세 {selectedCut ? `(CUT ${selectedCut.order})` : ''}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  등장인물/행동/구도/배경/조명/분위기 등 필드를 수정할 수 있어요.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                스타일: <span className="font-semibold text-slate-900 dark:text-slate-200">{project.stylePreset}</span>
              </div>
            </div>

            {selectedCut ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {/* 핵심 필드 */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">장면 설명</label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">가장 중요</span>
                  </div>
                  <textarea
                    value={selectedCut.sceneSummary}
                    onChange={(e) => updateCut(selectedCut.cutId, { sceneSummary: e.target.value })}
                    rows={5}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                  />
                </div>

                <Field
                  label="등장인물"
                  value={selectedCut.characters}
                  onChange={(v) => updateCut(selectedCut.cutId, { characters: v })}
                  placeholder="예) 주인공 / 라이벌"
                />
                <Field
                  label="감정/행동"
                  value={selectedCut.action}
                  onChange={(v) => updateCut(selectedCut.cutId, { action: v })}
                  placeholder="예) 숨 가쁜 드리블, 눈빛 교환"
                />
                <Field
                  label="구도"
                  value={selectedCut.composition}
                  onChange={(v) => updateCut(selectedCut.cutId, { composition: v })}
                  placeholder="예) 로우 앵글 클로즈업"
                />
                <Field
                  label="배경"
                  value={selectedCut.background}
                  onChange={(v) => updateCut(selectedCut.cutId, { background: v })}
                  placeholder="예) 체육관, 관중석"
                />
                <Field
                  label="조명"
                  value={selectedCut.lighting}
                  onChange={(v) => updateCut(selectedCut.cutId, { lighting: v })}
                  placeholder="예) 골든아워, 네온"
                />
                <Field
                  label="분위기"
                  value={selectedCut.mood}
                  onChange={(v) => updateCut(selectedCut.cutId, { mood: v })}
                  placeholder="예) 뜨거운, 긴장감 있는"
                />

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">핵심 스토리 포인트</label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">요약</span>
                  </div>
                  <input
                    value={selectedCut.storyPoint}
                    onChange={(e) => updateCut(selectedCut.cutId, { storyPoint: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800/40"
                    placeholder="예) 클라이맥스, 반전, 엔딩"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-100 dark:ring-amber-700/40">
                    <p className="font-semibold">디스클레이머</p>
                    <p className="mt-1 opacity-90">본 프로젝트는 IP 기반 2차 창작 데모입니다. 업로드/생성물의 권리와 정책을 확인해주세요.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">컷을 선택해 주세요.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
