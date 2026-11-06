/* ============================================================
   PAQUERA — Lógica do aplicativo (SPA, vanilla JS)
   Persistência via localStorage. Substitua por API em produção.
   ============================================================ */

// ---------- Estado ----------
const LS = {
  user: 'paquera_user',
  likes: 'paquera_likes',
  nopes: 'paquera_nopes',
  matches: 'paquera_matches',
  chats: 'paquera_chats',
  unread: 'paquera_unread',
  filters: 'paquera_filters'
};

const state = {
  user: load(LS.user, null),
  likes: load(LS.likes, []),
  nopes: load(LS.nopes, []),
  matches: load(LS.matches, []),
  chats: load(LS.chats, {}),
  unread: load(LS.unread, {}),
  filters: load(LS.filters, { idadeMin: 18, idadeMax: 45, distanciaMax: 50, interesse: 'Todos' }),
  currentView: 'discover',
  currentChatId: null,
  deck: [],
  pendingMatch: null
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function persistAll() {
  save(LS.user, state.user); save(LS.likes, state.likes); save(LS.nopes, state.nopes);
  save(LS.matches, state.matches); save(LS.chats, state.chats); save(LS.unread, state.unread);
  save(LS.filters, state.filters);
}

// ---------- Utilitários ----------
function $(id) { return document.getElementById(id); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtTime(ts) {
  const d = new Date(ts); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diff = (now - d) / 86400000;
  if (diff < 7) return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()];
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function showToast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2400);
}
function perfilById(id) { return PERFIS.find(p => p.id === id); }

// ---------- Auth ----------
function openAuth(mode) {
  $('auth-overlay').classList.add('active');
  switchAuth(mode);
}
function closeAuth() { $('auth-overlay').classList.remove('active'); }
function switchAuth(mode) {
  $('auth-login').style.display = mode === 'login' ? 'block' : 'none';
  $('auth-signup').style.display = mode === 'signup' ? 'block' : 'none';
}
function doLogin() {
  const email = $('login-email').value.trim();
  const pass = $('login-pass').value;
  if (!email || !pass) { showToast('Preencha e-mail e senha'); return; }
  // Demo: aceita qualquer login. Restaura perfil salvo ou cria padrão.
  if (!state.user) {
    state.user = {
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      age: 26, email, city: 'São Paulo, SP', job: 'Profissional',
      bio: 'Novo por aqui. Vamos conversar?', interesses: ['Música','Praia','Viagens'],
      avatar: 'assets/profiles/profile-02.jpg', interesseEm: 'Mulheres'
    };
  }
  finishAuth();
}
function doSignup() {
  const name = $('signup-name').value.trim();
  const age = parseInt($('signup-age').value);
  const email = $('signup-email').value.trim();
  const city = $('signup-city').value.trim() || 'Brasil';
  const interesseEm = $('signup-interest').value;
  if (!name || !age || !email) { showToast('Preencha nome, idade e e-mail'); return; }
  if (age < 18) { showToast('Você precisa ter 18 anos ou mais'); return; }
  state.user = {
    name, age, email, city, job: '', bio: 'Acabei de entrar no Paquera. Vamos conversar?',
    interesses: ['Música','Cinema','Gastronomia'], avatar: 'assets/profiles/profile-02.jpg', interesseEm
  };
  // Limpa estado anterior de demo
  state.likes = []; state.nopes = []; state.matches = []; state.chats = {}; state.unread = {};
  finishAuth();
}
function finishAuth() {
  persistAll();
  closeAuth();
  enterApp();
  showToast('Bem-vindo(a), ' + state.user.name.split(' ')[0] + '! 💘');
}
function logout() {
  if (!confirm('Sair da conta? Seus dados ficam salvos neste navegador.')) return;
  $('app').classList.remove('active');
  $('landing').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function enterApp() {
  $('landing').classList.add('hidden');
  $('app').classList.add('active');
  buildInteressePicker();
  buildAvatarPicker();
  buildFilterBar();
  navigate('discover');
  updateMe();
  updateBadge();
}

// ---------- Navegação (views) ----------
function navigate(view, param) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  const bnMap = { discover: 'discover', matches: 'matches', me: 'me', chat: 'matches', profile: 'discover' };
  const bn = document.querySelector(`.bn-item[data-view="${bnMap[view] || 'discover'}"]`);
  if (bn) bn.classList.add('active');

  if (view === 'discover') { $('view-discover').classList.add('active'); renderDeck(); }
  else if (view === 'matches') { $('view-matches').classList.add('active'); renderMatches(); }
  else if (view === 'chat') { $('view-chat').classList.add('active'); openChat(param); }
  else if (view === 'profile') { $('view-profile').classList.add('active'); renderProfileDetail(param); }
  else if (view === 'me') { $('view-me').classList.add('active'); fillEditForm(); }
  window.scrollTo(0, 0);
}

// ---------- Filtros ----------
function buildFilterBar() {
  const bar = $('filter-bar');
  const opts = ['Todos', 'Praia', 'Música', 'Viagens', 'Gastronomia', 'Fitness', 'Arte', 'Esportes'];
  bar.innerHTML = opts.map(o =>
    `<button class="filter-chip ${state.filters.interesse === o ? 'active' : ''}" onclick="setFilter('${o}')">${o === 'Todos' ? '✨ Todos' : o}</button>`
  ).join('');
}
function setFilter(o) {
  state.filters.interesse = o;
  persistAll(); buildFilterBar(); renderDeck();
}

// ---------- Deck (Descobrir) ----------
function filteredProfiles() {
  return PERFIS.filter(p => {
    if (state.likes.includes(p.id) || state.nopes.includes(p.id)) return false;
    if (p.idade < state.filters.idadeMin || p.idade > state.filters.idadeMax) return false;
    if (p.distancia > state.filters.distanciaMax) return false;
    if (state.filters.interesse !== 'Todos' && !p.interesses.includes(state.filters.interesse)) return false;
    return true;
  });
}
function renderDeck() {
  const stack = $('card-stack');
  const actions = $('swipe-actions');
  state.deck = filteredProfiles();
  if (state.deck.length === 0) {
    actions.style.display = 'none';
    stack.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🎉</div>
        <h3>Você viu todo mundo por aqui!</h3>
        <p>Volte mais tarde ou ajuste os filtros para ver mais pessoas.</p>
        <button class="btn btn-outline" onclick="resetDeck()">Recomeçar</button>
      </div>`;
    return;
  }
  actions.style.display = 'flex';
  const top3 = state.deck.slice(0, 3);
  stack.innerHTML = top3.map((p, i) => cardHTML(p, i)).join('');
  attachSwipe(stack.firstElementChild, state.deck[0]);
}
function cardHTML(p, idx) {
  const scale = 1 - idx * 0.04, y = idx * 10;
  return `
    <div class="swipe-card" data-id="${p.id}" style="transform: translateY(${y}px) scale(${scale}); z-index: ${10 - idx};">
      <img src="${p.foto}" alt="${esc(p.nome)}" draggable="false" />
      <div class="sc-overlay"></div>
      <div class="swipe-stamp stamp-like">Curti</div>
      <div class="swipe-stamp stamp-nope">Não</div>
      <div class="sc-info">
        <h3>${esc(p.nome)}, <span>${p.idade}</span></h3>
        <div class="sc-meta">📍 ${esc(p.cidade)} · ${p.distancia} km · 💼 ${esc(p.trabalho)}</div>
        <div class="sc-bio">${esc(p.bio)}</div>
        <div class="sc-tags">${p.interesses.slice(0, 4).map(i => `<span class="tag">${esc(i)}</span>`).join('')}</div>
      </div>
    </div>`;
}
function resetDeck() {
  state.likes = []; state.nopes = []; persistAll(); renderDeck();
  showToast('Deck reiniciado!');
}

// Swipe por arrasto (pointer events)
function attachSwipe(card, perfil) {
  if (!card) return;
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  const likeStamp = card.querySelector('.stamp-like');
  const nopeStamp = card.querySelector('.stamp-nope');

  const onDown = e => {
    dragging = true;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY;
    card.classList.add('dragging');
  };
  const onMove = e => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    dx = pt.clientX - startX; dy = pt.clientY - startY;
    const rot = dx / 18;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    likeStamp.style.opacity = Math.max(0, Math.min(1, dx / 100));
    nopeStamp.style.opacity = Math.max(0, Math.min(1, -dx / 100));
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false; card.classList.remove('dragging');
    if (dx > 110) { doSwipe(perfil, 'like', card); }
    else if (dx < -110) { doSwipe(perfil, 'nope', card); }
    else { card.style.transform = ''; likeStamp.style.opacity = 0; nopeStamp.style.opacity = 0; }
    dx = 0; dy = 0;
  };
  card.addEventListener('mousedown', onDown);
  card.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
  card.addEventListener('click', e => {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) navigate('profile', perfil.id);
  });
}

function swipe(action) {
  const card = document.querySelector('.swipe-card');
  if (!card || !state.deck[0]) return;
  doSwipe(state.deck[0], action, card);
}

function doSwipe(perfil, action, card) {
  if (action === 'like' || action === 'super') {
    state.likes.push(perfil.id);
    // Animação de saída
    const dir = action === 'like' ? 1 : 0;
    card.style.transform = `translate(${dir * 500}px, -80px) rotate(30deg)`;
    card.style.opacity = '0';
    // Chance de match: like ~55%, super like 100%
    const isMatch = action === 'super' || Math.random() < 0.55;
    if (isMatch) {
      state.matches.unshift({ id: perfil.id, ts: Date.now(), isNew: true });
      state.unread[perfil.id] = (state.unread[perfil.id] || 0) + 1;
      state.pendingMatch = perfil;
    }
    setTimeout(() => {
      persistAll(); updateBadge(); updateMe(); renderDeck();
      if (isMatch) showMatchModal(perfil);
    }, 320);
  } else {
    state.nopes.push(perfil.id);
    card.style.transform = 'translate(-500px, -60px) rotate(-30deg)';
    card.style.opacity = '0';
    setTimeout(() => { persistAll(); renderDeck(); }, 320);
  }
}

// ---------- Match modal ----------
function showMatchModal(perfil) {
  $('match-text').textContent = FRASES_MATCH[Math.floor(Math.random() * FRASES_MATCH.length)];
  $('match-photos').innerHTML = `
    <img src="${state.user.avatar}" alt="Você" />
    <img src="${perfil.foto}" alt="${esc(perfil.nome)}" />`;
  $('match-modal').classList.add('active');
}
function closeMatch() { $('match-modal').classList.remove('active'); state.pendingMatch = null; }
function closeMatchAndChat() {
  const p = state.pendingMatch;
  $('match-modal').classList.remove('active');
  state.pendingMatch = null;
  if (p) navigate('chat', p.id);
}

// ---------- Perfil detalhe ----------
function renderProfileDetail(id) {
  const p = perfilById(id);
  if (!p) { navigate('discover'); return; }
  const isMatch = state.matches.some(m => m.id === id);
  $('profile-detail-content').innerHTML = `
    <div class="profile-detail">
      <div class="pd-photo">
        <img src="${p.foto}" alt="${esc(p.nome)}" />
        <button class="pd-back" onclick="navigate('discover')">←</button>
      </div>
      <div class="pd-body">
        <h2>${esc(p.nome)}, <span>${p.idade}</span></h2>
        <div class="pd-meta">
          <span>📍 ${esc(p.cidade)} · ${p.distancia} km</span>
          <span>💼 ${esc(p.trabalho)}</span>
          <span>💕 Procura: ${esc(p.orientacao)}</span>
        </div>
        <div class="pd-section">
          <h4>Sobre</h4>
          <p style="font-size:15px;color:var(--dark-soft);">${esc(p.bio)}</p>
        </div>
        <div class="pd-section">
          <h4>Interesses</h4>
          <div class="pd-interesses">${p.interesses.map(i => `<span class="tag">${esc(i)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="pd-actions">
        ${isMatch
          ? `<button class="btn btn-primary btn-block" onclick="navigate('chat',${p.id})">💬 Conversar com ${esc(p.nome)}</button>`
          : `<button class="btn btn-outline" style="flex:1" onclick="navigate('discover')">← Voltar</button>
             <button class="btn btn-primary" style="flex:2" onclick="quickLike(${p.id})">♥ Curtir ${esc(p.nome)}</button>`}
      </div>
    </div>`;
}
function quickLike(id) {
  const p = perfilById(id);
  state.likes.push(id);
  const isMatch = Math.random() < 0.55;
  if (isMatch) {
    state.matches.unshift({ id, ts: Date.now(), isNew: true });
    state.unread[id] = (state.unread[id] || 0) + 1;
    state.pendingMatch = p;
  }
  persistAll(); updateBadge(); updateMe();
  if (isMatch) showMatchModal(p);
  else { showToast('Você curtiu ' + p.nome + '! Se curtir você de volta, é match.'); navigate('discover'); }
}

// ---------- Matches & conversas ----------
function renderMatches() {
  const matched = state.matches.map(m => ({ ...m, perfil: perfilById(m.id) })).filter(m => m.perfil);
  const novos = matched.filter(m => m.isNew);
  const antigos = matched.filter(m => !m.isNew);

  $('new-matches-list').innerHTML = novos.length ? novos.map(m => `
    <div class="match-thumb" onclick="openMatchChat(${m.id})">
      <div class="mt-photo mt-new"><img src="${m.perfil.foto}" alt="${esc(m.perfil.nome)}" /></div>
      <span>${esc(m.perfil.nome)}</span>
    </div>`).join('') : `<p style="color:var(--gray);font-size:14px;">Nenhum match novo. Continue descobrindo! 🔥</p>`;

  const convList = $('conversas-list');
  const all = [...novos, ...antigos];
  if (!all.length) {
    convList.innerHTML = `<div class="empty-state"><div class="es-icon">💬</div><h3>Sem conversas ainda</h3><p>Quando der match, as conversas aparecem aqui.</p></div>`;
    return;
  }
  convList.innerHTML = all.map(m => {
    const chat = state.chats[m.id] || [];
    const last = chat.length ? chat[chat.length - 1] : null;
    const unread = state.unread[m.id] || 0;
    return `
      <div class="conv-item" onclick="openMatchChat(${m.id})">
        <div class="conv-avatar"><img src="${m.perfil.foto}" alt="${esc(m.perfil.nome)}" /></div>
        <div class="conv-body">
          <b>${esc(m.perfil.nome)}, ${m.perfil.idade}</b>
          <span>${last ? (last.from === 'me' ? 'Você: ' : '') + esc(last.text) : 'Dê um oi! 👋'}</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <span class="conv-time">${last ? fmtTime(last.ts) : fmtTime(m.ts)}</span>
          ${unread ? `<span class="conv-unread">${unread}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}
function openMatchChat(id) {
  const m = state.matches.find(x => x.id === id);
  if (m) { m.isNew = false; persistAll(); }
  navigate('chat', id);
}

// ---------- Chat ----------
function openChat(id) {
  const p = perfilById(id);
  if (!p) { navigate('matches'); return; }
  state.currentChatId = id;
  state.unread[id] = 0; persistAll(); updateBadge();
  $('chat-header').innerHTML = `
    <button class="icon-btn" onclick="navigate('matches')" style="margin-right:4px;">←</button>
    <img src="${p.foto}" alt="${esc(p.nome)}" />
    <div class="ch-info"><b>${esc(p.nome)}, ${p.idade}</b><span>● Online agora</span></div>`;
  renderMessages();
  setTimeout(() => $('chat-input-field').focus(), 100);
}
function renderMessages() {
  const box = $('chat-messages');
  const chat = state.chats[state.currentChatId] || [];
  box.innerHTML = chat.map(m => `
    <div class="msg ${m.from}">${esc(m.text)}<span class="msg-time">${fmtTime(m.ts)}</span></div>`).join('');
  box.scrollTop = box.scrollHeight;
}
function sendMessage() {
  const input = $('chat-input-field');
  const text = input.value.trim();
  if (!text || !state.currentChatId) return;
  const id = state.currentChatId;
  state.chats[id] = state.chats[id] || [];
  state.chats[id].push({ from: 'me', text, ts: Date.now() });
  input.value = '';
  persistAll(); renderMessages(); updateMe();

  // Resposta automática simulada
  const box = $('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'typing'; typing.id = 'typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  box.appendChild(typing); box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    const el = $('typing-indicator'); if (el) el.remove();
    const reply = RESPOSTAS_CHAT[Math.floor(Math.random() * RESPOSTAS_CHAT.length)];
    state.chats[id].push({ from: 'them', text: reply, ts: Date.now() });
    persistAll();
    if (state.currentChatId === id) renderMessages();
    else { state.unread[id] = (state.unread[id] || 0) + 1; persistAll(); updateBadge(); }
  }, 1400 + Math.random() * 1200);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement === $('chat-input-field')) sendMessage();
});

// ---------- Meu perfil ----------
function updateMe() {
  if (!state.user) return;
  $('me-avatar').src = state.user.avatar;
  $('me-name').textContent = state.user.name + ', ' + state.user.age;
  $('me-meta').textContent = `📍 ${state.user.city}${state.user.job ? ' · 💼 ' + state.user.job : ''}`;
  $('stat-likes').textContent = state.likes.length;
  $('stat-matches').textContent = state.matches.length;
  const totalMsgs = Object.values(state.chats).reduce((a, c) => a + c.length, 0);
  $('stat-msgs').textContent = totalMsgs;
}
function fillEditForm() {
  if (!state.user) return;
  $('edit-name').value = state.user.name;
  $('edit-age').value = state.user.age;
  $('edit-city').value = state.user.city;
  $('edit-bio').value = state.user.bio || '';
  $('edit-job').value = state.user.job || '';
  document.querySelectorAll('#interesse-picker .ip-chip').forEach(ch => {
    ch.classList.toggle('selected', state.user.interesses.includes(ch.dataset.interesse));
  });
}
function buildInteressePicker() {
  const picker = $('interesse-picker');
  const uniq = [...new Set(INTERESSES)];
  picker.innerHTML = uniq.map(i =>
    `<button class="ip-chip" data-interesse="${esc(i)}" onclick="toggleInteresse(this)">${esc(i)}</button>`
  ).join('');
}
function toggleInteresse(el) {
  const i = el.dataset.interesse;
  const cur = state.user.interesses || [];
  if (cur.includes(i)) state.user.interesses = cur.filter(x => x !== i);
  else {
    if (cur.length >= 6) { showToast('Máximo de 6 interesses'); return; }
    state.user.interesses = [...cur, i];
  }
  el.classList.toggle('selected');
}
function buildAvatarPicker() {
  const picker = $('avatar-picker');
  picker.innerHTML = PERFIS.map(p => `
    <img src="${p.foto}" data-avatar="${p.foto}" onclick="pickAvatar(this)"
      style="width:56px;height:56px;object-fit:cover;border-radius:50%;cursor:pointer;border:3px solid ${state.user.avatar === p.foto ? 'var(--primary)' : 'transparent'};padding:2px;" />`
  ).join('');
}
function pickAvatar(el) {
  state.user.avatar = el.dataset.avatar;
  document.querySelectorAll('#avatar-picker img').forEach(i => i.style.borderColor = 'transparent');
  el.style.borderColor = 'var(--primary)';
  persistAll(); updateMe();
}
function saveProfile() {
  state.user.name = $('edit-name').value.trim() || state.user.name;
  state.user.age = parseInt($('edit-age').value) || state.user.age;
  state.user.city = $('edit-city').value.trim() || state.user.city;
  state.user.bio = $('edit-bio').value.trim();
  state.user.job = $('edit-job').value.trim();
  persistAll(); updateMe();
  showToast('Perfil salvo! ✨');
}

// ---------- Badge ----------
function updateBadge() {
  const total = Object.values(state.unread).reduce((a, b) => a + b, 0) + state.matches.filter(m => m.isNew).length;
  const badge = $('bn-badge');
  if (total > 0) { badge.style.display = 'flex'; badge.textContent = total; }
  else badge.style.display = 'none';
}

// ---------- Init ----------
// Se já logado (demonstração), oferece entrada direta
if (state.user) {
  // Mantém landing visível; usuário pode clicar em Entrar.
}
