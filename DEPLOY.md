# 🚀 Guia de Deploy - myexpertMD Game

## 📋 Pré-requisitos

- [ ] Conta na Vercel
- [ ] Repositório Git (GitHub, GitLab, Bitbucket)
- [ ] Domínio `myexpertmd.com.br` configurado
- [ ] Variáveis de ambiente prontas

## 🔧 Passo a Passo

### 1. Preparar o Repositório

```bash
# Criar novo repositório
git init
git add .
git commit -m "Initial commit: myexpertMD Game"

# Conectar ao GitHub
git remote add origin https://github.com/seu-usuario/myexpertmd-game.git
git push -u origin main
```

### 2. Deploy na Vercel

1. **Acesse** [vercel.com](https://vercel.com)
2. **Clique** em "New Project"
3. **Importe** seu repositório
4. **Configure** as seguintes opções:
   - Framework Preset: **Next.js**
   - Root Directory: **frontend** (se necessário)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Configurar Variáveis de Ambiente

No painel da Vercel, vá em **Settings > Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
OPENAI_API_KEY=sk-sua_chave_openai
MAX_ATTEMPTS_PER_DAY=5
```

### 4. Configurar Subdomínio

#### Na Vercel:
1. Vá em **Settings > Domains**
2. Clique em **Add Domain**
3. Digite: `game.myexpertmd.com.br`
4. Clique em **Add**

#### No seu provedor de DNS:
Adicione um registro CNAME:
- **Tipo**: CNAME
- **Nome**: game
- **Valor**: cname.vercel-dns.com
- **TTL**: 3600 (ou automático)

### 5. Verificar Deploy

1. **Aguarde** a propagação DNS (5-30 minutos)
2. **Acesse**: `https://game.myexpertmd.com.br`
3. **Teste** todas as funcionalidades

## 🔍 Verificações Pós-Deploy

### ✅ Checklist de Funcionalidades

- [ ] Página carrega corretamente
- [ ] Caso clínico é exibido
- [ ] Perguntas sim/não funcionam
- [ ] Sistema de dicas funciona
- [ ] Submissão de diagnóstico funciona
- [ ] Pontuação é calculada
- [ ] Interface responsiva no mobile
- [ ] Notificações aparecem

### 🐛 Troubleshooting

#### Erro 500 - Internal Server Error
- Verifique as variáveis de ambiente
- Confira os logs na Vercel
- Teste conexão com Supabase

#### Erro de CORS
- Adicione o domínio nas configurações do Supabase
- Verifique as URLs permitidas

#### Erro de OpenAI
- Confirme se a chave da API está correta
- Verifique se há créditos na conta OpenAI

## 📊 Monitoramento

### Analytics da Vercel
- **Acesse**: Painel da Vercel > Analytics
- **Monitore**: Tempo de resposta, erros, tráfego

### Logs em Tempo Real
```bash
# Instalar Vercel CLI
npm i -g vercel

# Ver logs
vercel logs https://game.myexpertmd.com.br
```

## 🔄 Atualizações

### Deploy Automático
- Cada push na branch `main` faz deploy automático
- Branches de feature criam preview deployments

### Deploy Manual
```bash
# Via CLI
vercel --prod

# Via interface
# Push para main ou usar o botão "Redeploy" na Vercel
```

## 🔒 Configurações de Segurança

### Headers de Segurança
Adicione no `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### Rate Limiting
Configure no Supabase ou use middleware do Next.js

## 📈 Performance

### Otimizações Aplicadas
- ✅ Imagens otimizadas (Next.js Image)
- ✅ CSS minificado (Tailwind)
- ✅ JavaScript otimizado
- ✅ Caching automático da Vercel

### Métricas Esperadas
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

## 🌐 DNS e Domínio

### Configuração Completa
```
# Registros DNS necessários
game.myexpertmd.com.br    CNAME    cname.vercel-dns.com
```

### Verificação
```bash
# Testar resolução DNS
nslookup game.myexpertmd.com.br

# Testar HTTPS
curl -I https://game.myexpertmd.com.br
```

## 📞 Suporte

### Recursos Úteis
- [Documentação Vercel](https://vercel.com/docs)
- [Suporte Vercel](https://vercel.com/support)
- [Status da Vercel](https://vercel-status.com)

### Contatos de Emergência
- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.io

---

🎯 **Seu jogo estará disponível em**: `https://game.myexpertmd.com.br` 