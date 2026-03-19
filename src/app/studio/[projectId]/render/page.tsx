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

  const [bgmOn, setBgmOn] = useState(true);
  const [subtitleTemplate, setSubtitleTemplate] = useState<'none' | 'basic'>('basic');
  const [motionTypeDefault, setMotionTypeDefault] = useState<MotionType>('zoom_in');
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <span>✨</span> 최종 편집/결과
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Gemini 컷 영상을 이어 붙여 최종 mp4를 생성합니다.
            </p>
            <div className="mt-4">
              <WorkflowStepper projectId={projectId} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/studio/${projectId}/videos`}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← 영상으로
            </Link>
            <button
              type="button"
              disabled={!allVideosPresent || isRendering}
              onClick={() => void handleRender()}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
            >
              {isRendering ? '렌더 중...' : '최종 렌더 생성'}
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">기본 편집 옵션</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">배경음악</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Gemini-only MVP에서는 별도 오디오 합성을 적용하지 않습니다.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBgmOn((v) => !v)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      bgmOn
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {bgmOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">자막 템플릿</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">현재는 컷 병합 중심 MVP라 자막은 후속 구현 항목입니다.</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { v: 'basic' as const, label: '기본' },
                    { v: 'none' as const, label: '없음' },
                  ].map((t) => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setSubtitleTemplate(t.v)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        subtitleTemplate === t.v
                          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">트랜지션/모션(데모)</div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  해커톤 MVP를 위해 단일 모션으로 렌더링합니다.
                </p>
                <select
                  value={motionTypeDefault}
                  onChange={(e) => setMotionTypeDefault(e.target.value as MotionType)}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="zoom_in">줌인</option>
                  <option value="static">정지</option>
                  <option value="pan_left">팬(좌)</option>
                  <option value="pan_right">팬(우)</option>
                </select>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-100 dark:ring-amber-700/40">
                <p className="font-semibold">다운로드 형식</p>
                <p className="mt-1 opacity-90">
                  최종 결과물은 <strong>mp4</strong>로 내려받습니다.
                </p>
              </div>
            </div>
          </section>

        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">미리보기</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">썸네일</div>
                <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={render?.thumbnailDataUrl ?? state.imagesByCut[cuts[0]?.cutId ?? '']?.candidates?.[0]?.imageDataUrl ?? ''}
                    alt=""
                    className="aspect-video w-full bg-slate-200 object-cover dark:bg-slate-700"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">최종 결과</div>
                <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                  {render?.outputObjectUrl ? (
                    <video src={render.outputObjectUrl} controls className="aspect-[9/16] w-full bg-black object-cover" />
                  ) : (
                    <div className="flex aspect-[9/16] items-center justify-center bg-slate-200 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      렌더를 생성하면 여기에 표시됩니다
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {render?.outputObjectUrl && (
                <a
                  href={render.outputObjectUrl}
                  download={`${project.title.replaceAll(' ', '-')}.mp4`}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  MP4 다운로드
                </a>
              )}
              <Link
                href="/studio/new"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
