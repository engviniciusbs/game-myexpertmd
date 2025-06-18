// =====================================================
// PÁGINA PRINCIPAL - EVERYDAYMED GAME
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { Stethoscope, Heart, Brain, Lightbulb, MessageCircleQuestion, Send, Trophy, Calendar, Clock, Gauge } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import type { DiseaseOfTheDay, UserProgress, GameState, SubmitGuessResponse } from '@/types';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function GamePage() {
  // =====================================================
  // GERAÇÃO DE SESSION ID ÚNICO
  // =====================================================
  const getOrCreateSessionId = () => {
    if (typeof window === 'undefined') return null;
    
    let sessionId = localStorage.getItem('game_session_id');
    if (!sessionId) {
      // Gera um UUID usando crypto ou fallback
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        sessionId = crypto.randomUUID();
      } else {
        // Fallback para navegadores que não suportam crypto.randomUUID
        sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      }
      localStorage.setItem('game_session_id', sessionId);
    }
    return sessionId;
  };

  // Dados estruturados para SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "myexpertMD - Desafio Médico Diário",
    "description": "Desafie seus conhecimentos médicos com nosso jogo diário! Resolva casos clínicos reais, faça perguntas sim/não e teste sua expertise médica.",
    "url": "https://game-myexpertmd.vercel.app",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL"
    },
    "author": {
      "@type": "Organization",
      "name": "myexpertMD"
    },
    "provider": {
      "@type": "Organization",
      "name": "myexpertMD"
    },
    "inLanguage": "pt-BR",
    "audience": {
      "@type": "Audience",
      "audienceType": ["Medical Students", "Medical Residents", "Healthcare Professionals"]
    },
    "educationalUse": "Medical Education",
    "learningResourceType": "Game",
    "typicalAgeRange": "18+"
  };
  const [gameState, setGameState] = useState<GameState>({
    disease: null,
    progress: null,
    hints: [],
    questions: [],
    loading: true,
    error: null,
  });

  const [currentGuess, setCurrentGuess] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Função para debug/reset de sessão (em caso de problemas)
  const resetSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('game_session_id');
      window.location.reload();
    }
  };

  // =====================================================
  // EFEITOS E CARREGAMENTO INICIAL
  // =====================================================
  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = async () => {
    try {
      setGameState(prev => ({ ...prev, loading: true, error: null }));

      // Busca a doença do dia
      const sessionId = getOrCreateSessionId();
      const response = await fetch(`/api/get-disease-of-the-day?user_id=${sessionId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load game');
      }

      setGameState(prev => ({
        ...prev,
        disease: result.data.disease,
        progress: result.data.user_progress,
        loading: false,
      }));

      // Se não há progresso, inicializa o jogo
      if (!result.data.user_progress) {
        await initializeProgress();
      }

    } catch (error) {
      console.error('Error initializing game:', error);
      setGameState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load game',
      }));
      toast.error('Erro ao carregar o jogo');
    }
  };

  const initializeProgress = async () => {
    try {
      const response = await fetch('/api/get-disease-of-the-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: getOrCreateSessionId() }),
      });

      const result = await response.json();
      if (result.success) {
        setGameState(prev => ({
          ...prev,
          progress: result.data.user_progress,
        }));
      }
    } catch (error) {
      console.error('Error initializing progress:', error);
    }
  };

  // =====================================================
  // FUNÇÕES DE JOGO
  // =====================================================
  const submitGuess = async () => {
    if (!currentGuess.trim()) {
      toast.error('Por favor, digite seu palpite');
      return;
    }

    try {
      const response = await fetch('/api/submit-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: currentGuess.trim(),
          user_id: getOrCreateSessionId(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        const { data } = result;
        
        // Atualiza o progresso
        setGameState(prev => ({
          ...prev,
          progress: {
            ...prev.progress!,
            attempts_left: data.attempts_left,
            guess_history: data.guess_history,
            is_solved: data.is_correct,
            score: data.score,
          },
          // Se o jogo terminou, atualiza a doença com os detalhes completos
          disease: data.game_completed && data.disease_details ? {
            ...prev.disease!,
            disease_name: data.disease_details.name,
            description: data.disease_details.description,
            main_symptoms: data.disease_details.main_symptoms,
            risk_factors: data.disease_details.risk_factors,
            differential_diagnoses: data.disease_details.differential_diagnoses,
            treatment: data.disease_details.treatment,
          } : prev.disease,
        }));

        // Limpa o input
        setCurrentGuess('');

        // Mostra resultado
        if (data.is_correct) {
          toast.success('🎉 Parabéns! Você acertou!');
          setShowResults(true);
        } else if (data.game_completed) {
          toast.error('😞 Jogo encerrado! Tente novamente amanhã.');
          setShowResults(true);
        } else {
          toast.error(`❌ Incorreto! Você tem ${data.attempts_left} tentativas restantes.`);
        }
      } else {
        toast.error(result.error || 'Erro ao processar palpite');
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
      toast.error('Erro ao enviar palpite');
    }
  };

  const askQuestion = async () => {
    if (!currentQuestion.trim()) {
      toast.error('Por favor, digite sua pergunta');
      return;
    }

    try {
      const response = await fetch('/api/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.trim(),
          user_id: getOrCreateSessionId(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        const { data } = result;
        
        // Adiciona pergunta ao histórico
        setGameState(prev => ({
          ...prev,
          questions: [
            ...prev.questions,
            {
              question: data.question,
              answer: data.answer,
            },
          ],
        }));

        // Limpa o input
        setCurrentQuestion('');

        // Mostra resposta
        const answerEmoji = data.answer === 'Sim' ? '✅' : data.answer === 'Não' ? '❌' : '❓';
        toast.success(`${answerEmoji} ${data.answer}`);
      } else {
        toast.error(result.error || 'Erro ao processar pergunta');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      toast.error('Erro ao enviar pergunta');
    }
  };

  const getHint = async () => {
    try {
      const response = await fetch('/api/get-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: getOrCreateSessionId() }),
      });

      const result = await response.json();

      if (result.success) {
        const { data } = result;
        
        // Adiciona dica ao histórico
        setGameState(prev => ({
          ...prev,
          hints: [...prev.hints, data.hint],
          progress: {
            ...prev.progress!,
            hints_used: data.hints_used,
          },
        }));

        toast.success(`💡 Dica ${data.hint_number}: ${data.hint}`);
      } else {
        toast.error(result.error || 'Erro ao obter dica');
      }
    } catch (error) {
      console.error('Error getting hint:', error);
      toast.error('Erro ao obter dica');
    }
  };

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================
  if (gameState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando o jogo...</p>
        </div>
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Erro ao carregar o jogo</h2>
          <p className="text-gray-600 mb-4">{gameState.error}</p>
          <button
            onClick={initializeGame}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isGameCompleted = gameState.progress?.is_solved || (gameState.progress?.attempts_left ?? 0) <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
          },
        }}
      />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 shadow-2xl border-b border-slate-600">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Stethoscope className="h-8 w-8 sm:h-10 sm:w-10 text-cyan-400 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  myexpertMD
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">🎯 Desafio Médico Diário</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2 bg-slate-700/50 px-3 py-2 rounded-lg border border-slate-600">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-slate-200 font-medium">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              
              {gameState.progress && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <span className="text-lg font-bold text-yellow-300">{gameState.progress.score}</span>
                  <span className="text-xs text-yellow-200">pts</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        {/* Status do Jogo - Gamificado */}
        {gameState.progress && (
          <div className="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-600/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                <Gauge className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                <span>Status da Missão</span>
              </h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
                {/* Tentativas */}
                <div className="flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-3 sm:px-4 py-2 rounded-xl border border-green-500/30 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                          i < (gameState.progress?.attempts_left ?? 0)
                            ? 'bg-green-400 shadow-lg shadow-green-400/50'
                            : 'bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-green-300">
                    {gameState.progress.attempts_left} vidas
                  </span>
                </div>
                
                {/* Dicas */}
                <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-3 sm:px-4 py-2 rounded-xl border border-yellow-500/30 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <Lightbulb
                        key={i}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${
                          i < (gameState.progress?.hints_used ?? 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-yellow-300">
                    {gameState.progress.hints_used}/3 dicas
                  </span>
                </div>
              </div>
            </div>
            
            {gameState.progress.guess_history.length > 0 && (
              <div className="border-t border-slate-600/50 pt-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Tentativas Anteriores:</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {gameState.progress.guess_history.map((guess, index) => {
                    // Verifica se este palpite foi o correto (última tentativa + jogo resolvido)
                    const isCorrectGuess = gameState.progress?.is_solved && 
                                         index === gameState.progress.guess_history.length - 1;
                    
                    return (
                      <span
                        key={index}
                        className={`px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm ${
                          isCorrectGuess
                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30'
                            : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {isCorrectGuess ? '✅' : '❌'} {guess}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Caso Clínico - Gamificado */}
        {gameState.disease && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-600/50">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="relative">
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-red-400 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">📋 Caso Clínico</h2>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
              <p className="text-slate-200 leading-relaxed text-base sm:text-lg font-medium">{gameState.disease.description}</p>
            </div>
            
            {/* Só mostra informações adicionais se o jogo acabou */}
            {isGameCompleted && (
              <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 border-t border-slate-600/50 pt-4 sm:pt-6">
                <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-600/30">
                  <h3 className="font-bold text-cyan-400 mb-2 sm:mb-3 flex items-center space-x-2 text-sm sm:text-base">
                    <span>🔍</span>
                    <span>Sintomas Principais:</span>
                  </h3>
                  <ul className="space-y-1 sm:space-y-2">
                    {gameState.disease.main_symptoms.map((symptom, index) => (
                      <li key={index} className="text-slate-300 flex items-start space-x-2 text-sm sm:text-base">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-600/30">
                  <h3 className="font-bold text-orange-400 mb-2 sm:mb-3 flex items-center space-x-2 text-sm sm:text-base">
                    <span>⚠️</span>
                    <span>Fatores de Risco:</span>
                  </h3>
                  <ul className="space-y-1 sm:space-y-2">
                    {gameState.disease.risk_factors.map((factor, index) => (
                      <li key={index} className="text-slate-300 flex items-start space-x-2 text-sm sm:text-base">
                        <span className="text-orange-400 mt-1">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="md:col-span-2 bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-600/30">
                  <h3 className="font-bold text-purple-400 mb-2 sm:mb-3 flex items-center space-x-2 text-sm sm:text-base">
                    <span>🎯</span>
                    <span>Diagnósticos Diferenciais:</span>
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-2">
                    {gameState.disease.differential_diagnoses.map((diagnosis, index) => (
                      <li key={index} className="text-slate-300 flex items-start space-x-2 text-sm sm:text-base">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{diagnosis}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Dica para usar as funcionalidades do jogo */}
            {!isGameCompleted && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 backdrop-blur-sm">
                <p className="text-cyan-200 flex items-start sm:items-center space-x-2 text-sm sm:text-base">
                  <span className="text-xl sm:text-2xl flex-shrink-0">💡</span>
                  <span><strong className="text-cyan-300">Dica:</strong> Use as perguntas sim/não e solicite dicas para investigar o caso!</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dicas - Gamificadas */}
        {gameState.hints.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-600/50">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="relative">
                <Lightbulb className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-400 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">💡 Dicas Reveladas</h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {gameState.hints.map((hint, index) => (
                <div key={index} className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl p-3 sm:p-4 border border-yellow-500/30 backdrop-blur-sm">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">
                      {index + 1}
                    </span>
                    <p className="text-yellow-100 font-medium leading-relaxed text-sm sm:text-base">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Perguntas e Respostas - Gamificadas */}
        {gameState.questions.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-600/50">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="relative">
                <MessageCircleQuestion className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">🔍 Investigação</h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {gameState.questions.map((qa, index) => (
                <div key={index} className="bg-slate-900/50 rounded-xl p-3 sm:p-4 border border-slate-600/30">
                  <div className="space-y-2">
                    <p className="text-slate-200 font-medium flex items-start space-x-2 text-sm sm:text-base">
                      <span className="text-blue-400 font-bold">Q:</span>
                      <span>{qa.question}</span>
                    </p>
                    <p className="text-slate-300 flex items-start space-x-2 text-sm sm:text-base">
                      <span className="text-cyan-400 font-bold">R:</span>
                      <span className={`font-bold ${
                        qa.answer === 'Sim' ? 'text-green-400' : 
                        qa.answer === 'Não' ? 'text-red-400' : 
                        'text-slate-400'
                      }`}>
                        {qa.answer === 'Sim' ? '✅ Sim' : qa.answer === 'Não' ? '❌ Não' : `❓ ${qa.answer}`}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles do Jogo - Gamificados */}
        {!isGameCompleted && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-600/50">
            <div className="space-y-6 sm:space-y-8">
              {/* Fazer Pergunta */}
              <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
                <label className="block text-base sm:text-lg font-bold text-cyan-400 mb-3 sm:mb-4 flex items-center space-x-2">
                  <MessageCircleQuestion className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>🤔 Investigar Caso (Sim/Não)</span>
                </label>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <input
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="Ex: O paciente apresenta febre?"
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 font-medium text-sm sm:text-base"
                    onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                  />
                  <button
                    onClick={askQuestion}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 flex items-center justify-center space-x-2 font-bold shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 text-sm sm:text-base"
                  >
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Perguntar</span>
                  </button>
                </div>
              </div>

              {/* Pedir Dica */}
              <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
                <button
                  onClick={getHint}
                  disabled={(gameState.progress?.hints_used ?? 0) >= 3}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl hover:from-yellow-600 hover:to-amber-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed flex items-center justify-center space-x-2 sm:space-x-3 font-bold text-base sm:text-lg shadow-lg hover:shadow-yellow-500/25 transition-all duration-200 disabled:shadow-none"
                >
                  <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>
                    💡 Solicitar Dica ({(gameState.progress?.hints_used ?? 0)}/3)
                  </span>
                </button>
              </div>

              {/* Submeter Palpite */}
              <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 border border-slate-600/30">
                <label className="block text-base sm:text-lg font-bold text-green-400 mb-3 sm:mb-4 flex items-center space-x-2">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>🎯 Diagnóstico Final</span>
                </label>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <input
                    type="text"
                    value={currentGuess}
                    onChange={(e) => setCurrentGuess(e.target.value)}
                    placeholder="Ex: Pneumonia, Diabetes, Hipertensão..."
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 font-medium text-sm sm:text-base"
                    onKeyPress={(e) => e.key === 'Enter' && submitGuess()}
                  />
                  <button
                    onClick={submitGuess}
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center justify-center space-x-2 font-bold shadow-lg hover:shadow-green-500/25 transition-all duration-200 text-sm sm:text-base"
                  >
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Diagnosticar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultado Final - Gamificado */}
        {isGameCompleted && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-8 border border-slate-600/50">
            <div className="text-center">
              <div className="mb-6 sm:mb-8">
                {gameState.progress?.is_solved ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="relative">
                      <Trophy className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-yellow-400 drop-shadow-2xl" />
                      <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-400 rounded-full animate-bounce"></div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                        🎉 PARABÉNS!
                      </h2>
                      <p className="text-lg sm:text-xl text-green-400 font-bold">Diagnóstico Correto!</p>
                      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-3 sm:p-4 border border-yellow-500/30 inline-block">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-300">
                          {gameState.progress.score} pontos
                        </p>
                        <p className="text-xs sm:text-sm text-yellow-200">Pontuação Final</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="relative">
                      <Clock className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-red-400 drop-shadow-2xl" />
                      <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                        ⏰ TEMPO ESGOTADO
                      </h2>
                      <p className="text-lg sm:text-xl text-red-400 font-bold">Tentativas Esgotadas!</p>
                      <p className="text-slate-300 text-sm sm:text-base">Não desista, tente novamente amanhã!</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-900/50 rounded-2xl p-4 sm:p-6 border border-slate-600/30 space-y-4 sm:space-y-6">
                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-cyan-400 mb-2 sm:mb-3 flex items-center justify-center space-x-2">
                    <span>🎯</span>
                    <span>Resposta Correta:</span>
                  </h3>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {gameState.disease?.disease_name || 'Nome não disponível'}
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-600/30 text-left">
                  <h4 className="font-bold text-green-400 mb-2 sm:mb-3 flex items-center space-x-2 text-sm sm:text-base">
                    <span>💊</span>
                    <span>Tratamento:</span>
                  </h4>
                  <p className="text-slate-200 leading-relaxed text-sm sm:text-base">{gameState.disease?.treatment}</p>
                </div>
              </div>
              
              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 backdrop-blur-sm">
                <p className="text-purple-200 flex items-center justify-center space-x-2 text-sm sm:text-base">
                  <span className="text-xl sm:text-2xl">🌅</span>
                  <span className="font-medium">Volte amanhã para um novo desafio médico!</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Dados estruturados para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
