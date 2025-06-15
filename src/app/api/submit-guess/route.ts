// =====================================================
// API ROUTE: /api/submit-guess
// Processa palpites dos usuários sobre a doença do dia
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { checkGuess, calculateScore } from '@/lib/openai';
import type { ApiResponse, DiseaseOfTheDay, UserProgress } from '@/types';

/**
 * POST /api/submit-guess
 * Processa um palpite do usuário sobre a doença do dia
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
    const { guess, user_id } = body;

    if (!guess || typeof guess !== 'string') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Guess is required and must be a string',
      }, { status: 400 });
    }

    if (guess.trim().length < 3) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Guess must be at least 3 characters long',
      }, { status: 400 });
    }

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
    let { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('date', today)
      .is('user_id', userIdValue)
      .single();

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

    // Verifica se o palpite é correto
    const isCorrect = checkGuess(guess.trim(), todayDisease.disease_name);
    
    // Atualiza o histórico de palpites
    const updatedGuessHistory = [...userProgress.guess_history, guess.trim()];
    const newAttemptsLeft = userProgress.attempts_left - 1;

    let finalScore = userProgress.score;
    let gameCompleted = false;

    if (isCorrect) {
      // Palpite correto - calcula pontuação
      finalScore = calculateScore(
        newAttemptsLeft,
        userProgress.hints_used,
        parseInt(process.env.GAME_MAX_ATTEMPTS || '3'),
        parseInt(process.env.GAME_MAX_HINTS || '3')
      );
      gameCompleted = true;
      
      console.log(`Correct guess! Disease: ${todayDisease.disease_name}, Score: ${finalScore}`);
    } else if (newAttemptsLeft <= 0) {
      // Sem mais tentativas - jogo perdido
      finalScore = 0;
      gameCompleted = true;
      
      console.log(`Game lost! Disease was: ${todayDisease.disease_name}`);
    } else {
      console.log(`Incorrect guess: "${guess}" for disease: ${todayDisease.disease_name}`);
    }

    // Atualiza o progresso do usuário
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        attempts_left: newAttemptsLeft,
        guess_history: updatedGuessHistory,
        is_solved: isCorrect,
        score: finalScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProgress.id);

    if (updateError) {
      console.error('Error updating user progress:', updateError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update user progress',
      }, { status: 500 });
    }

    // Se o jogo foi completado, atualiza estatísticas
    if (gameCompleted && user_id) {
      try {
        await supabase.rpc('update_user_statistics', {
          p_user_id: user_id,
          p_game_won: isCorrect,
          p_attempts_used: parseInt(process.env.GAME_MAX_ATTEMPTS || '3') - newAttemptsLeft,
          p_hints_used: userProgress.hints_used,
          p_score: finalScore,
        });
      } catch (statsError) {
        console.error('Error updating user statistics:', statsError);
        // Não falha a requisição por erro de estatísticas
      }
    }

    // Prepara a resposta
    const responseData = {
      is_correct: isCorrect,
      guess: guess.trim(),
      attempts_left: newAttemptsLeft,
      score: finalScore,
      game_completed: gameCompleted,
      guess_history: updatedGuessHistory,
      // Só revela a resposta se o jogo acabou
      correct_answer: gameCompleted ? todayDisease.disease_name : undefined,
      // Informações completas da doença se o jogo acabou
      disease_details: gameCompleted ? {
        name: todayDisease.disease_name,
        description: todayDisease.description,
        main_symptoms: todayDisease.main_symptoms,
        risk_factors: todayDisease.risk_factors,
        differential_diagnoses: todayDisease.differential_diagnoses,
        treatment: todayDisease.treatment,
      } : undefined,
    };

    return NextResponse.json<ApiResponse<typeof responseData>>({
      success: true,
      data: responseData,
      message: isCorrect 
        ? 'Parabéns! Você acertou!' 
        : gameCompleted 
          ? 'Jogo encerrado. Tente novamente amanhã!'
          : 'Palpite incorreto. Tente novamente!',
    });

  } catch (error) {
    console.error('Error in submit-guess API:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * GET /api/submit-guess
 * Retorna informações sobre o endpoint (documentação)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/submit-guess',
    method: 'POST',
    description: 'Processes user guesses about the disease of the day',
    parameters: {
      guess: {
        type: 'string',
        required: true,
        description: 'The disease name guess from the user',
        min_length: 3,
      },
      user_id: {
        type: 'string',
        required: false,
        description: 'User ID for tracking progress (optional for anonymous users)',
      },
    },
    example_request: {
      guess: 'Pneumonia',
      user_id: 'user-uuid-optional',
    },
    example_response: {
      success: true,
      data: {
        is_correct: true,
        guess: 'Pneumonia',
        attempts_left: 2,
        score: 250,
        game_completed: true,
        guess_history: ['Bronquite', 'Pneumonia'],
        correct_answer: 'Pneumonia Comunitária',
        disease_details: {
          name: 'Pneumonia Comunitária',
          description: 'Disease description...',
          main_symptoms: ['Fever', 'Cough'],
          risk_factors: ['Age', 'Smoking'],
          differential_diagnoses: ['Bronchitis'],
          treatment: 'Treatment description...',
        },
      },
      message: 'Parabéns! Você acertou!',
    },
    scoring: {
      base_score: 300,
      attempt_penalty: 50,
      hint_penalty: 25,
      formula: 'max(0, base_score - (attempts_used * attempt_penalty) - (hints_used * hint_penalty))',
    },
    limits: {
      max_attempts_per_day: process.env.GAME_MAX_ATTEMPTS || '3',
      min_guess_length: 3,
    },
  });
} 