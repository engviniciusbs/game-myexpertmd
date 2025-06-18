// =====================================================
// API ROUTE: /api/get-hint
// Gera dicas progressivas sobre a doença do dia
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { generateHint } from '@/lib/openai';
import type { ApiResponse, DiseaseOfTheDay, UserProgress } from '@/types';

/**
 * POST /api/get-hint
 * Gera uma dica progressiva sobre a doença do dia
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

    // Busca o progresso do usuário para hoje
    const userIdValue = user_id || null;
    
    let query = supabase
      .from('user_progress')
      .select('*')
      .eq('date', today);
    
    // Usa .is() para null, .eq() para valores não-null
    if (userIdValue === null) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userIdValue);
    }
    
    let { data: userProgress, error: progressError } = await query.single();

    if (progressError && progressError.code === 'PGRST116') {
      // Cria novo progresso se não existir
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

      userProgress = newProgress;
    } else if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to fetch user progress',
      }, { status: 500 });
    }

    // Verifica se o jogo já foi resolvido
    if (userProgress.is_solved) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Game already completed for today',
      }, { status: 400 });
    }

    // Verifica se o usuário ainda tem tentativas
    if (userProgress.attempts_left <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No attempts left for today',
      }, { status: 400 });
    }

    // Verifica limite de dicas
    const maxHints = parseInt(process.env.GAME_MAX_HINTS || '3');
    if (userProgress.hints_used >= maxHints) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Maximum of ${maxHints} hints per day reached`,
      }, { status: 400 });
    }

    // Determina o número da próxima dica
    const nextHintNumber = userProgress.hints_used + 1;

    // Gera a dica usando OpenAI
    console.log(`Generating hint ${nextHintNumber} for disease:`, todayDisease.disease_name);
    
    // Para dicas anteriores, usamos um histórico simulado baseado no número de dicas já usadas
    const previousHints: string[] = [];
    for (let i = 1; i < nextHintNumber; i++) {
      previousHints.push(`Dica ${i} foi fornecida anteriormente`);
    }

    const hint = await generateHint(todayDisease, nextHintNumber, previousHints);

    // Atualiza o progresso do usuário
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        hints_used: nextHintNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProgress.id);

    if (updateError) {
      console.error('Error updating user progress:', updateError);
      // Não falha a requisição por erro de atualização
    }

    console.log(`Hint ${nextHintNumber} generated successfully`);

    return NextResponse.json<ApiResponse<{
      hint: string;
      hint_number: number;
      hints_used: number;
      max_hints: number;
      remaining_hints: number;
    }>>({
      success: true,
      data: {
        hint,
        hint_number: nextHintNumber,
        hints_used: nextHintNumber,
        max_hints: maxHints,
        remaining_hints: maxHints - nextHintNumber,
      },
      message: 'Hint generated successfully',
    });

  } catch (error) {
    console.error('Error in get-hint API:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * GET /api/get-hint
 * Retorna informações sobre o endpoint (documentação)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/get-hint',
    method: 'POST',
    description: 'Generates progressive hints about the disease of the day',
    parameters: {
      user_id: {
        type: 'string',
        required: false,
        description: 'User ID for tracking progress (optional for anonymous users)',
      },
    },
    example_request: {
      user_id: 'user-uuid-optional',
    },
    example_response: {
      success: true,
      data: {
        hint: 'Esta condição afeta principalmente o sistema respiratório.',
        hint_number: 1,
        hints_used: 1,
        max_hints: 3,
        remaining_hints: 2,
      },
      message: 'Hint generated successfully',
    },
    limits: {
      max_hints_per_day: process.env.GAME_MAX_HINTS || '3',
    },
    hint_progression: {
      1: 'Mais sutil, categoria/sistema afetado',
      2: 'Mais específica, sintomas característicos',
      3: 'Mais direta, quase reveladora',
    },
  });
} 