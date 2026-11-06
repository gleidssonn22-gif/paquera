# 💘 Paquera — Site de Relacionamento (Static SPA)

Um site de relacionamento completo, **100% estático** (HTML + CSS + JavaScript puro, sem backend, sem build), pronto para subir no **GitHub Pages** e **Cloudflare Pages**.

Feito em português, com design mobile-first inspirado nos grandes apps de relacionamento.

---

## ✨ Funcionalidades

- **Landing page** completa: hero, como funciona, recursos, depoimentos, CTA e rodapé
- **Cadastro / Login** simulado (dados salvos no navegador via `localStorage`)
- **Descobrir perfis**: swipe cards com arrasto (mouse e toque), like / não curti / super like
- **Sistema de matches** com animação de "É match!"
- **Filtros** por interesse
- **Lista de matches** e conversas
- **Chat** com respostas automáticas simuladas e indicador de digitação
- **Perfil editável**: nome, idade, cidade, bio, profissão, interesses e foto
- **Notificações** (badge de não lidas) e toasts
- **Responsivo**: funciona bem em celular, tablet e desktop
- **12 perfis fictícios** com fotos reais (geradas) para demonstração

---

## 📁 Estrutura do projeto

```
paquera/
├── index.html              # Página única (SPA com hash routing)
├── css/
│   └── style.css           # Todo o estilo
├── js/
│   ├── data.js             # Perfis fictícios + constantes
│   └── app.js              # Lógica: navegação, swipe, match, chat, perfil
├── assets/
│   └── profiles/           # 12 fotos de perfil (fictícias)
├── .nojekyll               # Evita processamento do Jekyll no GitHub Pages
└── README.md
```

---

## 🚀 Deploy 1: GitHub Pages

### Opção A — Via site do GitHub (recomendado)

1. Crie um repositório no GitHub (ex.: `meu-paquera`). Pode ser público ou privado*.
2. Suba esta pasta para o repositório:
   ```bash
   cd paquera
   git init
   git add .
   git commit -m "Primeiro commit do Paquera"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/meu-paquera.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings → Pages**.
4. Em **Source**, escolha `Deploy from a branch`.
5. Em **Branch**, escolha `main` e pasta `/ (root)`, clique em **Save**.
6. Aguarde ~1 minuto. Seu site estará em:
   `https://SEU-USUARIO.github.io/meu-paquera/`

> \* Repositórios privados no GitHub Pages exigem plano Pro. Para conta gratuita, use repositório público.

### Opção B — Via GitHub Actions (build zero, mais rápido)

O arquivo `.nojekyll` já está incluso e garante que nenhum processamento extra seja feito.

---

## ☁️ Deploy 2: Cloudflare Pages

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Conecte sua conta e selecione o repositório `meu-paquera`.
3. Configure:
   - **Framework preset**: `None`
   - **Build command**: *(deixe vazio — não precisa buildar)*
   - **Build output directory**: `/` (ou deixe vazio)
4. Clique em **Save and Deploy**.
5. Em ~30 segundos seu site estará no ar em:
   `https://meu-paquera.pages.dev`
6. (Opcional) Em **Custom domains**, adicione seu domínio próprio (ex.: `paquera.seudominio.com.br`) — o Cloudflare gera o certificado SSL automaticamente.

### Deploy direto (sem GitHub)

Arraste e solte a pasta na área de **Direct Upload** do Cloudflare Pages, ou use a CLI:
```bash
npx wrangler pages deploy paquera --project-name=meu-paquera
```

---

## 🌐 Usando domínio próprio

1. Compre um domínio (Registro.br, GoDaddy, Namecheap, etc.).
2. No Cloudflare Pages → **Custom domains** → adicione o domínio.
3. Aponte os nameservers do domínio para o Cloudflare (ou crie um CNAME `meu-paquera.pages.dev`).
4. SSL automático, gratuito.

---

## 🛠️ Como personalizar

### Trocar fotos de perfil
Substitua os arquivos em `assets/profiles/profile-01.jpg` … `profile-12.jpg` (mantenha os nomes) ou edite `js/data.js` apontando para novas imagens.

### Editar perfis
Abra `js/data.js` e edite o array `PERFIS` (nome, idade, cidade, bio, interesses, foto).

### Cores e identidade
Em `css/style.css`, ajuste as variáveis no topo:
```css
:root {
  --primary: #ff4d6d;   /* cor principal */
  --accent: #ff8a5c;    /* cor de destaque */
  --gradient: linear-gradient(135deg, #ff4d6d 0%, #ff8a5c 100%);
}
```

### Nome do app
Busque por `Paquera` em `index.html` e substitua pelo nome do seu projeto.

---

## ⚠️ Aviso importante — Produção

Esta é uma **demonstração frontend** com dados simulados:

- ✅ Login/cadastro: simulado (salvo no navegador)
- ✅ Matches e chat: simulados (respostas automáticas)
- ❌ Não tem backend, contas reais nem mensagens entre usuários reais

**Para virar um produto real**, adicione um backend. Opções recomendadas:
- **Supabase** (PostgreSQL + Auth + Realtime) — ideal para chat
- **Firebase** (Auth + Firestore)
- **Node.js + PostgreSQL** próprio

O frontend já está estruturado para isso: basta trocar as funções em `js/app.js` (que usam `localStorage`) por chamadas de API (`fetch`).

---

## 🔒 Segurança e privacidade (para produção)

- Autenticação real (e-mail/senha, Google, Apple)
- Verificação de foto (moderação)
- Denúncia e bloqueio de usuários
- Criptografia de mensagens
- Conformidade com LGPD (termos de uso + política de privacidade)
- Proibição de menores de 18 anos

---

## 📄 Licença

Use e abuse como base para seu projeto. Perfis e fotos são fictícios para demonstração.

Feito com ❤️ no Brasil.
