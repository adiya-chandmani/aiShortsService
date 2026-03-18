'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { StudioShell } from '@/components/studio/StudioShell';

export default function StudioIndexPage() {
  const { state, deleteProject } = useFanCutStudio();
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const projects = Object.values(state.projects).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleDeleteProject = (projectId: string, title: string) => {
    const confirmed = window.confirm(`"${title || 'untitled project'}" 프로젝트를 삭제할까요?\n플롯, 이미지, 영상, 렌더 결과도 함께 삭제됩니다.`);
    if (!confirmed) return;

    setDeletingProjectId(projectId);
    try {
      deleteProject(projectId);
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <StudioShell
      title="Projects"
      subtitle="All Projects"
    >
      {projects.length === 0 ? (
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-20 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            🎬
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">첫 프로젝트를 만들어볼까요?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            아이디어 한 줄로 플롯 → 이미지 → 영상 → 렌더까지 한 흐름으로 진행됩니다.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/studio/new"
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Gen space에서 시작하기
            </Link>
          </div>

          <div className="mt-8 w-full rounded-lg border border-slate-200 bg-white p-4 text-left text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <div className="font-semibold text-slate-900 dark:text-white">예시 프롬프트</div>
            <div className="mt-3 grid gap-2">
              {[
                '슬램덩크 느낌의 농구 경기 하이라이트, 뜨거운 청춘 감성',
                '버튜버 콘서트 오프닝, 네온 조명과 환호',
                '게임 트레일러처럼 빠른 컷 전환, 긴장감 있는 추격전',
              ].map((p) => (
                <Link
                  key={p}
                  href={`/studio/new?prompt=${encodeURIComponent(p)}`}
                  className="rounded-md bg-slate-50 px-3 py-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">All Projects</h2>
            <Link
              href="/studio/new"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              New from Gen space
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-[#111827] dark:hover:border-slate-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(project.createdAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {project.title || 'untitled project'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(project.projectId, project.title)}
                    disabled={deletingProjectId === project.projectId}
                    className="shrink-0 rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    {deletingProjectId === project.projectId ? '삭제 중' : '삭제'}
                  </button>
                </div>
                <Link href={`/studio/${project.projectId}/plot`} className="mt-3 block">
                  <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {project.ideaText}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{project.stylePreset}</span>
                    <span>{project.targetDuration}초 · {state.cutsByProject[project.projectId]?.length ?? 0}컷</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </StudioShell>
  );
}

