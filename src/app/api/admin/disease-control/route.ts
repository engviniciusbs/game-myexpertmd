// =====================================================
// ADMIN API: /api/admin/disease-control
// Controle administrativo de doenças
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  ensureTodayDisease, 
  checkTodayDisease, 
  regenerateTodayDisease,
  getRecentDiseases,
  getDiseaseStats,
  preGenerateTomorrowDisease 
} from '@/lib/disease-manager';
import type { ApiResponse, DiseaseOfTheDay } from '@/types';

/**
 * GET /api/admin/disease-control?action=status
 * Retorna o status do sistema de doenças
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return await getSystemStatus();
      
      case 'recent':
        const days = parseInt(searchParams.get('days') || '7');
        return await getRecentDiseasesAdmin(days);
      
      case 'stats':
        return await getStatsAdmin();
      
      case 'check-today':
        return await checkTodayAdmin();
      
      case 'check-tomorrow':
        return await checkTomorrowAdmin();
      
      default:
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid action. Use: status, recent, stats, check-today, check-tomorrow',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in disease control GET:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/disease-control
 * Executa ações administrativas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'ensure-today':
        return await ensureTodayAdmin();
      
      case 'regenerate-today':
        return await regenerateTodayAdmin();
      
      case 'pre-generate-tomorrow':
        return await preGenerateTomorrowAdmin();
      
      case 'run-cron-now':
        return await runCronNowAdmin();
      
      default:
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid action. Use: ensure-today, regenerate-today, pre-generate-tomorrow, run-cron-now',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in disease control POST:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * Status geral do sistema
 */
async function getSystemStatus() {
  try {
    const [todayDisease, stats] = await Promise.all([
      checkTodayDisease(),
      getDiseaseStats(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return NextResponse.json<ApiResponse<{
      system_status: string;
      today_disease: {
        exists: boolean;
        name?: string;
        date?: string;
      };
      tomorrow_disease: {
        exists: boolean;
        name?: string;
        date?: string;
      };
      stats: any;
      last_update: string;
    }>>({
      success: true,
      data: {
        system_status: todayDisease ? 'healthy' : 'needs_disease',
        today_disease: {
          exists: !!todayDisease,
          name: todayDisease?.disease_name,
          date: todayDisease?.date,
        },
        tomorrow_disease: {
          exists: false, // Será implementado se necessário
          name: undefined,
          date: tomorrowStr,
        },
        stats,
        last_update: new Date().toISOString(),
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Busca doenças recentes (admin)
 */
async function getRecentDiseasesAdmin(days: number) {
  try {
    const diseases = await getRecentDiseases(days);
    
    return NextResponse.json<ApiResponse<{
      diseases: DiseaseOfTheDay[];
      count: number;
      period_days: number;
    }>>({
      success: true,
      data: {
        diseases,
        count: diseases.length,
        period_days: days,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Estatísticas (admin)
 */
async function getStatsAdmin() {
  try {
    const stats = await getDiseaseStats();
    
    return NextResponse.json<ApiResponse<typeof stats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Verifica doença de hoje (admin)
 */
async function checkTodayAdmin() {
  try {
    const disease = await checkTodayDisease();
    
    return NextResponse.json<ApiResponse<{
      exists: boolean;
      disease: DiseaseOfTheDay | null;
    }>>({
      success: true,
      data: {
        exists: !!disease,
        disease,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Verifica doença de amanhã (admin)
 */
async function checkTomorrowAdmin() {
  try {
    // Implementar se necessário
    return NextResponse.json<ApiResponse<{
      exists: boolean;
      disease: DiseaseOfTheDay | null;
    }>>({
      success: true,
      data: {
        exists: false,
        disease: null,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Garante doença de hoje (admin)
 */
async function ensureTodayAdmin() {
  try {
    const disease = await ensureTodayDisease();
    
    return NextResponse.json<ApiResponse<{
      action: string;
      disease: DiseaseOfTheDay;
      message: string;
    }>>({
      success: true,
      data: {
        action: 'ensure-today',
        disease,
        message: 'Disease ensured for today',
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Regenera doença de hoje (admin)
 */
async function regenerateTodayAdmin() {
  try {
    const disease = await regenerateTodayDisease();
    
    return NextResponse.json<ApiResponse<{
      action: string;
      disease: DiseaseOfTheDay;
      message: string;
    }>>({
      success: true,
      data: {
        action: 'regenerate-today',
        disease,
        message: 'Disease regenerated for today',
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Pré-gera doença de amanhã (admin)
 */
async function preGenerateTomorrowAdmin() {
  try {
    const disease = await preGenerateTomorrowDisease();
    
    return NextResponse.json<ApiResponse<{
      action: string;
      disease: DiseaseOfTheDay | null;
      message: string;
    }>>({
      success: true,
      data: {
        action: 'pre-generate-tomorrow',
        disease,
        message: disease ? 'Disease pre-generated for tomorrow' : 'Tomorrow disease already exists',
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Executa cron job imediatamente (admin)
 */
async function runCronNowAdmin() {
  try {
    // Faz uma requisição para o endpoint de cron
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/cron/daily-disease`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    return NextResponse.json<ApiResponse<{
      action: string;
      cron_result: any;
      message: string;
    }>>({
      success: true,
      data: {
        action: 'run-cron-now',
        cron_result: result,
        message: 'Cron job executed manually',
      },
    });
  } catch (error) {
    throw error;
  }
} 