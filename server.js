const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PORTA = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'paquera_segredo_2026';

// === BANCO DE DADOS EM MEMÓRIA (substituir por MongoDB/SQL depois) ===
const usuarios = [];
const curtidas = [];
const matches = [];
const mensagens = [];

// === UPLOAD DE FOTOS ===
const armazenamento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: armazenamento, limits: { fileSize: 5 * 1024 * 1024 } });

// === ROTAS ===

// Cadastro
app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, idade, cidade, genero, interesses } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos' });
    
    if (usuarios.find(u => u.email === email)) {
      return res.status(400).json({ erro: 'E-mail já cadastrado' });
    }
    
    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = {
      id: Date.now().toString(),
      nome, email, senha: senhaHash,
      idade: idade || null,
      cidade: cidade || '',
      genero: genero || '',
      interesses: interesses || '',
      foto: '/imagens/sem-foto.png',
      online: true,
      criadoEm: new Date()
    };
    usuarios.push(novoUsuario);
    
    const token = jwt.sign({ id: novoUsuario.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, usuario: { ...novoUsuario, senha: undefined } });
  } catch (e) { res.status(500).json({ erro: 'Erro no servidor' }); }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  const usuario = usuarios.find(u => u.email === email);
  if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
  
  const senhaOk = await bcrypt.compare(senha, usuario.senha);
  if (!senhaOk) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
  
  usuario.online = true;
  const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, usuario: { ...usuario, senha: undefined } });
});

// Listar perfis para explorar
app.get('/api/explorar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Não autorizado' });
  
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const outros = usuarios.filter(u => u.id !== id && !curtidas.some(c => c.de === id && c.para === u.id));
    res.json(outros.map(u => ({ ...u, senha: undefined })));
  } catch { res.status(401).json({ erro: 'Token inválido' }); }
});

// Dar curtida / like
app.post('/api/curtir', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Não autorizado' });
  
  try {
    const { id: euId } = jwt.verify(token, JWT_SECRET);
    const { para: alvoId } = req.body;
    
    curtidas.push({ de: euId, para: alvoId });
    
    // Verificar Match recíproco
    const deuMatch = curtidas.some(c => c.de === alvoId && c.para === euId);
    if (deuMatch) {
      matches.push({ usuario1: euId, usuario2: alvoId, data: new Date() });
      io.to(user:).emit('match_novo', { com: usuarios.find(u => u.id === alvoId) });
      io.to(user:).emit('match_novo', { com: usuarios.find(u => u.id === euId) });
      return res.json({ match: true });
    }
    res.json({ match: false });
  } catch { res.status(401).json({ erro: 'Token inválido' }); }
});

// Meus Matches
app.get('/api/meus-matches', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const meusMatches = matches.filter(m => m.usuario1 === id || m.usuario2 === id).map(m => {
      const outroId = m.usuario1 === id ? m.usuario2 : m.usuario1;
      return { ...usuarios.find(u => u.id === outroId), matchId: m.id };
    });
    res.json(meusMatches);
  } catch { res.status(401).json({ erro: 'Token inválido' }); }
});

// Atualizar Perfil
app.put('/api/perfil', upload.single('foto'), (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    
    ['nome', 'idade', 'cidade', 'genero', 'interesses'].forEach(campo => {
      if (req.body[campo] !== undefined) usuario[campo] = req.body[campo];
    });
    if (req.file) usuario.foto = '/uploads/' + req.file.filename;
    
    res.json({ ...usuario, senha: undefined });
  } catch { res.status(401).json({ erro: 'Token inválido' }); }
});

// === SOCKET.IO — CHAT EM TEMPO REAL ===
io.on('connection', (socket) => {
  console.log('🔌 Conectado:', socket.id);
  
  socket.on('entrar', (usuarioId) => {
    socket.join(user:);
    const usuario = usuarios.find(u => u.id === usuarioId);
    if (usuario) usuario.online = true;
  });
  
  socket.on('mensagem_enviar', (dados) => {
    const { de, para, texto } = dados;
    const novaMsg = { de, para, texto, hora: new Date() };
    mensagens.push(novaMsg);
    io.to(user:).emit('mensagem_recebida', novaMsg);
  });
  
  socket.on('historico', ({ eu, outro }) => {
    const conversa = mensagens.filter(m =>
      (m.de === eu && m.para === outro) || (m.de === outro && m.para === eu)
    );
    socket.emit('historico_recebido', conversa);
  });
  
  socket.on('disconnect', () => {
    const usuario = usuarios.find(u => u.id === socket.handshake.query.usuarioId);
    if (usuario) usuario.online = false;
    console.log('🔌 Desconectado');
  });
});

// INICIAR
server.listen(PORTA, () => {
  console.log(\🚀 Servidor Paquera rodando em http://localhost:\\);
});
