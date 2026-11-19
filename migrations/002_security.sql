-- Paquera - Migration 002: suporte às correções de segurança
-- Aplicar com: npx wrangler d1 migrations apply paquera

-- Flags de administração (rotas /api/admin/* agora exigem is_admin = 1)
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- Tabelas usadas pelo fluxo de recuperação de senha (token guardado como SHA-256)
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS phone_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Economia (usada por premium subscribe, coins e transações)

CREATE TABLE IF NOT EXISTS paqueracoins (
  user_id INTEGER PRIMARY KEY,
  balance INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_transactions(user_id);

-- Para promover um administrador após aplicar a migration:
-- UPDATE users SET is_admin = 1 WHERE email = 'voce@exemplo.com';
