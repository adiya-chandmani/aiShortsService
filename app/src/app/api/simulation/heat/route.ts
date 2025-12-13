import { NextRequest, NextResponse } from 'next/server';
import { calculateHeatRiskResult } from '../../../../lib/simulation/heatRisk';
import type { HeatRiskParams } from '../../../../types/simulation';

/**
 * 폭염 위험도 시뮬레이션 API
 * POST /api/simulation/heat
 */
export async function POST(request: NextRequest) {
  try {
    const body: HeatRiskParams = await request.json();
    
    // 필수 파라미터 검증
    if (
      typeof body.heatIndex !== 'number' ||
      typeof body.impervious !== 'number' ||
      typeof body.green !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Missing required parameters: heatIndex, impervious, green' },
        { status: 400 }
      );
    }
    
    // 파라미터 범위 검증 (0~1)
    const params = [
      body.heatIndex,
      body.impervious,
      body.green,
      body.greenReduction || 0,
      body.imperviousIncrease || 0,
    ];
    
    if (params.some(p => p < 0 || p > 1)) {
      return NextResponse.json(
        { error: 'All parameters must be between 0 and 1' },
        { status: 400 }
      );
    }
    
    // 위험도 계산
    const result = calculateHeatRiskResult({
      heatIndex: body.heatIndex,
      impervious: body.impervious,
      green: body.green,
      greenReduction: body.greenReduction,
      imperviousIncrease: body.imperviousIncrease,
      shelterEnabled: body.shelterEnabled ?? true,
    });
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Heat risk calculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

