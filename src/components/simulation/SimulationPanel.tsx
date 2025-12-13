'use client';

import { Slider, Switch, ModeToggle, RiskIndicator } from '@/components/ui';
import type { SimulationState, SimulationResult } from '@/types/simulation';

interface SimulationPanelProps {
  state: SimulationState;
  result: SimulationResult | null;
  onStateChange: (state: SimulationState) => void;
  onSimulate: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  hasLocation?: boolean;
}

const DEFAULT_STATE: SimulationState = {
  mode: 'heat',
  greenReduction: 0,
  imperviousIncrease: 0,
  shelterEnabled: true,
  floodDefenseEnabled: false,
};

export function SimulationPanel({
  state,
  result,
  onStateChange,
  onSimulate,
  onReset,
  isLoading = false,
  hasLocation = false,
}: SimulationPanelProps) {
  const updateState = (updates: Partial<SimulationState>) => {
    onStateChange({ ...state, ...updates });
  };

  const handleReset = () => {
    onStateChange({ ...DEFAULT_STATE, mode: state.mode });
    onReset?.();
  };

  const isModified =
    state.greenReduction !== 0 ||
    state.imperviousIncrease !== 0 ||
    state.shelterEnabled !== true ||
    state.floodDefenseEnabled !== false;

  return (
    <div className="space-y-6">
      {/* 모드 선택 */}
      <div>
        <ModeToggle
          mode={state.mode}
          onChange={(mode) => updateState({ mode })}
        />
      </div>

      {/* 모드별 설명 */}
      <div className={`rounded-lg p-3 text-sm ${
        state.mode === 'heat'
          ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      }`}>
        {state.mode === 'heat' ? (
          <>
            <strong>폭염 모드:</strong> 녹지 감소와 불투수면 증가가 폭염 위험에 미치는 영향을 시뮬레이션합니다.
          </>
        ) : (
          <>
            <strong>침수 모드:</strong> 불투수면 증가와 방어 시설 유무가 침수 위험에 미치는 영향을 시뮬레이션합니다.
          </>
        )}
      </div>

      {/* 시뮬레이션 컨트롤 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            도시 요소 조절
          </h3>
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              초기화
            </button>
          )}
        </div>

        {/* 녹지 감소 (폭염 모드에서만) */}
        {state.mode === 'heat' && (
          <Slider
            label="🌳 녹지 감소"
            value={state.greenReduction}
            onChange={(greenReduction) => updateState({ greenReduction })}
            min={0}
            max={100}
            unit="%"
          />
        )}

        {/* 불투수면 증가 */}
        <Slider
          label="🧱 불투수면 증가"
          value={state.imperviousIncrease}
          onChange={(imperviousIncrease) => updateState({ imperviousIncrease })}
          min={0}
          max={100}
          unit="%"
        />

        {/* 쉼터 ON/OFF (폭염 모드에서만) */}
        {state.mode === 'heat' && (
          <Switch
            label="🏠 무더위쉼터"
            checked={state.shelterEnabled}
            onChange={(shelterEnabled) => updateState({ shelterEnabled })}
            description="쉼터 활성화 시 취약도 감소"
          />
        )}

        {/* 침수 방어 ON/OFF (침수 모드에서만) */}
        {state.mode === 'flood' && (
          <Switch
            label="🌊 침수 방어 시설"
            checked={state.floodDefenseEnabled}
            onChange={(floodDefenseEnabled) => updateState({ floodDefenseEnabled })}
            description="방어 시설 활성화 시 위험도 30% 감소"
          />
        )}
      </div>

      {/* 위치 선택 안내 */}
      {!hasLocation && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center dark:border-gray-600 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 지도에서 위치를 클릭하면 해당 지역의
            <br />
            실제 데이터로 시뮬레이션됩니다
          </p>
        </div>
      )}

      {/* 시뮬레이션 실행 버튼 */}
      <button
        type="button"
        onClick={onSimulate}
        disabled={isLoading}
        className="relative w-full overflow-hidden rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            계산 중...
          </span>
        ) : (
          '시뮬레이션 실행'
        )}
      </button>

      {/* 결과 표시 */}
      <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {hasLocation ? '선택 위치 결과' : '시뮬레이션 결과'}
        </h3>
        <RiskIndicator
          result={result}
          label={state.mode === 'heat' ? '폭염 위험도' : '침수 위험도'}
        />
      </div>
    </div>
  );
}
