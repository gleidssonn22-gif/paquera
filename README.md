# Paquera 🎉

Site de relacionamentos sofisticado para **clubewins.com.br**.

## 📁 Estrutura do projeto

```
paquera/
├── index.html              # Landing page
├── sobre.html              # Página "Sobre nós"
├── planos.html             # Planos e preços
├── entrar.html             # Login
├── cadastro.html           # Cadastro
├── _redirects              # Redirecionamentos Cloudflare
├── _headers                # Headers de segurança/cache
├── wrangler.toml           # Config Wrangler (deploy)
├── README.md               # Este arquivo
│
├── app/                    # App interno (após login)
│   ├── dashboard.html      # Descobrir perfis (swipe)
│   ├── matches.html        # Matches
│   ├── chat.html           # Mensagens
│   ├── perfis.html         # Buscar com filtros
│   ├── meu-perfil.html     # Editar perfil
│   └── configuracoes.html  # Configurações da conta
│
├── css/
│   ├── style.css           # Estilos principais (landing, sobre, planos)
│   ├── auth.css            # Estilos de login/cadastro
│   └── app.css             # Estilos do app interno
│
├── js/
│   ├── main.js             # Lógica principal (navbar, FAQ, partículas)
│   ├── auth.js             # Login e cadastro
│   └── app.js              # App interno (swipe, chat, settings)
│
└── assets/
    └── favicon.svg         # Ícone do site
```

## 🚀 Deploy no Cloudflare Pages via GitHub

### Passo 1 — Subir para o GitHub
1. Crie um repositório no GitHub (ex: `paquera`)
2. Faça upload de **todos os arquivos** da pasta `paquera/` para o repositório

### Passo 2 — Conectar no Cloudflare
1. Acesse: [Workers & Pages](https://dash.cloudflare.com/9973626299c58e21427c989510c8d92e/workers-and-pages)
2. Clique em **Create application**
3. Escolha **Import a repository**
4. Autorize o GitHub e selecione o repositório `paquera`
5. Configurações de build:
   - **Build command:** *(deixe vazio — site estático)*
   - **Build output directory:** `/` (raiz)
6. Clique em **Deploy**

### Passo 3 — Domínio personalizado
Após o deploy, adicione `clubewins.com.br` como domínio personalizado:
1. Vá na aba **Domains** do seu projeto
2. Clique em **Set up a custom domain**
3. Digite `clubewins.com.br`
4. Siga as instruções de DNS (se o domínio já estiver no Cloudflare, é automático)

## 🎨 Recursos

- ✅ Landing page sofisticada com animações
- ✅ Sistema de cadastro e login
- ✅ Dashboard com swipe de perfis
- ✅ Sistema de matches
- ✅ Chat em tempo real (simulado)
- ✅ Busca com filtros avançados
- ✅ Edição de perfil
- ✅ Configurações completas (conta, privacidade, segurança, assinatura)
- ✅ Totalmente responsivo (mobile, tablet, desktop)
- ✅ Headers de segurança configurados
- ✅ Cache otimizado para assets

## 🛠️ Tecnologias

- HTML5 semântico
- CSS3 (variáveis, grid, flexbox, animações)
- JavaScript vanilla (sem dependências)
- Cloudflare Pages (hospedagem)

## 📝 Notas

- As funções de login/cadastro/chat são **simulações** no frontend.
- Para funcionalidade real, é necessário um backend (API) ou Cloudflare Workers com D1/KV.
- As cores e gradientes podem ser ajustadas nas variáveis CSS no topo de `css/style.css`.

---

© 2026 Paquera · clubewins.com.br
