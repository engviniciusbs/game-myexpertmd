// =====================================================
// API ROUTE: /api/get-disease-of-the-day
// Retorna a doença do dia atual e progresso do usuário
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import type { ApiResponse, DiseaseOfTheDay, UserProgress } from '@/types';

/**
 * GET /api/get-disease-of-the-day
 * Retorna a doença do dia atual e progresso do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Supabase admin client not configured',
      }, { status: 500 });
    }

    // Extrai user_id dos parâmetros da URL
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Busca a doença do dia atual (com fallback automático)
    const { ensureTodayDisease } = await import('@/lib/disease-manager');
    
    let todayDisease: DiseaseOfTheDay;
    try {
      todayDisease = await ensureTodayDisease();
    } catch (error) {
      console.error('Error ensuring today disease:', error);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to get or generate disease for today.',
      }, { status: 500 });
    }

    // Busca o progresso do usuário para hoje
    let userProgress: UserProgress | null = null;
    if (todayDisease) {
      const today = todayDisease.date;
      const userIdValue = userId || null;
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('date', today)
        .is('user_id', userIdValue)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching user progress:', progressError);
        // Continua sem o progresso do usuário
      } else if (progress) {
        userProgress = progress;
      }
    }

    // Prepara dados para retorno (revela nome se jogo terminado)
    const isGameCompleted = userProgress && (userProgress.is_solved || userProgress.attempts_left <= 0);
    
    const publicDiseaseData = {
      id: todayDisease.id,
      date: todayDisease.date,
      // Revela o nome da doença apenas se o jogo terminou
      ...(isGameCompleted && { disease_name: todayDisease.disease_name }),
      description: todayDisease.description,
      main_symptoms: todayDisease.main_symptoms,
      risk_factors: todayDisease.risk_factors,
      differential_diagnoses: todayDisease.differential_diagnoses,
      treatment: todayDisease.treatment,
      created_at: todayDisease.created_at,
    };

    return NextResponse.json<ApiResponse<{
      disease: typeof publicDiseaseData;
      user_progress: UserProgress | null;
      game_config: {
        max_attempts: number;
        max_hints: number;
        max_questions: number;
      };
    }>>({
      success: true,
      data: {
        disease: publicDiseaseData,
        user_progress: userProgress,
        game_config: {
          max_attempts: parseInt(process.env.GAME_MAX_ATTEMPTS || '3'),
          max_hints: parseInt(process.env.GAME_MAX_HINTS || '3'),
          max_questions: parseInt(process.env.GAME_MAX_QUESTIONS || '10'),
        },
      },
      message: 'Disease of the day retrieved successfully',
    });

  } catch (error) {
    console.error('Error in get-disease-of-the-day API:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * POST /api/get-disease-of-the-day
 * Inicializa o progresso do usuário para hoje
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Supabase admin client not configured',
      }, { status: 500 });
    }

    const body = await request.json();
    const { user_id } = body;

    // Busca a doença do dia atual
    const today = new Date().toISOString().split('T')[0];
    const { data: todayDisease, error: diseaseError } = await supabase
      .from('disease_of_the_day')
      .select('*')
      .eq('date', today)
      .single();

    if (diseaseError || !todayDisease) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No disease found for today. Please generate a disease first.',
      }, { status: 404 });
    }

    // Verifica se já existe progresso do usuário para hoje
    const userIdValue = user_id || null;
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('date', today)
      .is('user_id', userIdValue)
      .single();

    if (existingProgress) {
      // Retorna progresso existente (com nome da doença se jogo terminado)
      const isGameCompleted = existingProgress.is_solved || existingProgress.attempts_left <= 0;
      
      return NextResponse.json<ApiResponse<{
        disease: any; // Tipo flexível para incluir disease_name quando necessário
        user_progress: UserProgress;
        game_config: {
          max_attempts: number;
          max_hints: number;
          max_questions: number;
        };
      }>>({
        success: true,
        data: {
          disease: {
            id: todayDisease.id,
            date: todayDisease.date,
            // Revela o nome da doença apenas se o jogo terminou
            ...(isGameCompleted && { disease_name: todayDisease.disease_name }),
            description: todayDisease.description,
            main_symptoms: todayDisease.main_symptoms,
            risk_factors: todayDisease.risk_factors,
            differential_diagnoses: todayDisease.differential_diagnoses,
            treatment: todayDisease.treatment,
            created_at: todayDisease.created_at,
          },
          user_progress: existingProgress,
          game_config: {
            max_attempts: parseInt(process.env.GAME_MAX_ATTEMPTS || '3'),
            max_hints: parseInt(process.env.GAME_MAX_HINTS || '3'),
            max_questions: parseInt(process.env.GAME_MAX_QUESTIONS || '10'),
          },
        },
        message: 'Existing progress retrieved successfully',
      });
    }

    // Cria novo progresso do usuário
    const { data: newProgress, error: createError } = await supabase
      .from('user_progress')
      .insert({
        user_id: user_id || null,
        disease_id: todayDisease.id,
        date: today,
        attempts_left: parseInt(process.env.GAME_MAX_ATTEMPTS || '5'),
        hints_used: 0,
        questions_asked: [],
        is_solved: false,
        guess_history: [],
        score: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user progress:', createError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to create user progress',
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<{
      disease: any; // Tipo flexível para incluir disease_name quando necessário
      user_progress: UserProgress;
      game_config: {
        max_attempts: number;
        max_hints: number;
        max_questions: number;
      };
    }>>({
      success: true,
      data: {
        disease: {
          id: todayDisease.id,
          date: todayDisease.date,
          // Não revela o nome da doença para novo jogo
          description: todayDisease.description,
          main_symptoms: todayDisease.main_symptoms,
          risk_factors: todayDisease.risk_factors,
          differential_diagnoses: todayDisease.differential_diagnoses,
          treatment: todayDisease.treatment,
          created_at: todayDisease.created_at,
        },
        user_progress: newProgress,
        game_config: {
          max_attempts: parseInt(process.env.GAME_MAX_ATTEMPTS || '3'),
          max_hints: parseInt(process.env.GAME_MAX_HINTS || '3'),
          max_questions: parseInt(process.env.GAME_MAX_QUESTIONS || '10'),
        },
      },
      message: 'Game initialized successfully',
    });

  } catch (error) {
    console.error('Error in get-disease-of-the-day POST:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
} 