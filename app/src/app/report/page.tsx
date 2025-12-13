'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useCallback, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ReportSummary, PolicyRecommendations } from '../../components/report';
import type { SimulationMode, SimulationState, ComparisonData } from '../../types/simulation';
import Link from 'next/link';

// 차트 컴포넌트 동적 로딩 (recharts가 무거우므로)
const RiskComparisonChart = dynamic(
  () => import('@/components/charts').then(mod => mod.RiskComparisonChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

const RiskDistributionChart = dynamic(
  () => import('@/components/charts').then(mod => mod.RiskDistributionChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

const ParameterImpactChart = dynamic(
  () => import('@/components/charts').then(mod => mod.ParameterImpactChart),
  {
    loading: () => <ChartSkeleton height={200} />,
    ssr: false
  }
);

function ChartSkeleton({ height = 288 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse"
      style={{ height }}
    >
      <div className="text-gray-400 dark:text-gray-500 text-sm">차트 로딩 중...</div>
    </div>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // URL 파라미터에서 시뮬레이션 데이터 파싱
  const mode = (searchParams.get('mode') as SimulationMode) || 'heat';
  const greenReduction = Number(searchParams.get('greenReduction')) || 0;
  const imperviousIncrease = Number(searchParams.get('imperviousIncrease')) || 0;
  const shelterEnabled = searchParams.get('shelterEnabled') === 'true';
  const floodDefenseEnabled = searchParams.get('floodDefenseEnabled') === 'true';
  const locationName = searchParams.get('location') || '경기도 전체';

  // 비교 데이터 파싱
  const beforeRisk = Number(searchParams.get('beforeRisk')) || 0.3;
  const afterRisk = Number(searchParams.get('afterRisk')) || 0.5;

  const state = useMemo<SimulationState>(() => ({
    mode,
    greenReduction,
    imperviousIncrease,
    shelterEnabled,
    floodDefenseEnabled,
  }), [mode, greenReduction, imperviousIncrease, shelterEnabled, floodDefenseEnabled]);

  const getRiskLevel = (risk: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (risk >= 0.75) return 'critical';
    if (risk >= 0.5) return 'high';
    if (risk >= 0.25) return 'medium';
    return 'low';
  };

  const comparison = useMemo<ComparisonData>(() => {
    const change = afterRisk - beforeRisk;
    const changePercent = beforeRisk > 0 ? (change / beforeRisk) * 100 : 0;
    return {
      before: { risk: beforeRisk, riskLevel: getRiskLevel(beforeRisk) },
      after: { risk: afterRisk, riskLevel: getRiskLevel(afterRisk) },
      change,
      changePercent,
    };
  }, [beforeRisk, afterRisk]);

  // 위험도 분포 데이터 (시뮬레이션 기반 추정)
  const riskDistribution = useMemo(() => ({
    lowRiskCount: Math.round((1 - afterRisk) * 50),
    mediumRiskCount: Math.round(afterRisk * 30),
    highRiskCount: Math.round(afterRisk * 15),
    criticalRiskCount: Math.round(afterRisk * 5),
  }), [afterRisk]);

  // 리포트 내보내기 (이미지)
  const handleExportImage = useCallback(async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `climate-report-${mode}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('이미지 내보내기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsExporting(false);
    }
  }, [mode]);

  // JSON 데이터 내보내기
  const handleExportJSON = useCallback(() => {
    const data = {
      generatedAt: new Date().toISOString(),
      mode,
      location: locationName,
      simulationSettings: state,
      results: {
        before: comparison.before,
        after: comparison.after,
        changePercent: comparison.changePercent,
      },
      riskDistribution,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `climate-report-${mode}-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [mode, locationName, state, comparison.before, comparison.after, comparison.changePercent, riskDistribution]);

  // 인쇄
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const modeLabel = mode === 'heat' ? '폭염' : '침수';
  const modeIcon = mode === 'heat' ? '🌡️' : '🌊';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/simulator"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              시뮬레이터로 돌아가기
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              📄 JSON 내보내기
            </button>
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {isExporting ? '⏳ 처리 중...' : '🖼️ 이미지 저장'}
            </button>
            <button
              onClick={handlePrint}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              🖨️ 인쇄
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div ref={reportRef} className="space-y-6 bg-white p-6 dark:bg-gray-800 print:p-0">
          {/* 리포트 제목 (인쇄용) */}
          <div className="hidden print:block print:mb-8 print:text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {modeIcon} CLIMATE SWITCH - {modeLabel} 위험도 분석 리포트
            </h1>
            <p className="text-gray-500 mt-2">
              생성일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* 요약 */}
          <ReportSummary
            mode={mode}
            state={state}
            comparison={comparison}
            locationName={locationName}
          />

          {/* 차트 섹션 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 위험도 비교 차트 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                📊 위험도 변화 비교
              </h3>
              <RiskComparisonChart beforeRisk={beforeRisk} afterRisk={afterRisk} mode={mode} />
            </div>

            {/* 위험도 분포 차트 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                📈 위험 구역 분포
              </h3>
              <RiskDistributionChart data={riskDistribution} mode={mode} />
            </div>
          </div>

          {/* 파라미터 영향도 차트 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              🎯 시뮬레이션 파라미터 영향도
            </h3>
            <ParameterImpactChart
              mode={mode}
              greenReduction={greenReduction}
              imperviousIncrease={imperviousIncrease}
              shelterEnabled={shelterEnabled}
              floodDefenseEnabled={floodDefenseEnabled}
            />
          </div>

          {/* 정책 제안 */}
          <PolicyRecommendations mode={mode} comparison={comparison} />

          {/* 푸터 */}
          <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p>CLIMATE SWITCH - 경기도 기후 위험도 시뮬레이터</p>
            <p className="mt-1">
              본 리포트는 시뮬레이션 결과를 기반으로 생성되었습니다.
              실제 정책 수립 시에는 추가적인 현장 조사와 전문가 검토가 필요합니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">리포트 로딩 중...</p>
        </div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
