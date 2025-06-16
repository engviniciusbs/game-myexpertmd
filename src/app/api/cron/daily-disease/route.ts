// =====================================================
// VERCEL CRON FUNCTION: /api/cron/daily-disease
// Executa diariamente à meia-noite para gerar nova doença
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { generateDiseaseOfTheDay } from '@/lib/openai';
import type { ApiResponse, DiseaseOfTheDay } from '@/types';

/**
 * GET /api/cron/daily-disease
 * Vercel Cron Function - Executa automaticamente à meia-noite
 * Configuração em vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica se é uma requisição de cron válida
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Proteção contra execução não autorizada
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    console.log('🏥 Starting daily disease generation via Vercel Cron...');
    console.log('🕐 Execution time:', new Date().toISOString());

    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      console.error('❌ Supabase admin client not configured');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Supabase admin client not configured',
      }, { status: 500 });
    }

    // Verifica se já existe uma doença para hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: existingDisease, error: checkError } = await supabase
      .from('disease_of_the_day')
      .select('*')
      .eq('date', today)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing disease:', checkError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Database error while checking existing disease',
      }, { status: 500 });
    }

    // Se já existe doença para hoje, não gera nova
    if (existingDisease) {
      console.log(`✅ Disease already exists for ${today}:`, existingDisease.disease_name);
      return NextResponse.json<ApiResponse<DiseaseOfTheDay>>({
        success: true,
        data: existingDisease,
        message: 'Disease already exists for today',
      });
    }

    // Gera nova doença usando OpenAI
    console.log('🤖 Generating new disease via OpenAI...');
    const newDisease = await generateDiseaseOfTheDay();

    // Salva nova doença no banco
    const { data: savedDisease, error: insertError } = await supabase
      .from('disease_of_the_day')
      .insert({
        date: newDisease.date,
        disease_name: newDisease.disease_name,
        description: newDisease.description,
        main_symptoms: newDisease.main_symptoms,
        risk_factors: newDisease.risk_factors,
        differential_diagnoses: newDisease.differential_diagnoses,
        treatment: newDisease.treatment,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error saving disease to database:', insertError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to save disease to database',
      }, { status: 500 });
    }

    console.log('✅ Successfully generated and saved disease:', savedDisease.disease_name);
    console.log('📊 Disease stats:', {
      name: savedDisease.disease_name,
      date: savedDisease.date,
      symptoms_count: savedDisease.main_symptoms?.length || 0,
      risk_factors_count: savedDisease.risk_factors?.length || 0,
    });

    // Opcional: Notificar sobre sucesso
    await notifySuccess('Daily disease generated successfully', savedDisease);

    return NextResponse.json<ApiResponse<DiseaseOfTheDay>>({
      success: true,
      data: savedDisease,
      message: 'Daily disease generated successfully',
    });

  } catch (error) {
    console.error('❌ Error in daily disease generation cron:', error);
    
    // Notifica sobre erro
    await notifyError('Daily disease generation failed', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/daily-disease
 * Permite execução manual do cron (para testes)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { test_mode = false } = body;

    console.log('🧪 Manual daily disease generation triggered');
    
    // Redireciona para o GET method
    return GET(request);
    
  } catch (error) {
    console.error('❌ Error in manual daily disease generation:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * Notifica sucesso (pode ser expandido para Slack, email, etc.)
 */
async function notifySuccess(message: string, disease: DiseaseOfTheDay) {
  try {
    console.log('🎉 SUCCESS NOTIFICATION:', {
      message,
      disease_name: disease.disease_name,
      date: disease.date,
      timestamp: new Date().toISOString(),
    });

    // Aqui você pode adicionar notificações:
    // - Slack webhook
    // - Email notification
    // - Discord webhook
    // - Etc.

  } catch (error) {
    console.error('Error sending success notification:', error);
  }
}

/**
 * Notifica erro (pode ser expandido para Slack, email, etc.)
 */
async function notifyError(message: string, error: any) {
  try {
    console.error('🚨 ERROR NOTIFICATION:', {
      message,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Aqui você pode adicionar notificações de erro:
    // - Slack webhook
    // - Email notification
    // - Discord webhook
    // - Sentry
    // - Etc.

  } catch (notificationError) {
    console.error('Error sending error notification:', notificationError);
  }
} 