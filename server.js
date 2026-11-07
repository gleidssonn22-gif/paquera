// Servidor opcional (Express + Socket.IO) — o protótipo estático em index.html
// funciona sem ele. Banco de dados em memória: tudo se perde ao reiniciar.
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const PORTA = Number(process.env.PORT || process.env.PORTA) || 3000;
const EM_PRODUCAO = process.env.NODE_ENV === 'production';
const ORIGENS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (EM_PRODUCAO) {
    console.error('JWT_SECRET não definido. Defina-o no ambiente antes de iniciar em produção.');
    process.exit(1);
  }
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('JWT_SECRET ausente: usando segredo temporário (sessões caem ao reiniciar).');
}

const app = express();
const server = http.createServer(app);
const corsOptions = { origin: ORIGENS.length ? ORIGENS : false };
const io = new Server(server, { cors: corsOptions });

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

// Servir somente arquivos públicos (nunca a raiz do projeto: expõe .env e server.js)
const raiz = __dirname;
app.get('/', (req, res) => res.sendFile(path.join(raiz, 'index.html')));
['index.html', 'sw.js', 'ads.txt'].forEach(f =>
  app.get('/' + f, (req, res) => res.sendFile(path.join(raiz, f))));
['css', 'js', 'assets'].forEach(d =>
  app.use('/' + d, express.static(path.join(raiz, d), { dotfiles: 'deny' })));

const pastaUploads = path.join(raiz, 'uploads');
fs.mkdirSync(pastaUploads, { recursive: true });
app.use('/uploads', express.static(pastaUploads, { dotfiles: 'deny' }));

// === Banco em memória (substituir por banco real) ===
const usuarios = [];
const curtidas = [];
const matches = [];
const mensagens = [];

const FOTO_PADRAO = 'assets/profiles/profile-02.jpg';
const publico = u => ({
  id: u.id, nome: u.nome, idade: u.idade, cidade: u.cidade,
  genero: u.genero, interesses: u.interesses, foto: u.foto, online: u.online
});
const proprio = u => ({ ...publico(u), email: u.email });

// === Limite simples de requisições por IP (login/cadastro) ===
const tentativas = new Map();
function limitar(maxPorMinuto) {
  return (req, res, next) => {
    const agora = Date.now();
    const lista = (tentativas.get(req.ip) || []).filter(t => agora - t < 60000);
    if (lista.length >= maxPorMinuto) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto.' });
    lista.push(agora);
    tentativas.set(req.ip, lista);
    next();
  };
}
setInterval(() => {
  const agora = Date.now();
  for (const [ip, lista] of tentativas) {
    if (!lista.some(t => agora - t < 60000)) tentativas.delete(ip);
  }
}, 60000).unref();

const assinar = id => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
function autenticar(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Não autorizado' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    if (!usuarios.some(u => u.id === req.userId)) return res.status(401).json({ erro: 'Sessão inválida' });
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido' });
  }
}

// === Upload de fotos (somente imagens, nome gerado pelo servidor) ===
const EXTENSOES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, pastaUploads),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXTENSOES[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, Object.hasOwn(EXTENSOES, file.mimetype))
});

// === Rotas ===
app.post('/api/cadastro', limitar(10), async (req, res) => {
  try {
    const { nome, email, senha, idade, cidade, genero, interesses } = req.body || {};
    if (![nome, email, senha].every(v => typeof v === 'string' && v.trim())) {
      return res.status(400).json({ erro: 'Preencha nome, e-mail e senha' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ erro: 'E-mail inválido' });
    if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter ao menos 6 caracteres' });
    const idadeNum = Number(idade);
    if (!Number.isInteger(idadeNum) || idadeNum < 18 || idadeNum > 99) {
      return res.status(400).json({ erro: 'Apenas pessoas com 18 anos ou mais' });
    }
    const emailNorm = email.trim().toLowerCase();
    if (usuarios.some(u => u.email === emailNorm)) return res.status(400).json({ erro: 'E-mail já cadastrado' });

    const novo = {
      id: crypto.randomUUID(),
      nome: nome.trim().slice(0, 60),
      email: emailNorm,
      senha: await bcrypt.hash(senha, Number(process.env.BCRYPT_ROUNDS) || 10),
      idade: idadeNum,
      cidade: String(cidade || '').slice(0, 80),
      genero: String(genero || '').slice(0, 20),
      interesses: String(interesses || '').slice(0, 500),
      foto: FOTO_PADRAO,
      online: false,
      criadoEm: new Date()
    };
    usuarios.push(novo);
    res.status(201).json({ token: assinar(novo.id), usuario: proprio(novo) });
  } catch {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

app.post('/api/login', limitar(10), async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    const usuario = typeof email === 'string' && usuarios.find(u => u.email === email.trim().toLowerCase());
    const ok = usuario && typeof senha === 'string' && await bcrypt.compare(senha, usuario.senha);
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
    res.json({ token: assinar(usuario.id), usuario: proprio(usuario) });
  } catch {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

app.get('/api/explorar', autenticar, (req, res) => {
  const vistos = new Set(curtidas.filter(c => c.de === req.userId).map(c => c.para));
  res.json(usuarios.filter(u => u.id !== req.userId && !vistos.has(u.id)).map(publico));
});

app.post('/api/curtir', autenticar, (req, res) => {
  const alvoId = req.body && req.body.para;
  const alvo = usuarios.find(u => u.id === alvoId);
  if (!alvo || alvoId === req.userId) return res.status(400).json({ erro: 'Perfil inválido' });
  if (!curtidas.some(c => c.de === req.userId && c.para === alvoId)) curtidas.push({ de: req.userId, para: alvoId });

  const reciproco = curtidas.some(c => c.de === alvoId && c.para === req.userId);
  if (!reciproco) return res.json({ match: false });

  const ja = matches.some(m => (m.usuario1 === req.userId && m.usuario2 === alvoId) ||
                               (m.usuario1 === alvoId && m.usuario2 === req.userId));
  if (!ja) {
    matches.push({ id: crypto.randomUUID(), usuario1: req.userId, usuario2: alvoId, data: new Date() });
    const eu = usuarios.find(u => u.id === req.userId);
    io.to(`user:${alvoId}`).emit('match_novo', { com: publico(eu) });
    io.to(`user:${req.userId}`).emit('match_novo', { com: publico(alvo) });
  }
  res.json({ match: true });
});

app.get('/api/meus-matches', autenticar, (req, res) => {
  const lista = matches
    .filter(m => m.usuario1 === req.userId || m.usuario2 === req.userId)
    .map(m => {
      const outro = usuarios.find(u => u.id === (m.usuario1 === req.userId ? m.usuario2 : m.usuario1));
      return outro ? { ...publico(outro), matchId: m.id } : null;
    })
    .filter(Boolean);
  res.json(lista);
});

app.put('/api/perfil', autenticar, upload.single('foto'), (req, res) => {
  const usuario = usuarios.find(u => u.id === req.userId);
  const limites = { nome: 60, cidade: 80, genero: 20, interesses: 500 };
  for (const [campo, max] of Object.entries(limites)) {
    if (typeof req.body[campo] === 'string') usuario[campo] = req.body[campo].trim().slice(0, max) || usuario[campo];
  }
  if (req.body.idade !== undefined) {
    const idade = Number(req.body.idade);
    if (!Number.isInteger(idade) || idade < 18 || idade > 99) return res.status(400).json({ erro: 'Idade inválida' });
    usuario.idade = idade;
  }
  if (req.file) usuario.foto = '/uploads/' + req.file.filename;
  res.json(proprio(usuario));
});

// === Socket.IO: chat em tempo real (autenticado por JWT) ===
io.use((socket, next) => {
  try {
    const { id } = jwt.verify(socket.handshake.auth && socket.handshake.auth.token, JWT_SECRET);
    if (!usuarios.some(u => u.id === id)) throw new Error('inválido');
    socket.userId = id;
    next();
  } catch {
    next(new Error('Não autorizado'));
  }
});

const sao_match = (a, b) => matches.some(m =>
  (m.usuario1 === a && m.usuario2 === b) || (m.usuario1 === b && m.usuario2 === a));

io.on('connection', socket => {
  const eu = usuarios.find(u => u.id === socket.userId);
  socket.join(`user:${socket.userId}`);
  eu.online = true;

  socket.on('mensagem_enviar', dados => {
    const para = dados && dados.para;
    const texto = typeof (dados && dados.texto) === 'string' ? dados.texto.trim().slice(0, 1000) : '';
    if (!texto || !sao_match(socket.userId, para)) return;
    const msg = { de: socket.userId, para, texto, hora: new Date() };
    mensagens.push(msg);
    io.to(`user:${para}`).to(`user:${socket.userId}`).emit('mensagem_recebida', msg);
  });

  socket.on('historico', ({ outro } = {}) => {
    if (!sao_match(socket.userId, outro)) return;
    socket.emit('historico_recebido', mensagens.filter(m =>
      (m.de === socket.userId && m.para === outro) || (m.de === outro && m.para === socket.userId)));
  });

  socket.on('disconnect', () => {
    if (!io.sockets.adapter.rooms.get(`user:${socket.userId}`)) eu.online = false;
  });
});

server.listen(PORTA, () => {
  console.log(`Servidor Paquera rodando em http://localhost:${PORTA}`);
});
