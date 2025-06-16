// =====================================================
// API ROUTE: /api/generate-disease
// Gera uma nova doença do dia usando OpenAI
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { generateDiseaseOfTheDay } from '@/lib/openai';
import type { ApiResponse, DiseaseOfTheDay } from '@/types';

/**
 * POST /api/generate-disease
 * Gera uma nova doença do dia e armazena no Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(true); // Usar cliente administrativo
    
    if (!supabase) {
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
      console.error('Error checking existing disease:', checkError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Database error while checking existing disease',
      }, { status: 500 });
    }

    // Se já existe uma doença para hoje, retorna ela (a menos que seja forçada regeneração)
    const body = await request.json().catch(() => ({}));
    const forceRegenerate = body.force_regenerate === true;

    if (existingDisease && !forceRegenerate) {
      return NextResponse.json<ApiResponse<DiseaseOfTheDay>>({
        success: true,
        data: existingDisease,
        message: 'Disease already exists for today',
      });
    }

    // Gera nova doença usando OpenAI
    console.log('Generating new disease for date:', today);
    const newDisease = await generateDiseaseOfTheDay();

    // Se existe uma doença para hoje e é regeneração forçada, deleta a antiga
    if (existingDisease && forceRegenerate) {
      const { error: deleteError } = await supabase
        .from('disease_of_the_day')
        .delete()
        .eq('date', today);

      if (deleteError) {
        console.error('Error deleting existing disease:', deleteError);
        // Continua mesmo com erro de deleção
      }
    }

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
      console.error('Error saving disease to database:', insertError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to save disease to database',
      }, { status: 500 });
    }

    console.log('Successfully generated and saved disease:', savedDisease.disease_name);

    return NextResponse.json<ApiResponse<DiseaseOfTheDay>>({
      success: true,
      data: savedDisease,
      message: 'Disease generated successfully',
    });

  } catch (error) {
    console.error('Error in generate-disease API:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * GET /api/generate-disease
 * Retorna informações sobre o endpoint (documentação)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/generate-disease',
    method: 'POST',
    description: 'Generates a new disease of the day using OpenAI',
    parameters: {
      force_regenerate: {
        type: 'boolean',
        required: false,
        description: 'Force regeneration even if disease already exists for today',
      },
    },
    example_request: {
      force_regenerate: false,
    },
    example_response: {
      success: true,
      data: {
        id: 'uuid',
        date: '2024-01-01',
        disease_name: 'Pneumonia Comunitária',
        description: 'Disease description...',
        main_symptoms: ['Fever', 'Cough', 'Dyspnea'],
        risk_factors: ['Age', 'Smoking'],
        differential_diagnoses: ['Bronchitis', 'Tuberculosis'],
        treatment: 'Treatment description...',
        created_at: '2024-01-01T00:00:00Z',
      },
      message: 'Disease generated successfully',
    },
  });
}

/**
 * Função utilitária para testar a geração de doença (uso interno)
 */
async function testDiseaseGeneration() {
  try {
    const disease = await generateDiseaseOfTheDay();
    console.log('Test disease generation:', disease);
    return disease;
  } catch (error) {
    console.error('Test disease generation failed:', error);
    throw error;
  }
} 