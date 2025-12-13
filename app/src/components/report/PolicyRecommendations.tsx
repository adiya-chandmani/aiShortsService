'use client';

import type { SimulationMode, ComparisonData } from '../../types/simulation';

interface PolicyRecommendationsProps {
  mode: SimulationMode;
  comparison: ComparisonData | null;
}

interface Recommendation {
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

function getHeatRecommendations(comparison: ComparisonData | null): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!comparison) {
    return [
      {
        icon: '🌳',
        title: '녹지 공간 확대',
        description: '도시 내 공원 및 녹지 면적을 확대하여 열섬 효과를 완화합니다.',
        priority: 'medium',
      },
      {
        icon: '🏠',
        title: '무더위쉼터 확충',
        description: '취약계층을 위한 무더위쉼터를 지역별로 균형있게 배치합니다.',
        priority: 'medium',
      },
    ];
  }

  const afterRisk = comparison.after.risk;
  const changePercent = comparison.changePercent;

  if (afterRisk >= 0.75 || changePercent > 30) {
    recommendations.push({
      icon: '🚨',
      title: '긴급 폭염 대책 필요',
      description: '위험도가 매우 높습니다. 즉각적인 냉방 시설 확충과 취약계층 보호 대책이 필요합니다.',
      priority: 'high',
    });
  }

  if (changePercent > 20) {
    recommendations.push({
      icon: '🌳',
      title: '도시 숲 조성 사업',
      description: '녹지 감소로 인한 열섬 효과가 증가했습니다. 가로수 및 도시 숲 조성을 권장합니다.',
      priority: 'high',
    });
  }

  recommendations.push({
    icon: '🏗️',
    title: '쿨루프/쿨페이브먼트 도입',
    description: '건물 옥상 및 도로에 열 반사 소재를 적용하여 표면 온도를 낮춥니다.',
    priority: afterRisk >= 0.5 ? 'high' : 'medium',
  });

  recommendations.push({
    icon: '💧',
    title: '쿨링 포그 시스템',
    description: '주요 보행로 및 대중교통 정류장에 안개 분사 시스템을 설치합니다.',
    priority: 'medium',
  });

  recommendations.push({
    icon: '📱',
    title: '폭염 경보 시스템 강화',
    description: '실시간 폭염 정보 전달 및 대피 안내 시스템을 구축합니다.',
    priority: 'low',
  });

  return recommendations;
}

function getFloodRecommendations(comparison: ComparisonData | null): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!comparison) {
    return [
      {
        icon: '🌊',
        title: '빗물 관리 시설 확충',
        description: '빗물 저류조 및 침투 시설을 설치하여 우수 유출을 저감합니다.',
        priority: 'medium',
      },
      {
        icon: '🛡️',
        title: '배수 시스템 점검',
        description: '기존 배수 시설의 용량과 상태를 점검하고 필요시 확대합니다.',
        priority: 'medium',
      },
    ];
  }

  const afterRisk = comparison.after.risk;
  const changePercent = comparison.changePercent;

  if (afterRisk >= 0.75 || changePercent > 30) {
    recommendations.push({
      icon: '🚨',
      title: '침수 위험 지역 긴급 점검',
      description: '위험도가 매우 높습니다. 배수 시설 긴급 점검과 대피 계획 수립이 필요합니다.',
      priority: 'high',
    });
  }

  if (changePercent > 20) {
    recommendations.push({
      icon: '🏗️',
      title: '투수성 포장재 교체',
      description: '불투수면 증가로 인한 유출량 증가에 대응하여 투수블록 및 투수 아스팔트를 적용합니다.',
      priority: 'high',
    });
  }

  recommendations.push({
    icon: '💧',
    title: '빗물 저류시설 확대',
    description: '지하 저류조, 빗물 정원, 생태 연못 등을 조성하여 우수를 분산 저류합니다.',
    priority: afterRisk >= 0.5 ? 'high' : 'medium',
  });

  recommendations.push({
    icon: '🌿',
    title: '그린인프라 조성',
    description: '식생 수로, 레인가든, 옥상 녹화 등 자연 기반 해결책을 도입합니다.',
    priority: 'medium',
  });

  recommendations.push({
    icon: '📡',
    title: '홍수 예경보 시스템',
    description: '실시간 수위 모니터링 및 주민 대피 알림 시스템을 구축합니다.',
    priority: 'low',
  });

  return recommendations;
}

const PRIORITY_STYLES = {
  high: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  medium: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
  low: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
};

const PRIORITY_LABELS = {
  high: { text: '긴급', color: 'bg-red-500' },
  medium: { text: '권장', color: 'bg-yellow-500' },
  low: { text: '참고', color: 'bg-gray-500' },
};

export function PolicyRecommendations({ mode, comparison }: PolicyRecommendationsProps) {
  const recommendations = mode === 'heat'
    ? getHeatRecommendations(comparison)
    : getFloodRecommendations(comparison);

  const modeLabel = mode === 'heat' ? '폭염' : '침수';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        💡 {modeLabel} 대응 정책 제안
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${PRIORITY_STYLES[rec.priority]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{rec.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <span className={`rounded px-1.5 py-0.5 text-xs text-white ${PRIORITY_LABELS[rec.priority].color}`}>
                    {PRIORITY_LABELS[rec.priority].text}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {rec.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
