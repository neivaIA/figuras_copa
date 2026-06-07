# 🏆 Álbum Copa 2026 — Controle de Figurinhas

App React com Supabase para controle das 980 figurinhas do álbum Panini Copa do Mundo 2026.

## Como subir na Vercel

### 1. Instale as dependências localmente (opcional, só pra testar)
```bash
npm install
npm start
```

### 2. Suba para o GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/figuras-copa.git
git push -u origin main
```

### 3. Importe na Vercel
- Acesse vercel.com → New Project → importe o repositório
- Em **Environment Variables**, adicione:
  - `REACT_APP_SUPABASE_URL` = `https://gyulikltojhxymkvlyih.supabase.co`
  - `REACT_APP_SUPABASE_KEY` = `sb_publishable_Lb4FoVS7RBBuFSEUfOXCLw_lNCKan9x`
- Clique **Deploy** ✅

## Estrutura
```
src/
  App.js       → componente principal + telas
  data.js      → 48 seleções + figurinhas especiais
  db.js        → funções Supabase (perfis + progresso)
  supabase.js  → cliente Supabase
  theme.js     → gerador de tema dinâmico por cores
```

## Banco de dados (Supabase)
Tabelas: `profiles` e `album_progress`
