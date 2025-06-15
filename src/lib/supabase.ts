// =====================================================
// CONFIGURAÇÃO DO SUPABASE
// =====================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Validação das variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente público do Supabase (para uso no frontend)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Cliente administrativo do Supabase (para uso no backend/API routes)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Verifica se o cliente administrativo está configurado
 */
export const isAdminConfigured = (): boolean => {
  return supabaseAdmin !== null;
};

/**
 * Obtém o cliente apropriado baseado no contexto
 */
export const getSupabaseClient = (isServerSide = false) => {
  if (isServerSide && supabaseAdmin) {
    return supabaseAdmin;
  }
  return supabase;
};

/**
 * Testa a conexão com o Supabase
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('disease_of_the_day')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
}; 