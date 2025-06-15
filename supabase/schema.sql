-- =====================================================
-- SCHEMA DO BANCO DE DADOS - EVERYDAYMED GAME
-- =====================================================
-- Este arquivo contém todas as tabelas, índices e funções
-- necessárias para o funcionamento do mini game médico
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: disease_of_the_day
-- Armazena as doenças geradas diariamente pela OpenAI
-- =====================================================
CREATE TABLE disease_of_the_day (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    disease_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    main_symptoms TEXT[] NOT NULL DEFAULT '{}',
    risk_factors TEXT[] NOT NULL DEFAULT '{}',
    differential_diagnoses TEXT[] NOT NULL DEFAULT '{}',
    treatment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date CHECK (date >= '2024-01-01'),
    CONSTRAINT non_empty_disease_name CHECK (LENGTH(TRIM(disease_name)) > 0),
    CONSTRAINT non_empty_description CHECK (LENGTH(TRIM(description)) > 0),
    CONSTRAINT non_empty_treatment CHECK (LENGTH(TRIM(treatment)) > 0)
);

-- Índices para otimização
CREATE INDEX idx_disease_date ON disease_of_the_day(date DESC);
CREATE INDEX idx_disease_created_at ON disease_of_the_day(created_at DESC);
CREATE INDEX idx_disease_name ON disease_of_the_day(disease_name);

-- =====================================================
-- TABELA: user_progress
-- Armazena o progresso diário de cada usuário
-- =====================================================
CREATE TABLE user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NULL, -- Para futura implementação de autenticação
    disease_id UUID NOT NULL REFERENCES disease_of_the_day(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    attempts_left INTEGER NOT NULL DEFAULT 5,
    hints_used INTEGER NOT NULL DEFAULT 0,
    questions_asked TEXT[] NOT NULL DEFAULT '{}',
    is_solved BOOLEAN NOT NULL DEFAULT FALSE,
    guess_history TEXT[] NOT NULL DEFAULT '{}',
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_attempts CHECK (attempts_left >= 0 AND attempts_left <= 5),
    CONSTRAINT valid_hints CHECK (hints_used >= 0 AND hints_used <= 3),
    CONSTRAINT valid_score CHECK (score >= 0),
    CONSTRAINT valid_date CHECK (date >= '2024-01-01'),
    
    -- Unique constraint para evitar múltiplos registros por usuário/dia
    UNIQUE(user_id, date)
);

-- Índices para otimização
CREATE INDEX idx_progress_user_date ON user_progress(user_id, date DESC);
CREATE INDEX idx_progress_disease ON user_progress(disease_id);
CREATE INDEX idx_progress_date ON user_progress(date DESC);
CREATE INDEX idx_progress_solved ON user_progress(is_solved, date);

-- =====================================================
-- TABELA: game_statistics
-- Armazena estatísticas agregadas dos jogadores
-- =====================================================
CREATE TABLE game_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NULL, -- Para futura implementação de autenticação
    total_games INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    games_lost INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    average_attempts DECIMAL(3,2) NOT NULL DEFAULT 0,
    average_hints_used DECIMAL(3,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_games CHECK (total_games >= 0),
    CONSTRAINT valid_wins CHECK (games_won >= 0 AND games_won <= total_games),
    CONSTRAINT valid_losses CHECK (games_lost >= 0 AND games_lost <= total_games),
    CONSTRAINT valid_total_score CHECK (total_score >= 0),
    CONSTRAINT valid_avg_attempts CHECK (average_attempts >= 0 AND average_attempts <= 3),
    CONSTRAINT valid_avg_hints CHECK (average_hints_used >= 0 AND average_hints_used <= 3),
    CONSTRAINT games_consistency CHECK (games_won + games_lost = total_games),
    
    -- Unique constraint para um registro por usuário
    UNIQUE(user_id)
);

-- Índices para otimização
CREATE INDEX idx_stats_user ON game_statistics(user_id);
CREATE INDEX idx_stats_total_score ON game_statistics(total_score DESC);
CREATE INDEX idx_stats_win_rate ON game_statistics((games_won::decimal / NULLIF(total_games, 0)) DESC);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_statistics_updated_at 
    BEFORE UPDATE ON game_statistics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO: get_today_disease
-- Retorna a doença do dia atual
-- =====================================================
CREATE OR REPLACE FUNCTION get_today_disease()
RETURNS TABLE (
    id UUID,
    date DATE,
    disease_name VARCHAR(255),
    description TEXT,
    main_symptoms TEXT[],
    risk_factors TEXT[],
    differential_diagnoses TEXT[],
    treatment TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.date, d.disease_name, d.description, 
           d.main_symptoms, d.risk_factors, d.differential_diagnoses, 
           d.treatment, d.created_at
    FROM disease_of_the_day d
    WHERE d.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: get_user_progress_today
-- Retorna o progresso do usuário para hoje
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_progress_today(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    disease_id UUID,
    date DATE,
    attempts_left INTEGER,
    hints_used INTEGER,
    questions_asked TEXT[],
    is_solved BOOLEAN,
    guess_history TEXT[],
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT up.id, up.user_id, up.disease_id, up.date,
           up.attempts_left, up.hints_used, up.questions_asked,
           up.is_solved, up.guess_history, up.score,
           up.created_at, up.updated_at
    FROM user_progress up
    WHERE up.date = CURRENT_DATE 
    AND (p_user_id IS NULL OR up.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: update_user_statistics
-- Atualiza as estatísticas do usuário
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_statistics(
    p_user_id UUID,
    p_game_won BOOLEAN,
    p_attempts_used INTEGER,
    p_hints_used INTEGER,
    p_score INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_stats RECORD;
BEGIN
    -- Busca estatísticas atuais ou cria registro se não existir
    SELECT * INTO current_stats
    FROM game_statistics
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Cria novo registro de estatísticas
        INSERT INTO game_statistics (
            user_id, total_games, games_won, games_lost, total_score,
            average_attempts, average_hints_used
        ) VALUES (
            p_user_id,
            1,
            CASE WHEN p_game_won THEN 1 ELSE 0 END,
            CASE WHEN p_game_won THEN 0 ELSE 1 END,
            p_score,
            p_attempts_used,
            p_hints_used
        );
    ELSE
        -- Atualiza estatísticas existentes
        UPDATE game_statistics SET
            total_games = current_stats.total_games + 1,
            games_won = current_stats.games_won + CASE WHEN p_game_won THEN 1 ELSE 0 END,
            games_lost = current_stats.games_lost + CASE WHEN p_game_won THEN 0 ELSE 1 END,
            total_score = current_stats.total_score + p_score,
            average_attempts = (
                (current_stats.average_attempts * current_stats.total_games + p_attempts_used) 
                / (current_stats.total_games + 1)
            ),
            average_hints_used = (
                (current_stats.average_hints_used * current_stats.total_games + p_hints_used) 
                / (current_stats.total_games + 1)
            )
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilita RLS nas tabelas
ALTER TABLE disease_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;

-- Políticas para disease_of_the_day (leitura pública)
CREATE POLICY "Diseases are viewable by everyone" ON disease_of_the_day
    FOR SELECT USING (true);

-- Políticas para user_progress (isolamento por usuário)
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own progress" ON user_progress
    FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON user_progress
    FOR UPDATE USING (user_id IS NULL OR user_id = auth.uid());

-- Políticas para game_statistics (isolamento por usuário)
CREATE POLICY "Users can view own statistics" ON game_statistics
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own statistics" ON game_statistics
    FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can update own statistics" ON game_statistics
    FOR UPDATE USING (user_id IS NULL OR user_id = auth.uid());

-- =====================================================
-- DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir uma doença de exemplo para testes
-- INSERT INTO disease_of_the_day (
--     date, disease_name, description, main_symptoms, 
--     risk_factors, differential_diagnoses, treatment
-- ) VALUES (
--     CURRENT_DATE,
--     'Pneumonia Comunitária',
--     'Infecção aguda do parênquima pulmonar adquirida fora do ambiente hospitalar.',
--     ARRAY['Febre', 'Tosse produtiva', 'Dispneia', 'Dor torácica pleurítica'],
--     ARRAY['Idade avançada', 'Tabagismo', 'Doenças crônicas', 'Imunossupressão'],
--     ARRAY['Bronquite aguda', 'Tuberculose', 'Embolia pulmonar', 'Pneumonia atípica'],
--     'Antibioticoterapia empírica com amoxicilina/clavulanato ou azitromicina, suporte sintomático.'
-- );

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================
-- Para usar este schema:
-- 1. Execute este arquivo no SQL Editor do Supabase
-- 2. Configure as variáveis de ambiente no seu projeto
-- 3. Ajuste as políticas RLS conforme necessário
-- 4. Configure os cron jobs para geração automática de doenças
-- ===================================================== 