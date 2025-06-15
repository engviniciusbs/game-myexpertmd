# 🎯 myexpertMD Game

Jogo médico diário onde profissionais e estudantes de medicina podem testar seus conhecimentos diagnosticando casos clínicos enigmáticos.

## 🚀 Funcionalidades

- **Casos Clínicos Diários**: Novos desafios médicos gerados automaticamente
- **Sistema de Tentativas**: 5 tentativas por dia para acertar o diagnóstico
- **Perguntas Sim/Não**: Investigue o caso fazendo perguntas específicas
- **Sistema de Dicas**: Até 3 dicas por caso para ajudar no diagnóstico
- **Pontuação**: Sistema de scoring baseado em performance
- **Interface Gamificada**: Design moderno e responsivo

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **AI**: OpenAI GPT-4 para geração de casos
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📱 Responsivo

Interface totalmente adaptada para:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)

## 🔧 Configuração

### Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
MAX_ATTEMPTS_PER_DAY=5
```

### Instalação

```bash
npm install
npm run dev
```

## 🚀 Deploy na Vercel

1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Configuração de Subdomínio

1. No painel da Vercel, vá em **Domains**
2. Adicione: `game.myexpertmd.com.br`
3. Configure o DNS no seu provedor:
   - Tipo: CNAME
   - Nome: game
   - Valor: cname.vercel-dns.com

## 📊 Estrutura do Banco

- `diseases_of_the_day`: Casos clínicos diários
- `user_progress`: Progresso dos usuários
- `user_questions`: Histórico de perguntas
- `user_hints`: Dicas utilizadas

## 🎮 Como Jogar

1. **Leia o caso clínico** apresentado
2. **Investigue** fazendo perguntas sim/não
3. **Solicite dicas** se necessário (máximo 3)
4. **Faça seu diagnóstico** (5 tentativas por dia)
5. **Volte amanhã** para um novo desafio!

---

Desenvolvido para **myexpertMD** - Educação Médica Gamificada
