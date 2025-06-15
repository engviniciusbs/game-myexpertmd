// =====================================================
// CRON JOB - GERAÇÃO AUTOMÁTICA DE DOENÇAS
// =====================================================

import cron from 'node-cron';

/**
 * Configura o cron job para gerar uma nova doença à meia-noite
 * Executa todos os dias às 00:00 (meia-noite)
 */
export function setupDiseaseGenerationCron() {
  // Só executa em produção ou se explicitamente habilitado
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_CRON !== 'true') {
    console.log('⏰ Cron job disabled in development mode. Set ENABLE_CRON=true to enable.');
    return;
  }

  console.log('⏰ Setting up disease generation cron job...');

  // Cron job para executar à meia-noite todos os dias
  // Formato: "segundos minutos horas dia-do-mês mês dia-da-semana"
  // "0 0 * * *" = À meia-noite (00:00) todos os dias
  const cronExpression = '0 0 * * *'; // Meia-noite todos os dias
  
  // Para testes, você pode usar:
  // const cronExpression = '*/10 * * * * *'; // A cada 10 segundos (apenas para testes)
  // const cronExpression = '0 */5 * * * *'; // A cada 5 minutos (apenas para testes)

  cron.schedule(cronExpression, async () => {
    console.log('🏥 Starting daily disease generation...');
    
    try {
      await generateDailyDisease();
      console.log('✅ Daily disease generation completed successfully');
    } catch (error) {
      console.error('❌ Failed to generate daily disease:', error);
      
      // Opcional: Enviar notificação de erro (email, Slack, etc.)
      await notifyError('Daily disease generation failed', error);
    }
  }, {
    timezone: process.env.TIMEZONE || 'America/Sao_Paulo'
  });

  console.log(`✅ Cron job scheduled: ${cronExpression} (${process.env.TIMEZONE || 'America/Sao_Paulo'})`);
}

/**
 * Gera uma nova doença do dia
 */
async function generateDailyDisease() {
  try {
    // Faz uma requisição para o endpoint de geração de doença
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/generate-disease`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force_regenerate: false, // Não regenera se já existe uma doença para hoje
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate disease');
    }

    console.log(`🎯 Disease generated: ${result.data.disease_name}`);
    
    // Log adicional para monitoramento
    console.log(`📊 Disease details:`, {
      name: result.data.disease_name,
      date: result.data.date,
      symptoms_count: result.data.main_symptoms?.length || 0,
      risk_factors_count: result.data.risk_factors?.length || 0,
    });

    return result.data;
  } catch (error) {
    console.error('Error in generateDailyDisease:', error);
    throw error;
  }
}

/**
 * Notifica sobre erros (pode ser customizado para diferentes canais)
 */
async function notifyError(message: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();
  
  console.error(`🚨 CRON ERROR NOTIFICATION:`, {
    message,
    error: errorMessage,
    timestamp,
    environment: process.env.NODE_ENV,
  });

  // Aqui você pode adicionar integrações para:
  // - Envio de emails
  // - Notificações no Slack
  // - Logs no Sentry
  // - Webhooks personalizados
  
  // Exemplo de webhook (descomente e configure se necessário):
  /*
  try {
    if (process.env.ERROR_WEBHOOK_URL) {
      await fetch(process.env.ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 EverydayMed Cron Error: ${message}`,
          error: errorMessage,
          timestamp,
          environment: process.env.NODE_ENV,
        }),
      });
    }
  } catch (webhookError) {
    console.error('Failed to send error webhook:', webhookError);
  }
  */
}

/**
 * Função para testar a geração de doença manualmente
 */
export async function testDiseaseGeneration() {
  console.log('🧪 Testing disease generation...');
  
  try {
    const disease = await generateDailyDisease();
    console.log('✅ Test successful:', disease);
    return disease;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Função para verificar se uma doença já foi gerada hoje
 */
export async function checkTodayDisease() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/get-disease-of-the-day`);
    const result = await response.json();

    if (result.success && result.data.disease) {
      console.log(`📅 Disease already exists for today: ${result.data.disease.disease_name || 'Unknown'}`);
      return result.data.disease;
    } else {
      console.log('📅 No disease found for today');
      return null;
    }
  } catch (error) {
    console.error('Error checking today disease:', error);
    return null;
  }
}

/**
 * Utilitário para executar o cron job imediatamente (para testes)
 */
export async function runCronJobNow() {
  console.log('🏃‍♂️ Running cron job immediately...');
  
  try {
    await generateDailyDisease();
    console.log('✅ Cron job executed successfully');
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    await notifyError('Manual cron job execution failed', error);
    throw error;
  }
}

/**
 * Função para configurar todos os cron jobs da aplicação
 */
export function setupAllCronJobs() {
  console.log('⚙️ Setting up all cron jobs...');
  
  // Configurar cron job principal
  setupDiseaseGenerationCron();
  
  // Aqui você pode adicionar outros cron jobs:
  // - Limpeza de dados antigos
  // - Envio de relatórios
  // - Backup de dados
  // - etc.
  
  console.log('✅ All cron jobs configured');
}

// =====================================================
// CONFIGURAÇÕES E VALIDAÇÕES
// =====================================================

/**
 * Valida as configurações necessárias para os cron jobs
 */
export function validateCronConfiguration() {
  const requiredVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables for cron jobs:', missingVars);
    return false;
  }

  console.log('✅ Cron configuration validated successfully');
  return true;
}

/**
 * Informações sobre os cron jobs configurados
 */
export function getCronJobInfo() {
  return {
    disease_generation: {
      expression: '0 0 * * *',
      description: 'Generate new disease daily at midnight',
      timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
      enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true',
    },
    configuration: {
      node_env: process.env.NODE_ENV,
      timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
      enable_cron: process.env.ENABLE_CRON,
    },
  };
} 