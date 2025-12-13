'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { SimulationMode } from '@/types/simulation';

interface ParameterImpactChartProps {
  mode: SimulationMode;
  greenReduction: number;
  imperviousIncrease: number;
  shelterEnabled: boolean;
  floodDefenseEnabled: boolean;
}

export function ParameterImpactChart({
  mode,
  greenReduction,
  imperviousIncrease,
  shelterEnabled,
  floodDefenseEnabled,
}: ParameterImpactChartProps) {
  const data = mode === 'heat'
    ? [
        { parameter: '녹지 감소', value: greenReduction, impact: greenReduction * 0.2 },
        { parameter: '불투수면 증가', value: imperviousIncrease, impact: imperviousIncrease * 0.25 },
        { parameter: '쉼터 비활성화', value: shelterEnabled ? 0 : 100, impact: shelterEnabled ? 0 : 10 },
        { parameter: '열섬 효과', value: (greenReduction + imperviousIncrease) / 2, impact: (greenReduction + imperviousIncrease) * 0.15 },
      ]
    : [
        { parameter: '불투수면 증가', value: imperviousIncrease, impact: imperviousIncrease * 0.2 },
        { parameter: '방어시설 가동', value: floodDefenseEnabled ? 100 : 0, impact: floodDefenseEnabled ? -30 : 0 },
        { parameter: '배수 용량', value: 100 - imperviousIncrease, impact: (100 - imperviousIncrease) * 0.15 },
        { parameter: '저류 능력', value: floodDefenseEnabled ? 70 : 30, impact: floodDefenseEnabled ? 20 : 5 },
      ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="parameter"
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Radar
            name="설정값"
            dataKey="value"
            stroke={mode === 'heat' ? '#f59e0b' : '#3b82f6'}
            fill={mode === 'heat' ? '#f59e0b' : '#3b82f6'}
            fillOpacity={0.5}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(0)}%`, '설정값']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
