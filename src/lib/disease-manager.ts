// =====================================================
// DISEASE MANAGER - Gerencia doenças diárias
// =====================================================

import { getSupabaseClient } from '@/lib/supabase';
import { generateDiseaseOfTheDay } from '@/lib/openai';
import type { DiseaseOfTheDay } from '@/types';

/**
 * Garante que existe uma doença para hoje
 * Se não existir, gera uma nova automaticamente
 */
export async function ensureTodayDisease(): Promise<DiseaseOfTheDay> {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      throw new Error('Supabase admin client not configured');
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Primeiro, tenta buscar doença existente
    const { data: existingDisease, error: fetchError } = await supabase
      .from('disease_of_the_day')
      .select('*')
      .eq('date', today)
      .single();

    // Se encontrou, retorna
    if (existingDisease && !fetchError) {
      console.log(`✅ Found existing disease for ${today}:`, existingDisease.disease_name);
      return existingDisease;
    }

    // Se não encontrou, gera nova doença
    console.log(`🔄 No disease found for ${today}, generating new one...`);
    
    const newDisease = await generateDiseaseOfTheDay();
    
    // Salva no banco
    const { data: savedDisease, error: saveError } = await supabase
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

    if (saveError) {
      console.error('❌ Error saving generated disease:', saveError);
      throw new Error('Failed to save generated disease');
    }

    console.log(`✅ Generated and saved new disease for ${today}:`, savedDisease.disease_name);
    
    // Notifica sobre geração automática
    await notifyAutoGeneration(savedDisease);
    
    return savedDisease;
    
  } catch (error) {
    console.error('❌ Error in ensureTodayDisease:', error);
    throw error;
  }
}

/**
 * Verifica se há doença para hoje (sem gerar)
 */
export async function checkTodayDisease(): Promise<DiseaseOfTheDay | null> {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data: disease, error } = await supabase
      .from('disease_of_the_day')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking today disease:', error);
      return null;
    }

    return disease || null;
    
  } catch (error) {
    console.error('Error in checkTodayDisease:', error);
    return null;
  }
}

/**
 * Força geração de nova doença (substituindo existente)
 */
export async function regenerateTodayDisease(): Promise<DiseaseOfTheDay> {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      throw new Error('Supabase admin client not configured');
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Deleta doença existente se houver
    await supabase
      .from('disease_of_the_day')
      .delete()
      .eq('date', today);

    console.log(`🔄 Regenerating disease for ${today}...`);
    
    // Gera nova doença
    const newDisease = await generateDiseaseOfTheDay();
    
    // Salva no banco
    const { data: savedDisease, error: saveError } = await supabase
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

    if (saveError) {
      console.error('❌ Error saving regenerated disease:', saveError);
      throw new Error('Failed to save regenerated disease');
    }

    console.log(`✅ Regenerated disease for ${today}:`, savedDisease.disease_name);
    
    return savedDisease;
    
  } catch (error) {
    console.error('❌ Error in regenerateTodayDisease:', error);
    throw error;
  }
}

/**
 * Busca doenças dos últimos N dias
 */
export async function getRecentDiseases(days: number = 7): Promise<DiseaseOfTheDay[]> {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      return [];
    }

    const { data: diseases, error } = await supabase
      .from('disease_of_the_day')
      .select('*')
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      console.error('Error fetching recent diseases:', error);
      return [];
    }

    return diseases || [];
    
  } catch (error) {
    console.error('Error in getRecentDiseases:', error);
    return [];
  }
}

/**
 * Estatísticas de doenças
 */
export async function getDiseaseStats(): Promise<{
  total_diseases: number;
  diseases_this_month: number;
  diseases_this_week: number;
  last_generated: string | null;
}> {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      return {
        total_diseases: 0,
        diseases_this_month: 0,
        diseases_this_week: 0,
        last_generated: null,
      };
    }

    const now = new Date();
    const thisMonth = now.toISOString().substring(0, 7); // YYYY-MM
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Total de doenças
    const { count: totalCount } = await supabase
      .from('disease_of_the_day')
      .select('*', { count: 'exact', head: true });

    // Doenças deste mês
    const { count: monthCount } = await supabase
      .from('disease_of_the_day')
      .select('*', { count: 'exact', head: true })
      .gte('date', `${thisMonth}-01`);

    // Doenças desta semana
    const { count: weekCount } = await supabase
      .from('disease_of_the_day')
      .select('*', { count: 'exact', head: true })
      .gte('date', thisWeekStart);

    // Última doença gerada
    const { data: lastDisease } = await supabase
      .from('disease_of_the_day')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    return {
      total_diseases: totalCount || 0,
      diseases_this_month: monthCount || 0,
      diseases_this_week: weekCount || 0,
      last_generated: lastDisease?.date || null,
    };
    
  } catch (error) {
    console.error('Error in getDiseaseStats:', error);
    return {
      total_diseases: 0,
      diseases_this_month: 0,
      diseases_this_week: 0,
      last_generated: null,
    };
  }
}

/**
 * Notifica sobre geração automática
 */
async function notifyAutoGeneration(disease: DiseaseOfTheDay) {
  try {
    console.log('🤖 AUTO-GENERATION NOTIFICATION:', {
      disease_name: disease.disease_name,
      date: disease.date,
      timestamp: new Date().toISOString(),
      trigger: 'lazy_loading',
    });

    // Aqui você pode adicionar notificações específicas para geração automática
    
  } catch (error) {
    console.error('Error sending auto-generation notification:', error);
  }
}

/**
 * Verifica se é necessário gerar doença para amanhã (pré-geração)
 */
export async function preGenerateTomorrowDisease(): Promise<DiseaseOfTheDay | null> {
  try {
    const supabase = getSupabaseClient(true);
    
    if (!supabase) {
      return null;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Verifica se já existe doença para amanhã
    const { data: existingDisease, error: fetchError } = await supabase
      .from('disease_of_the_day')
      .select('*')
      .eq('date', tomorrowStr)
      .single();

    if (existingDisease && !fetchError) {
      console.log(`✅ Tomorrow's disease already exists:`, existingDisease.disease_name);
      return existingDisease;
    }

    // Gera doença para amanhã
    console.log(`🔮 Pre-generating disease for ${tomorrowStr}...`);
    
    const newDisease = await generateDiseaseOfTheDay();
    // Sobrescreve a data para amanhã
    newDisease.date = tomorrowStr;
    
    // Salva no banco
    const { data: savedDisease, error: saveError } = await supabase
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

    if (saveError) {
      console.error('❌ Error saving tomorrow disease:', saveError);
      return null;
    }

    console.log(`✅ Pre-generated disease for ${tomorrowStr}:`, savedDisease.disease_name);
    
    return savedDisease;
    
  } catch (error) {
    console.error('❌ Error in preGenerateTomorrowDisease:', error);
    return null;
  }
} 