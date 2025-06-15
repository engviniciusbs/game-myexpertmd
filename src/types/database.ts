// =====================================================
// TIPOS DO BANCO DE DADOS SUPABASE
// =====================================================

export interface Database {
  public: {
    Tables: {
      disease_of_the_day: {
        Row: {
          id: string;
          date: string;
          disease_name: string;
          description: string;
          main_symptoms: string[];
          risk_factors: string[];
          differential_diagnoses: string[];
          treatment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          disease_name: string;
          description: string;
          main_symptoms: string[];
          risk_factors: string[];
          differential_diagnoses: string[];
          treatment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          disease_name?: string;
          description?: string;
          main_symptoms?: string[];
          risk_factors?: string[];
          differential_diagnoses?: string[];
          treatment?: string;
          created_at?: string;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string | null;
          disease_id: string;
          date: string;
          attempts_left: number;
          hints_used: number;
          questions_asked: string[];
          is_solved: boolean;
          guess_history: string[];
          score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          disease_id: string;
          date: string;
          attempts_left?: number;
          hints_used?: number;
          questions_asked?: string[];
          is_solved?: boolean;
          guess_history?: string[];
          score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          disease_id?: string;
          date?: string;
          attempts_left?: number;
          hints_used?: number;
          questions_asked?: string[];
          is_solved?: boolean;
          guess_history?: string[];
          score?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      game_statistics: {
        Row: {
          id: string;
          user_id: string | null;
          total_games: number;
          games_won: number;
          games_lost: number;
          total_score: number;
          average_attempts: number;
          average_hints_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          total_games?: number;
          games_won?: number;
          games_lost?: number;
          total_score?: number;
          average_attempts?: number;
          average_hints_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          total_games?: number;
          games_won?: number;
          games_lost?: number;
          total_score?: number;
          average_attempts?: number;
          average_hints_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 