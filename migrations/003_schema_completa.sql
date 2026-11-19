-- Paquera - Migration 003: schema completo
-- Todas as tabelas referenciadas pelo worker.js. Aplicar com:
--   npx wrangler d1 migrations apply paquera
-- 001_core.sql cria: users, swipes, matches, messages, push_subscriptions, reports
-- 002_security.sql cria: is_admin, password_resets, phone_verifications, paqueracoins, coin_transactions

-- Créditos e boosts
CREATE TABLE IF NOT EXISTS super_like_credits (
  user_id INTEGER PRIMARY KEY,
  daily_used INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 1,
  updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS super_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, target_id)
);
CREATE TABLE IF NOT EXISTS boost_credits (
  user_id INTEGER PRIMARY KEY,
  used INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  expires_at INTEGER NOT NULL
);

-- Social (stories, moments)
CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT DEFAULT '',
  type TEXT DEFAULT 'text',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS story_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(story_id, user_id)
);
CREATE TABLE IF NOT EXISTS moments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT DEFAULT '',
  type TEXT DEFAULT 'text',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS moment_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  moment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(moment_id, user_id)
);

-- Privacidade e relacionamentos
CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  blocked_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, target_id)
);
CREATE TABLE IF NOT EXISTS user_friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, friend_id)
);
CREATE TABLE IF NOT EXISTS profile_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  viewer_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Presentes e lojas
CREATE TABLE IF NOT EXISTS gift_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎁',
  price INTEGER NOT NULL DEFAULT 10,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  from_user_id INTEGER NOT NULL,
  gift_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🛍️',
  price INTEGER NOT NULL DEFAULT 50,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS shop_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS digital_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Quiz, gamificação
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  options TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS achievement_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '🏅',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  earned_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS streak_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  streak_count INTEGER DEFAULT 1,
  UNIQUE(user_id, date)
);

-- Eventos, comunidades
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT DEFAULT '',
  date INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS event_attendees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(event_id, user_id)
);
CREATE TABLE IF NOT EXISTS communities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '💬',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS community_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(community_id, user_id)
);

-- Conteúdo/ gamificação diária
CREATE TABLE IF NOT EXISTS daily_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  date TEXT,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS daily_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT DEFAULT '',
  date TEXT NOT NULL,
  UNIQUE(user_id, date)
);
CREATE TABLE IF NOT EXISTS daily_spins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  prize INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);
CREATE TABLE IF NOT EXISTS lottery_prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS lottery_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  won INTEGER DEFAULT 0,
  prize INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Chat e mídia
CREATE TABLE IF NOT EXISTS voice_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS disappearing_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS message_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  emoji TEXT DEFAULT '❤️',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(message_id, user_id)
);
CREATE TABLE IF NOT EXISTS chat_backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS conversation_starters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  category TEXT DEFAULT 'geral'
);

-- Perfil e preferências
CREATE TABLE IF NOT EXISTS user_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '',
  category TEXT DEFAULT 'geral'
);
CREATE TABLE IF NOT EXISTS user_interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  interest_id INTEGER NOT NULL,
  UNIQUE(user_id, interest_id)
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  push_enabled INTEGER DEFAULT 1,
  show_online INTEGER DEFAULT 1,
  show_distance INTEGER DEFAULT 1,
  incognito INTEGER DEFAULT 0,
  updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT DEFAULT '',
  artist TEXT DEFAULT '',
  url TEXT DEFAULT '',
  position INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT DEFAULT 'Filtro',
  filters TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Notificações (exibidas em notificacoes.html)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Missões, referral
CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  reward INTEGER DEFAULT 10,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  completed_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(mission_id, user_id)
);
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER,
  code TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Emergência, denúncias, GDPR/LGPD
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  relationship TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS fake_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  reported_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  evidence TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS data_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT DEFAULT 'export',
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS social_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  platform TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Monetização
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS supporter_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER DEFAULT 0,
  method TEXT DEFAULT 'pix',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  active INTEGER DEFAULT 1
);

-- Admin e conteúdo do site
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  target TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT DEFAULT 'pt-BR',
  key TEXT NOT NULL,
  value TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sponsored_ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  url TEXT DEFAULT '',
  priority INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS seo_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  path TEXT DEFAULT '',
  description TEXT DEFAULT '',
  content TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- ============ SEEDS (catálogos básicos) ============

INSERT OR IGNORE INTO gift_catalog (name, emoji, price, active) VALUES
  ('Rosa', '🌹', 5, 1),
  ('Chocolate', '🍫', 10, 1),
  ('Urso de pelúcia', '🧸', 25, 1),
  ('Perfume', '💐', 50, 1),
  ('Anel', '💍', 100, 1),
  ('Café', '☕', 8, 1),
  ('Bolo', '🎂', 15, 1),
  ('Diadema', '👑', 80, 1);

INSERT OR IGNORE INTO shop_items (name, description, emoji, price, active) VALUES
  ('Boost de visibilidade', 'Apareça para mais pessoas por 30 minutos', '🚀', 100, 1),
  ('Super like extra', 'Ganhe 1 super like para usar hoje', '⭐', 50, 1),
  ('Destaque no perfil', 'Seu perfil ganha borda dourada por 24h', '✨', 150, 1),
  ('Rebobinar swipe', 'Desfaça o último "pass"', '⏪', 30, 1);

INSERT OR IGNORE INTO interests (name, emoji, category) VALUES
  ('Música', '🎵', 'cultura'), ('Cinema', '🎬', 'cultura'), ('Literatura', '📚', 'cultura'),
  ('Viagens', '✈️', 'estilo'), ('Academia', '💪', 'esporte'), ('Corrida', '🏃', 'esporte'),
  ('Futebol', '⚽', 'esporte'), ('Culinária', '🍳', 'vida'), ('Pets', '🐶', 'vida'),
  ('Games', '🎮', 'lazer'), ('Dança', '💃', 'lazer'), ('Fotografia', '📸', 'cultura'),
  ('Praia', '🏖️', 'estilo'), ('Séries', '📺', 'cultura'), ('Café', '☕', 'vida'),
  ('Yoga', '🧘', 'esporte'), ('Tattoo', '🖋️', 'estilo'), ('Astrologia', '🔮', 'lazer'),
  ('Voluntariado', '🤝', 'vida'), ('Empreendedorismo', '💼', 'vida');

INSERT OR IGNORE INTO conversation_starters (text, category) VALUES
  ('Se você pudesse jantar com qualquer pessoa, viva ou morta, quem seria?', 'geral'),
  ('Qual é a viagem dos seus sonhos?', 'geral'),
  ('Café ou chá? Sua resposta define nossas manhãs ☕', 'leve'),
  ('Qual foi a última série que te agarrou?', 'cultura'),
  ('Você é mais praia ou montanha?', 'geral'),
  ('Qual é seu confort food vencedor?', 'leve'),
  ('Se ganhasse um bilhete pra qualquer lugar do Brasil, pra onde iria?', 'geral'),
  ('Gatinho ou cachorro? (essa é importante 🐾)', 'leve'),
  ('Qual playlist está te acompanhando essa semana?', 'cultura'),
  ('Já fez algo incrível essa semana?', 'geral');

INSERT OR IGNORE INTO quiz_questions (question, options, active) VALUES
  ('O que te conquista primeiro em alguém?', '["Humor","Honéstidade","Carinho","Inteligência"]', 1),
  ('Seu encontro ideal é:', '["Jantar tranquilo","Aventura ao ar livre","Cinema em casa","Balada dançante"]', 1),
  ('Como você demonstra afeto?', '["Palavras","Presentes","Tempo","Atos de cuidado"]', 1),
  ('Manhã perfeita:', '["Dormir até tarde","Café e corrida","Viajar","Café da caprichado"]', 1),
  ('O que é impossível conviver?', '["Falta de higiene","Falta de ambição","Ciúmes demais","Pessimismo"]', 1);

INSERT OR IGNORE INTO missions (title, description, reward, active) VALUES
  ('Primeiro swipe', 'Dê seu primeiro like hoje', 5, 1),
  ('Conversador', 'Envie 5 mensagens hoje', 15, 1),
  ('Completar perfil', 'Preencha bio e foto', 20, 1),
  ('Streak de 3 dias', 'Volte 3 dias seguidos', 30, 1);

INSERT OR IGNORE INTO daily_questions (question, date, active) VALUES
  ('Qual sorriso brilhou seu dia hoje? 😊', NULL, 1);

INSERT OR IGNORE INTO lottery_prizes (label, amount, active) VALUES
  ('Prêmio especial', 500, 1),
  ('Prêmio médio', 100, 1),
  ('Prêmio básico', 20, 1);

INSERT OR IGNORE INTO communities (name, description, icon, active) VALUES
  ('Quero Relação Séria', 'Para quem busca compromisso de verdade', '❤️', 1),
  ('Solteiros Nejar Soltos', 'Diversão sem pressa, amizades reais', '🎉', 1),
  ('Amarecidos por Música', 'Quem vive de playlist', '🎧', 1),
  ('Amantes de Viagem', 'Mochilão, luxo ou road trip?', '✈️', 1),
  ('Pets e Paqueras', 'Para quem planeja passeio com o cachorro', '🐾', 1);

INSERT OR IGNORE INTO achievement_templates (name, description, icon, active) VALUES
  ('Primeiro match', 'Deu seu primeiro match', '💘', 1),
  ('Dez matches', 'Acumulou 10 matches', '🔥', 1),
  ('Conversa iniciada', 'Enviou sua primeira mensagem', '💬', 1),
  ('Perfil completo', 'Bio, foto e interesses preenchidos', '🌟', 1),
  ('Semana perfeita', 'Streak de 7 dias', '🏆', 1);

INSERT OR IGNORE INTO site_config (key, value) VALUES
  ('site_name', 'Paquera'),
  ('app_version', '1.0.0'),
  ('premium_cost_coins', '500'),
  ('maintenance', '0');

INSERT OR IGNORE INTO business_subscriptions (name, price, description, active) VALUES
  ('Plano Business', 99, 'Para profissionais que buscam conexões de trabalho', 1);
