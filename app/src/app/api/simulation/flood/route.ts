import { NextRequest, NextResponse } from 'next/server';
import { calculateFloodRiskResult } from '../../../../lib/simulation/floodRisk';
import type { FloodRiskParams } from '../../../../types/simulation';

/**
 * 침수 위험도 시뮬레이션 API
 * POST /api/simulation/flood
 */
export async function POST(request: NextRequest) {
  try {
    const body: FloodRiskParams = await request.json();
    
    // 필수 파라미터 검증
    if (
      typeof body.rainRisk !== 'number' ||
      typeof body.floodTrace !== 'number' ||
      typeof body.impervious !== 'number' ||
      typeof body.riverProximity !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Missing required parameters: rainRisk, floodTrace, impervious, riverProximity' },
        { status: 400 }
      );
    }
    
    // 파라미터 범위 검증 (0~1)
    const params = [
      body.rainRisk,
      body.floodTrace,
      body.impervious,
      body.riverProximity,
      body.imperviousIncrease || 0,
    ];
    
    if (params.some(p => p < 0 || p > 1)) {
      return NextResponse.json(
        { error: 'All parameters must be between 0 and 1' },
        { status: 400 }
      );
    }
    
    // 위험도 계산
    const result = calculateFloodRiskResult({
      rainRisk: body.rainRisk,
      floodTrace: body.floodTrace,
      impervious: body.impervious,
      riverProximity: body.riverProximity,
      imperviousIncrease: body.imperviousIncrease,
      floodDefenseEnabled: body.floodDefenseEnabled ?? false,
    });
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Flood risk calculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

