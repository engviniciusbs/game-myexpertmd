// =====================================================
// TIPOS PRINCIPAIS DA APLICAÇÃO
// =====================================================

/**
 * Representa uma doença do dia no banco de dados
 */
export interface DiseaseOfTheDay {
  id: string;
  date: string;
  disease_name: string;
  description: string;
  main_symptoms: string[];
  risk_factors: string[];
  differential_diagnoses: string[];
  treatment: string;
  created_at: string;
}

/**
 * Progresso do usuário no jogo
 */
export interface UserProgress {
  id: string;
  user_id?: string; // Para futura implementação de autenticação
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
}

/**
 * Estrutura para pergunta do usuário
 */
export interface UserQuestion {
  question: string;
  disease_data: DiseaseOfTheDay;
}

/**
 * Resposta para pergunta sim/não
 */
export interface QuestionResponse {
  answer: 'Sim' | 'Não' | 'Pergunta inválida';
  explanation?: string;
}

/**
 * Estrutura para requisição de dica
 */
export interface HintRequest {
  disease_data: DiseaseOfTheDay;
  hint_number: number;
  previous_hints?: string[];
}

/**
 * Resposta de dica
 */
export interface HintResponse {
  hint: string;
  hint_number: number;
}

/**
 * Estrutura para tentativa de adivinhação
 */
export interface GuessAttempt {
  guess: string;
  disease_name: string;
  is_correct: boolean;
}

/**
 * Resposta da API submit-guess
 */
export interface SubmitGuessResponse {
  is_correct: boolean;
  guess: string;
  attempts_left: number;
  score: number;
  game_completed: boolean;
  guess_history: string[];
  correct_answer?: string;
  disease_details?: {
    name: string;
    description: string;
    main_symptoms: string[];
    risk_factors: string[];
    differential_diagnoses: string[];
    treatment: string;
  };
}

/**
 * Estado do jogo
 */
export interface GameState {
  disease: DiseaseOfTheDay | null;
  progress: UserProgress | null;
  hints: string[];
  questions: Array<{
    question: string;
    answer: string;
  }>;
  loading: boolean;
  error: string | null;
}

/**
 * Configurações do jogo
 */
export interface GameConfig {
  max_attempts: number;
  max_hints: number;
  max_questions: number;
  points_per_attempt: number;
  points_per_hint: number;
}

/**
 * Resposta padrão da API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Payload para geração de doença
 */
export interface GenerateDiseasePayload {
  force_regenerate?: boolean;
  specialty?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Estatísticas do jogo
 */
export interface GameStats {
  total_games: number;
  games_won: number;
  games_lost: number;
  average_attempts: number;
  average_hints_used: number;
  win_rate: number;
  total_score: number;
}

// =====================================================
// TIPOS DE CONFIGURAÇÃO
// =====================================================

/**
 * Configuração do Supabase
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Configuração da OpenAI
 */
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// =====================================================
// ENUMS
// =====================================================

export enum GameStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  WON = 'won',
  LOST = 'lost',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum Specialty {
  GENERAL = 'general',
  CARDIOLOGY = 'cardiology',
  NEUROLOGY = 'neurology',
  PEDIATRICS = 'pediatrics',
  GASTROENTEROLOGY = 'gastroenterology',
  INFECTIOUS_DISEASES = 'infectious_diseases',
  ENDOCRINOLOGY = 'endocrinology',
  RHEUMATOLOGY = 'rheumatology',
} 