// =====================================================
// API ROUTE: /api/ask-question
// Processa perguntas sim/não sobre a doença do dia
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { answerYesNoQuestion } from '@/lib/openai';
import type { ApiResponse, DiseaseOfTheDay, UserProgress } from '@/types';

/**
 * POST /api/ask-question
 * Processa uma pergunta sim/não sobre a doença do dia
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

    // Parse do corpo da requisição
    const body = await request.json();
    const { question, user_id } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Question is required and must be a string',
      }, { status: 400 });
    }

    if (question.trim().length < 5) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Question must be at least 5 characters long',
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

    // Busca ou cria o progresso do usuário para hoje
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
          attempts_left: 5,
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

    // Verifica limite de perguntas (opcional, configurável)
    const maxQuestionsPerDay = parseInt(process.env.GAME_MAX_QUESTIONS || '10');
    if (userProgress.questions_asked.length >= maxQuestionsPerDay) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Maximum of ${maxQuestionsPerDay} questions per day reached`,
      }, { status: 400 });
    }

    // Verifica se a pergunta já foi feita
    const normalizedQuestion = question.trim().toLowerCase();
    const alreadyAsked = userProgress.questions_asked.some(
      (q: string) => q.toLowerCase().trim() === normalizedQuestion
    );

    if (alreadyAsked) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'This question has already been asked today',
      }, { status: 400 });
    }

    // Processa a pergunta com OpenAI
    console.log('Processing question:', question);
    const answer = await answerYesNoQuestion(question, todayDisease);

    // Atualiza o progresso do usuário
    const updatedQuestionsAsked = [...userProgress.questions_asked, question.trim()];
    
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        questions_asked: updatedQuestionsAsked,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProgress.id);

    if (updateError) {
      console.error('Error updating user progress:', updateError);
      // Não falha a requisição por erro de atualização
    }

    console.log(`Question answered: "${question}" -> "${answer}"`);

    return NextResponse.json<ApiResponse<{
      question: string;
      answer: 'Sim' | 'Não' | 'Pergunta inválida';
      questions_asked_count: number;
      max_questions: number;
      remaining_questions: number;
    }>>({
      success: true,
      data: {
        question: question.trim(),
        answer,
        questions_asked_count: updatedQuestionsAsked.length,
        max_questions: maxQuestionsPerDay,
        remaining_questions: maxQuestionsPerDay - updatedQuestionsAsked.length,
      },
      message: 'Question processed successfully',
    });

  } catch (error) {
    console.error('Error in ask-question API:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * GET /api/ask-question
 * Retorna informações sobre o endpoint (documentação)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ask-question',
    method: 'POST',
    description: 'Processes yes/no questions about the disease of the day',
    parameters: {
      question: {
        type: 'string',
        required: true,
        description: 'The yes/no question to ask about the disease',
        min_length: 5,
      },
      user_id: {
        type: 'string',
        required: false,
        description: 'User ID for tracking progress (optional for anonymous users)',
      },
    },
    example_request: {
      question: 'O paciente apresenta febre?',
      user_id: 'user-uuid-optional',
    },
    example_response: {
      success: true,
      data: {
        question: 'O paciente apresenta febre?',
        answer: 'Sim',
        questions_asked_count: 1,
        max_questions: 10,
        remaining_questions: 9,
      },
      message: 'Question processed successfully',
    },
    possible_answers: ['Sim', 'Não', 'Pergunta inválida'],
    limits: {
      max_questions_per_day: process.env.GAME_MAX_QUESTIONS || '10',
      min_question_length: 5,
    },
  });
} 