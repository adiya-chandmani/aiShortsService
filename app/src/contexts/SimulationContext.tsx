'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  SimulationState,
  SimulationResult,
  ComparisonData,
  HeatRiskParams,
  FloodRiskParams,
} from '../types/simulation';

interface SimulationContextValue {
  state: SimulationState;
  setState: (state: SimulationState) => void;
  beforeResult: SimulationResult | null;
  afterResult: SimulationResult | null;
  comparison: ComparisonData | null;
  isLoading: boolean;
  runSimulation: (baseParams: HeatRiskParams | FloodRiskParams) => Promise<void>;
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

const DEFAULT_STATE: SimulationState = {
  mode: 'heat',
  greenReduction: 0,
  imperviousIncrease: 0,
  shelterEnabled: true,
  floodDefenseEnabled: false,
};

interface SimulationProviderProps {
  children: ReactNode;
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [state, setState] = useState<SimulationState>(DEFAULT_STATE);
  const [beforeResult, setBeforeResult] = useState<SimulationResult | null>(null);
  const [afterResult, setAfterResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const comparison = useMemo<ComparisonData | null>(() => {
    if (!beforeResult || !afterResult) return null;

    const change = afterResult.risk - beforeResult.risk;
    const changePercent = beforeResult.risk > 0
      ? (change / beforeResult.risk) * 100
      : 0;

    return {
      before: beforeResult,
      after: afterResult,
      change,
      changePercent,
    };
  }, [beforeResult, afterResult]);

  const runSimulation = useCallback(async (baseParams: HeatRiskParams | FloodRiskParams) => {
    setIsLoading(true);

    try {
      const endpoint = state.mode === 'heat' ? '/api/simulation/heat' : '/api/simulation/flood';

      // Before 계산 (기본 상태)
      const beforeResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseParams),
      });

      if (!beforeResponse.ok) {
        throw new Error('Before simulation failed');
      }

      const beforeData: SimulationResult = await beforeResponse.json();
      setBeforeResult(beforeData);

      // After 계산 (시뮬레이션 파라미터 적용)
      let afterParams: HeatRiskParams | FloodRiskParams;

      if (state.mode === 'heat') {
        const heatParams = baseParams as HeatRiskParams;
        afterParams = {
          ...heatParams,
          greenReduction: state.greenReduction / 100,
          imperviousIncrease: state.imperviousIncrease / 100,
          shelterEnabled: state.shelterEnabled,
        };
      } else {
        const floodParams = baseParams as FloodRiskParams;
        afterParams = {
          ...floodParams,
          imperviousIncrease: state.imperviousIncrease / 100,
          floodDefenseEnabled: state.floodDefenseEnabled,
        };
      }

      const afterResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(afterParams),
      });

      if (!afterResponse.ok) {
        throw new Error('After simulation failed');
      }

      const afterData: SimulationResult = await afterResponse.json();

      // 변화량 추가
      const change = afterData.risk - beforeData.risk;
      const changePercent = beforeData.risk > 0
        ? (change / beforeData.risk) * 100
        : 0;

      setAfterResult({
        ...afterData,
        change,
        changePercent,
      });
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [state]);

  const resetSimulation = useCallback(() => {
    setState(DEFAULT_STATE);
    setBeforeResult(null);
    setAfterResult(null);
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        state,
        setState,
        beforeResult,
        afterResult,
        comparison,
        isLoading,
        runSimulation,
        resetSimulation,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulationContext must be used within a SimulationProvider');
  }
  return context;
}
