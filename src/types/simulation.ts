/**
 * 시뮬레이션 관련 타입 정의
 */

export interface HeatRiskParams {
  heatIndex: number; // 0~1
  impervious: number; // 0~1
  green: number; // 0~1
  greenReduction?: number; // 0~1 (시뮬레이션)
  imperviousIncrease?: number; // 0~1 (시뮬레이션)
  shelterEnabled?: boolean;
}

export interface FloodRiskParams {
  rainRisk: number; // 0~1
  floodTrace: number; // 0~1
  impervious: number; // 0~1
  riverProximity: number; // 0~1
  imperviousIncrease?: number; // 0~1 (시뮬레이션)
  floodDefenseEnabled?: boolean;
}

export interface SimulationResult {
  risk: number; // 0~1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  change?: number; // Before 대비 변화량
  changePercent?: number; // Before 대비 변화율 (%)
}

export interface ComparisonData {
  before: SimulationResult;
  after: SimulationResult;
  change: number;
  changePercent: number;
}

export type SimulationMode = 'heat' | 'flood';

export interface SimulationState {
  mode: SimulationMode;
  greenReduction: number; // 0~100 (%)
  imperviousIncrease: number; // 0~100 (%)
  shelterEnabled: boolean;
  floodDefenseEnabled: boolean;
}

