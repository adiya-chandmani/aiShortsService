/**
 * 침수 위험도 계산 로직
 * 
 * 계산식: FloodRisk = 0.40*RainRisk + 0.25*FloodTrace + 0.20*Impervious + 0.15*RiverProximity
 */

import type { FloodRiskParams, SimulationResult } from '../../types/simulation';

/**
 * 침수 위험도 계산
 * @param params - 침수 위험도 계산 파라미터
 * @returns 0~1 범위의 위험도 값
 */
export function calculateFloodRisk(params: FloodRiskParams): number {
  // 시뮬레이션 파라미터 적용
  const adjustedImpervious = Math.min(1, params.impervious + (params.imperviousIncrease || 0));
  
  // 기본 위험도 계산
  let risk = 0.40 * params.rainRisk 
           + 0.25 * params.floodTrace 
           + 0.20 * adjustedImpervious 
           + 0.15 * params.riverProximity;
  
  // 침수 방어 시설 있을 경우 위험도 감소
  if (params.floodDefenseEnabled) {
    risk *= 0.7; // 30% 감소
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
 * 침수 위험도 계산 및 결과 반환
 * @param params - 침수 위험도 계산 파라미터
 * @returns 시뮬레이션 결과
 */
export function calculateFloodRiskResult(params: FloodRiskParams): SimulationResult {
  const risk = calculateFloodRisk(params);
  const riskLevel = getRiskLevel(risk);
  
  return {
    risk,
    riskLevel,
  };
}

