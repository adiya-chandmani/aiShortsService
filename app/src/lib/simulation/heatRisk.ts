/**
 * 폭염 위험도 계산 로직
 * 
 * 계산식: HeatRisk = 0.55*HeatIndex + 0.25*Impervious - 0.20*Green
 */

import type { HeatRiskParams, SimulationResult } from '../../types/simulation';

/**
 * 폭염 위험도 계산
 * @param params - 폭염 위험도 계산 파라미터
 * @returns 0~1 범위의 위험도 값
 */
export function calculateHeatRisk(params: HeatRiskParams): number {
  // 시뮬레이션 파라미터 적용
  const adjustedGreen = Math.max(0, params.green - (params.greenReduction || 0));
  const adjustedImpervious = Math.min(1, params.impervious + (params.imperviousIncrease || 0));
  
  // 기본 위험도 계산
  let risk = 0.55 * params.heatIndex 
           + 0.25 * adjustedImpervious 
           - 0.20 * adjustedGreen;
  
  // 쉼터 없을 시 취약도 증가
  if (!params.shelterEnabled) {
    risk += 0.1;
  }
  
  // 0~1 범위로 정규화
  return Math.max(0, Math.min(1, risk));
}

/**
 * 위험도 레벨 판정
 * @param risk - 위험도 값 (0~1)
 * @returns 위험도 레벨
 */
export function getRiskLevel(risk: number): SimulationResult['riskLevel'] {
  if (risk >= 0.75) return 'critical';
  if (risk >= 0.5) return 'high';
  if (risk >= 0.25) return 'medium';
  return 'low';
}

/**
 * 폭염 위험도 계산 및 결과 반환
 * @param params - 폭염 위험도 계산 파라미터
 * @returns 시뮬레이션 결과
 */
export function calculateHeatRiskResult(params: HeatRiskParams): SimulationResult {
  const risk = calculateHeatRisk(params);
  const riskLevel = getRiskLevel(risk);
  
  return {
    risk,
    riskLevel,
  };
}

