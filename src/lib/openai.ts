// =====================================================
// CONFIGURAÇÃO DA OPENAI
// =====================================================

import OpenAI from 'openai';
import type { DiseaseOfTheDay, UserQuestion, HintRequest } from '@/types';

// Validação da API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not configured');
}

// Cliente OpenAI
export const openai = new OpenAI({
  apiKey: apiKey,
});

// =====================================================
// CONFIGURAÇÕES DOS MODELOS
// =====================================================
export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini', // Modelo mais econômico e eficiente
  maxTokens: 1500,
  temperature: 0.7,
} as const;

// =====================================================
// PROMPTS ESPECIALIZADOS
// =====================================================

/**
 * Prompt para gerar a doença do dia
 */
export const GENERATE_DISEASE_PROMPT = `
Você é um especialista em medicina que cria casos clínicos enigmáticos para um jogo educativo.

Sua tarefa é gerar uma doença e criar um caso clínico realista SEM REVELAR o nome da doença.

INSTRUÇÕES:
1. Escolha uma doença real e clinicamente relevante
2. Varie entre especialidades médicas (cardiologia, neurologia, gastroenterologia, etc.)
3. Crie um caso clínico narrativo como se fosse um paciente real
4. NÃO mencione o nome da doença na descrição
5. Seja preciso e baseado em evidências médicas

FORMATO DE RESPOSTA (JSON):
{
  "disease_name": "Nome exato da doença",
  "description": "Caso clínico narrativo sem revelar o diagnóstico. Descreva um paciente fictício apresentando os sintomas, história clínica, exame físico inicial. Use linguagem médica mas SEM nomear a doença. (150-200 palavras)",
  "main_symptoms": ["Sintoma 1", "Sintoma 2", "Sintoma 3", "Sintoma 4", "Sintoma 5"],
  "risk_factors": ["Fator 1", "Fator 2", "Fator 3", "Fator 4"],
  "differential_diagnoses": ["Diagnóstico 1", "Diagnóstico 2", "Diagnóstico 3", "Diagnóstico 4"],
  "treatment": "Abordagem terapêutica completa (100-150 palavras)"
}

EXEMPLO de descrição adequada:
"Paciente feminina, 28 anos, procura atendimento com queixas de fadiga progressiva há 6 meses, episódios de visão turva intermitente e sensação de formigamento em membros inferiores. Relata que os sintomas pioram em dias quentes e após exercícios. No exame neurológico, apresenta reflexos hiperativos e sinal de Babinski positivo bilateralmente. A ressonância magnética do crânio revela lesões hipersintensas periventriculares em T2."

IMPORTANTE:
- NÃO mencione o nome da doença na descrição
- Crie um caso clínico realista e desafiador
- Use terminologia médica apropriada
- Mantenha o mistério diagnóstico
- Responda APENAS com JSON válido
`;

/**
 * Prompt para responder perguntas sim/não
 */
export const QUESTION_ANSWER_PROMPT = `
Você é um médico especialista respondendo perguntas sobre um caso clínico específico.

CONTEXTO DA DOENÇA:
{disease_context}

INSTRUÇÃO:
Responda APENAS "Sim", "Não" ou "Pergunta inválida" baseado nas informações da doença fornecida.

REGRAS:
1. NÃO mencione o nome da doença na resposta
2. NÃO responda com "Sim" ou "Não" se a pergunta for sobre o NOME DA DOENÇA
3. Responda "Sim" se a pergunta for verdadeira para esta doença
4. Responda "Não" se a pergunta for falsa para esta doença  
5. Responda "Pergunta inválida" se:
   - A pergunta não puder ser respondida com sim/não
   - A pergunta não for clinicamente relevante
   - A informação não estiver disponível no contexto fornecido

PERGUNTA DO USUÁRIO: {user_question}

RESPOSTA (apenas uma palavra):
`;

/**
 * Prompt para gerar dicas progressivas
 */
export const GENERATE_HINT_PROMPT = `
Você é um professor de medicina criando dicas educativas para ajudar estudantes a diagnosticar uma doença.

CONTEXTO DA DOENÇA:
{disease_context}

INSTRUÇÕES:
- NÃO mencione o nome da doença na descrição
- Crie uma dica progressiva (dica número {hint_number} de 3)
- Dica 1: Mais sutil, categoria/sistema afetado
- Dica 2: Mais específica, sintomas característicos
- Dica 3: Mais direta, quase reveladora

DICAS ANTERIORES: {previous_hints}

FORMATO DE RESPOSTA:
Forneça uma dica educativa de 1-2 frases que ajude o estudante sem revelar completamente a resposta.

DICA {hint_number}:
`;

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

/**
 * Gera uma nova doença do dia usando OpenAI
 */
export async function generateDiseaseOfTheDay(): Promise<DiseaseOfTheDay> {
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: GENERATE_DISEASE_PROMPT,
        },
      ],
      max_tokens: OPENAI_CONFIG.maxTokens,
      temperature: OPENAI_CONFIG.temperature,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const diseaseData = JSON.parse(content);
    
    // Validação básica dos dados
    if (!diseaseData.disease_name || !diseaseData.description) {
      throw new Error('Invalid disease data received from OpenAI');
    }

    // Adiciona campos necessários para o banco
    const today = new Date().toISOString().split('T')[0];
    
    return {
      id: '', // Será gerado pelo banco
      date: today,
      disease_name: diseaseData.disease_name,
      description: diseaseData.description,
      main_symptoms: diseaseData.main_symptoms || [],
      risk_factors: diseaseData.risk_factors || [],
      differential_diagnoses: diseaseData.differential_diagnoses || [],
      treatment: diseaseData.treatment,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating disease:', error);
    throw new Error('Failed to generate disease of the day');
  }
}

/**
 * Responde pergunta sim/não sobre a doença
 */
export async function answerYesNoQuestion(
  question: string,
  diseaseData: DiseaseOfTheDay
): Promise<'Sim' | 'Não' | 'Pergunta inválida'> {
  try {
    const diseaseContext = `
DOENÇA: ${diseaseData.disease_name}
DESCRIÇÃO: ${diseaseData.description}
SINTOMAS: ${diseaseData.main_symptoms.join(', ')}
FATORES DE RISCO: ${diseaseData.risk_factors.join(', ')}
DIAGNÓSTICOS DIFERENCIAIS: ${diseaseData.differential_diagnoses.join(', ')}
TRATAMENTO: ${diseaseData.treatment}
    `.trim();

    const prompt = QUESTION_ANSWER_PROMPT
      .replace('{disease_context}', diseaseContext)
      .replace('{user_question}', question);

    const completion = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
      ],
      max_tokens: 10,
      temperature: 0.1, // Baixa temperatura para respostas consistentes
    });

    const content = completion.choices[0]?.message?.content?.trim() || '';
    
    // Normaliza a resposta
    if (content.toLowerCase().includes('sim')) return 'Sim';
    if (content.toLowerCase().includes('não') || content.toLowerCase().includes('nao')) return 'Não';
    return 'Pergunta inválida';
    
  } catch (error) {
    console.error('Error answering question:', error);
    return 'Pergunta inválida';
  }
}

/**
 * Gera dica progressiva sobre a doença
 */
export async function generateHint(
  diseaseData: DiseaseOfTheDay,
  hintNumber: number,
  previousHints: string[] = []
): Promise<string> {
  try {
    const diseaseContext = `
DOENÇA: ${diseaseData.disease_name}
DESCRIÇÃO: ${diseaseData.description}
SINTOMAS: ${diseaseData.main_symptoms.join(', ')}
FATORES DE RISCO: ${diseaseData.risk_factors.join(', ')}
DIAGNÓSTICOS DIFERENCIAIS: ${diseaseData.differential_diagnoses.join(', ')}
TRATAMENTO: ${diseaseData.treatment}
    `.trim();

    const prompt = GENERATE_HINT_PROMPT
      .replace('{disease_context}', diseaseContext)
      .replace('{hint_number}', hintNumber.toString())
      .replace('{previous_hints}', previousHints.join(' | '));

    const completion = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No hint content received from OpenAI');
    }

    return content;
  } catch (error) {
    console.error('Error generating hint:', error);
    throw new Error('Failed to generate hint');
  }
}

/**
 * Verifica se um palpite está correto
 */
export function checkGuess(guess: string, correctAnswer: string): boolean {
  const normalizeString = (str: string) => 
    str.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '') // Remove acentos
       .replace(/[^a-z0-9\s]/g, '') // Remove pontuação
       .trim();

  const normalizedGuess = normalizeString(guess);
  const normalizedAnswer = normalizeString(correctAnswer);

  // Verifica correspondência exata
  if (normalizedGuess === normalizedAnswer) return true;

  // Verifica se o palpite contém a resposta ou vice-versa
  if (normalizedGuess.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedGuess)) {
    return true;
  }

  // Verifica palavras-chave importantes (pelo menos 70% de correspondência)
  const guessWords = normalizedGuess.split(/\s+/).filter(word => word.length > 2);
  const answerWords = normalizedAnswer.split(/\s+/).filter(word => word.length > 2);
  
  if (guessWords.length === 0 || answerWords.length === 0) return false;

  const matchingWords = guessWords.filter(word => 
    answerWords.some(answerWord => 
      word.includes(answerWord) || answerWord.includes(word)
    )
  );

  const matchPercentage = matchingWords.length / Math.max(guessWords.length, answerWords.length);
  return matchPercentage >= 0.7;
}

/**
 * Calcula pontuação baseada no desempenho
 */
export function calculateScore(
  attemptsLeft: number,
  hintsUsed: number,
  maxAttempts: number = 3,
  maxHints: number = 3
): number {
  const baseScore = 300;
  const attemptPenalty = (maxAttempts - attemptsLeft) * 50;
  const hintPenalty = hintsUsed * 25;
  
  return Math.max(0, baseScore - attemptPenalty - hintPenalty);
} 