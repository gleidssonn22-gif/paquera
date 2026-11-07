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
  filters: 'paquera_filters',
  blocked: 'paquera_blocked',
  reports: 'paquera_reports',
  tip: 'paquera_tip'
};

const state = {
  user: load(LS.user, null),
  likes: load(LS.likes, []),
  nopes: load(LS.nopes, []),
  matches: load(LS.matches, []),
  chats: load(LS.chats, {}),
  unread: load(LS.unread, {}),
  filters: { idadeMin: 18, idadeMax: 45, distanciaMax: 50, interesse: 'Todos', cidade: '', ...load(LS.filters, {}) },
  blocked: load(LS.blocked, []),
  reports: load(LS.reports, []),
  currentView: 'discover',
  currentChatId: null,
  deck: [],
  pendingMatch: null,
  pendingAction: null,
  last: null,
  busy: false
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function persistAll() {
  save(LS.user, state.user); save(LS.likes, state.likes); save(LS.nopes, state.nopes);
  save(LS.matches, state.matches); save(LS.chats, state.chats); save(LS.unread, state.unread);
  save(LS.filters, state.filters); save(LS.blocked, state.blocked); save(LS.reports, state.reports);
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
function normalizeText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

const INFO_PAGES = {
  terms: {
    title: 'Termos da demonstração',
    sections: [
      ['Uso de teste', 'Esta versão é um protótipo. Perfis, curtidas, matches e respostas de conversa são fictícios e não representam pessoas ou um serviço ativo.'],
      ['Idade e dados', 'A experiência é destinada exclusivamente a pessoas com 18 anos ou mais. Use informações fictícias; não informe senhas reais, dados sensíveis nem dados de terceiros.'],
      ['Limites', 'Não há cadastro, envio de mensagens, cobrança, atendimento ou moderação real. Este aviso não substitui os termos jurídicos de um produto publicado.']
    ]
  },
  privacy: {
    title: 'Aviso de privacidade da demonstração',
    sections: [
      ['O que fica no navegador', 'O perfil de teste, preferências, curtidas, matches e mensagens simuladas ficam no armazenamento local deste navegador. O aplicativo não envia essas informações para um servidor; apenas o parceiro de anúncios acima recebe dados técnicos de navegação.'],
      ['Publicidade e parceiros', 'Este site exibe anúncios da Monetag, cujo script é carregado assim que você abre a página. Esse parceiro pode usar cookies e tratar dados técnicos, como endereço IP e informações do navegador, para exibir e medir anúncios, conforme a política dele. Anúncios de outros parceiros, como o Google, só são carregados se você permitir em “Preferências de anúncios”.'],
      ['Cuide do dispositivo', 'Qualquer pessoa com acesso ao mesmo navegador pode ver os dados salvos. Evite dados pessoais e use “Apagar meus dados deste navegador” no seu perfil para removê-los.'],
      ['Produto real', 'Antes de lançar um serviço real, será necessário definir e publicar a identidade do controlador, finalidades, bases legais, retenção, canal de direitos e contato, conforme a LGPD.']
    ]
  },
  safety: {
    title: 'Segurança',
    sections: [
      ['Nesta versão', 'Não existem outros usuários reais. Bloquear e denunciar são ações locais de demonstração e não são enviadas a uma equipe de moderação.'],
      ['Encontros presenciais', 'Se conhecer alguém em outro serviço, prefira locais públicos, avise uma pessoa de confiança, organize seu próprio transporte e não compartilhe endereço ou dados financeiros.'],
      ['Antes de um lançamento', 'Um serviço real precisa de verificação etária adequada, denúncia e bloqueio efetivos, moderação com resposta, proteção de contas e um canal claro para pedir ajuda.']
    ]
  }
};

function openInfo(page) {
  const content = INFO_PAGES[page];
  if (!content) return;
  $('info-title').textContent = content.title;
  $('info-content').innerHTML = content.sections.map(([title, text]) =>
    `<section><h3>${esc(title)}</h3><p>${esc(text)}</p></section>`
  ).join('');
  $('info-dialog').showModal();
}

function closeDialog(id) {
  const dialog = $(id);
  if (dialog && dialog.open) dialog.close();
}

function openAction(type, profileId = null) {
  const actions = {
    logout: ['Sair da demonstração?', 'Seus dados continuarão salvos neste navegador.', 'Sair'],
    clear: ['Apagar dados deste navegador?', 'O perfil e todas as interações salvas nesta demonstração serão removidos.', 'Apagar dados'],
    block: ['Bloquear perfil?', 'Este perfil será removido dos resultados locais desta demonstração.', 'Bloquear'],
    report: ['Denunciar perfil', 'O registro ficará apenas neste navegador; nenhuma denúncia será enviada a uma equipe.', 'Registrar denúncia']
  };
  const action = actions[type];
  if (!action) return;
  state.pendingAction = { type, profileId };
  $('action-title').textContent = action[0];
  $('action-description').textContent = action[1];
  $('action-confirm').textContent = action[2];
  $('report-reason-group').hidden = type !== 'report';
  $('report-reason').value = '';
  $('action-dialog').showModal();
  if (type === 'report') $('report-reason').focus();
}

function confirmAction(event) {
  event.preventDefault();
  const pending = state.pendingAction;
  if (!pending) return;
  closeDialog('action-dialog');
  state.pendingAction = null;
  if (pending.type === 'logout') {
    $('app').classList.remove('active');
    $('landing').classList.remove('hidden');
    window.scrollTo(0, 0);
  } else if (pending.type === 'clear') {
    Object.values(LS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(AD_CONSENT_KEY);
    window.location.reload();
  } else if (pending.type === 'block') {
    blockProfile(pending.profileId, true);
  } else if (pending.type === 'report') {
    const reason = $('report-reason').value.trim().slice(0, 120);
    if (!reason) {
      showToast('Informe um motivo para a denúncia');
      return;
    }
    state.reports.push({ id: pending.profileId, reason, ts: Date.now() });
    persistAll();
    showToast('Registro local salvo; nenhuma denúncia foi enviada.');
  }
}

function toggleMenu() {
  const menu = document.querySelector('.nav-links');
  const button = document.querySelector('.menu-toggle');
  const isOpen = menu.classList.toggle('is-open');
  button.setAttribute('aria-expanded', String(isOpen));
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('is-open');
    document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
  });
});

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
  const name = $('login-name').value.trim();
  if (!state.user) {
    state.user = {
      name: name || 'Visitante',
      age: 26, city: 'São Paulo, SP', job: 'Profissional',
      bio: 'Novo por aqui. Vamos conversar?', interesses: ['Música','Praia','Viagens'],
      avatar: 'assets/profiles/profile-02.jpg', interesseEm: 'Mulheres'
    };
  }
  finishAuth();
}
function doSignup() {
  const name = $('signup-name').value.trim();
  const age = parseInt($('signup-age').value);
  const city = $('signup-city').value.trim() || 'Brasil';
  const interesseEm = $('signup-interest').value;
  if (!name || !age) { showToast('Preencha nome e idade'); return; }
  if (age < 18 || age > 99) { showToast('A demonstração é apenas para pessoas de 18 a 99 anos'); return; }
  if (!$('signup-adult').checked) { showToast('Confirme que tem 18 anos ou mais e leia os avisos'); return; }
  state.user = {
    name, age, city, job: '', bio: 'Acabei de entrar no Paquera. Vamos conversar?',
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
  openAction('logout');
}
function clearDemoData() {
  openAction('clear');
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
  showTip();
}

// ---------- Navegação (views) ----------
function navigate(view, param) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#app .nav-links a[data-view]').forEach(a => a.classList.remove('active'));
  const bnMap = { discover: 'discover', matches: 'matches', me: 'me', chat: 'matches', profile: 'discover' };
  const bn = document.querySelector(`.bn-item[data-view="${bnMap[view] || 'discover'}"]`);
  if (bn) bn.classList.add('active');
  const topLink = document.querySelector(`#app .nav-links a[data-view="${bnMap[view] || 'discover'}"]`);
  if (topLink) topLink.classList.add('active');

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
  ).join('') + `<button class="filter-chip" onclick="openFilterDialog()" aria-label="Ajustar idade, distância e cidade">⚙ Filtros</button>`;
}
function setFilter(o) {
  state.filters.interesse = o;
  persistAll(); buildFilterBar(); renderDeck();
}
function openFilterDialog() {
  $('filter-age-min').value = state.filters.idadeMin;
  $('filter-age-max').value = state.filters.idadeMax;
  $('filter-distance').value = state.filters.distanciaMax;
  $('filter-city').value = state.filters.cidade || '';
  $('filter-dialog').showModal();
}
function applyFilters(event) {
  event.preventDefault();
  const idadeMin = Number($('filter-age-min').value);
  const idadeMax = Number($('filter-age-max').value);
  const distanciaMax = Number($('filter-distance').value);
  if (idadeMin < 18 || idadeMax > 99 || idadeMin > idadeMax) {
    showToast('Confira a faixa de idade entre 18 e 99 anos');
    return;
  }
  if (distanciaMax < 1 || distanciaMax > 500) {
    showToast('A distância deve estar entre 1 e 500 km');
    return;
  }
  state.filters.idadeMin = idadeMin;
  state.filters.idadeMax = idadeMax;
  state.filters.distanciaMax = distanciaMax;
  state.filters.cidade = $('filter-city').value.trim();
  persistAll();
  closeDialog('filter-dialog');
  renderDeck();
}
function resetFilters() {
  state.filters = { idadeMin: 18, idadeMax: 45, distanciaMax: 50, interesse: 'Todos', cidade: '' };
  persistAll();
  buildFilterBar();
  closeDialog('filter-dialog');
  renderDeck();
}

// ---------- Deck (Descobrir) ----------
function filteredProfiles() {
  return PERFIS.filter(p => {
    if (state.likes.includes(p.id) || state.nopes.includes(p.id) || state.blocked.includes(p.id)) return false;
    if (p.idade < state.filters.idadeMin || p.idade > state.filters.idadeMax) return false;
    if (p.distancia > state.filters.distanciaMax) return false;
    if (state.filters.cidade && !normalizeText(p.cidade).includes(normalizeText(state.filters.cidade))) return false;
    if (state.filters.interesse !== 'Todos' && !p.interesses.includes(state.filters.interesse)) return false;
    const preference = state.user && state.user.interesseEm;
    if (preference === 'Mulheres' && p.genero !== 'F') return false;
    if (preference === 'Homens' && p.genero !== 'M') return false;
    if (preference === 'Homens e mulheres' && !['F', 'M'].includes(p.genero)) return false;
    return true;
  });
}
function renderDeck() {
  const stack = $('card-stack');
  const actions = $('swipe-actions');
  state.deck = filteredProfiles();
  $('deck-count').textContent = state.deck.length === 1 ? '1 perfil restante' : `${state.deck.length} perfis restantes`;
  $('undo-btn').disabled = !state.last;
  if (state.deck.length === 0) {
    actions.style.display = 'none';
    stack.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🎉</div>
        <h3>Nenhum perfil para mostrar</h3>
        <p>Limpe os filtros ou recomece o deck de demonstração.</p>
        <button class="btn btn-outline" onclick="resetFilters()">Limpar filtros</button>
        <button class="btn btn-ghost" onclick="resetDeck()">Recomeçar deck</button>
      </div>`;
    return;
  }
  actions.style.display = 'flex';
  const top3 = state.deck.slice(0, 3);
  stack.innerHTML = top3.map((p, i) => cardHTML(p, i)).join('');
  attachSwipe(stack.firstElementChild, state.deck[0]);
}
function commonInterests(p) {
  const mine = (state.user && state.user.interesses) || [];
  return p.interesses.filter(i => mine.includes(i));
}
function sortedTags(p) {
  const common = commonInterests(p);
  return [...common, ...p.interesses.filter(i => !common.includes(i))].map(i => ({ name: i, common: common.includes(i) }));
}
function cardHTML(p, idx) {
  const common = commonInterests(p);
  const scale = 1 - idx * 0.04, y = idx * 10;
  return `
    <article class="swipe-card" data-id="${p.id}" tabindex="0" role="button" aria-label="Ver perfil de ${esc(p.nome)}, ${p.idade} anos" style="transform: translateY(${y}px) scale(${scale}); z-index: ${10 - idx};">
      <img src="${p.foto}" alt="${esc(p.nome)}" draggable="false" decoding="async" />
      <div class="sc-overlay"></div>
      <div class="swipe-stamp stamp-like">Curti</div>
      <div class="swipe-stamp stamp-nope">Não</div>
      <div class="sc-info">
        <h3>${esc(p.nome)}, <span>${p.idade}</span></h3>
        <div class="sc-meta">📍 ${esc(p.cidade)} · ${p.distancia} km · 💼 ${esc(p.trabalho)}</div>
        <div class="sc-bio">${esc(p.bio)}</div>
        <div class="sc-tags">${common.length ? `<span class="tag tag-common">★ ${common.length} em comum</span>` : ''}${sortedTags(p).slice(0, common.length ? 3 : 4).map(t => `<span class="tag ${t.common ? 'tag-common' : ''}">${esc(t.name)}</span>`).join('')}</div>
      </div>
    </article>`;
}
function resetDeck() {
  state.likes = []; state.nopes = []; persistAll(); renderDeck();
  showToast('Deck reiniciado!');
}

// Swipe por arrasto (pointer events)
function attachSwipe(card, perfil) {
  if (!card) return;
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;
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
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
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
    if (moved) { moved = false; return; }
    if (e.target.closest('button')) return;
    navigate('profile', perfil.id);
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate('profile', perfil.id);
    }
  });
}

function swipe(action) {
  const card = document.querySelector('.swipe-card');
  if (!card || !state.deck[0]) return;
  doSwipe(state.deck[0], action, card);
}

function doSwipe(perfil, action, card) {
  if (state.busy) return;
  state.busy = true;
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
    state.last = { id: perfil.id, action, match: isMatch };
    setTimeout(() => {
      state.busy = false;
      persistAll(); updateBadge(); updateMe(); renderDeck();
      if (isMatch) showMatchModal(perfil);
    }, 320);
  } else {
    state.nopes.push(perfil.id);
    card.style.transform = 'translate(-500px, -60px) rotate(-30deg)';
    card.style.opacity = '0';
    state.last = { id: perfil.id, action: 'nope', match: false };
    setTimeout(() => { state.busy = false; persistAll(); renderDeck(); }, 320);
  }
}

function undoSwipe() {
  const last = state.last;
  if (!last || state.busy) { showToast('Nada para desfazer'); return; }
  state.likes = state.likes.filter(id => id !== last.id);
  state.nopes = state.nopes.filter(id => id !== last.id);
  if (last.match) {
    state.matches = state.matches.filter(m => m.id !== last.id);
    delete state.unread[last.id];
  }
  state.last = null;
  persistAll(); updateBadge(); updateMe(); renderDeck();
  showToast('Ação desfeita');
}

// Atalhos de teclado no Descobrir: ← pular, → curtir, ↑ destaque, Z desfazer
document.addEventListener('keydown', e => {
  if (!$('app').classList.contains('active') || state.currentView !== 'discover') return;
  if (document.querySelector('dialog[open], .overlay.active')) return;
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'arrowleft') { e.preventDefault(); swipe('nope'); }
  else if (key === 'arrowright') { e.preventDefault(); swipe('like'); }
  else if (key === 'arrowup') { e.preventDefault(); swipe('super'); }
  else if (key === 'z') { undoSwipe(); }
});

function showTip() {
  if (load(LS.tip, false)) return;
  save(LS.tip, true);
  setTimeout(() => showToast('Dica: arraste os cards ou use as setas ← → do teclado'), 700);
}

// ---------- Match modal ----------
function showMatchModal(perfil) {
  $('match-text').textContent = FRASES_MATCH[Math.floor(Math.random() * FRASES_MATCH.length)];
  $('match-photos').innerHTML = `
    <img src="${state.user.avatar}" alt="Você" />
    <img src="${perfil.foto}" alt="${esc(perfil.nome)}" />`;
  $('match-modal').classList.add('active');
  burstHearts();
}
function burstHearts() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.querySelector('#match-modal .modal');
  if (!box) return;
  for (let i = 0; i < 16; i++) {
    const h = document.createElement('span');
    h.className = 'heart-burst';
    h.textContent = ['💛', '💘', '✨', '💖'][i % 4];
    h.style.left = (8 + Math.random() * 84) + '%';
    h.style.animationDelay = (Math.random() * 0.5) + 's';
    h.style.fontSize = (14 + Math.random() * 18) + 'px';
    box.appendChild(h);
    setTimeout(() => h.remove(), 2400);
  }
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
          ${commonInterests(p).length ? `<p class="pd-common">★ Vocês têm ${commonInterests(p).length} ${commonInterests(p).length === 1 ? 'interesse' : 'interesses'} em comum</p>` : ''}
          <div class="pd-interesses">${sortedTags(p).map(t => `<span class="tag ${t.common ? 'tag-common' : ''}">${esc(t.name)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="pd-actions">
        ${isMatch
          ? `<button class="btn btn-primary btn-block" onclick="navigate('chat',${p.id})">💬 Conversar com ${esc(p.nome)}</button>`
          : `<button class="btn btn-outline" style="flex:1" onclick="navigate('discover')">← Voltar</button>
             <button class="btn btn-primary" style="flex:2" onclick="quickLike(${p.id})">♥ Curtir ${esc(p.nome)}</button>`}
      </div>
      <div class="profile-safety-actions">
        <button type="button" onclick="blockProfile(${p.id})">Bloquear perfil</button>
        <button type="button" onclick="reportProfile(${p.id})">Denunciar perfil</button>
      </div>
    </div>`;
}
function blockProfile(id, confirmed = false) {
  const p = perfilById(id);
  if (!p) return;
  if (!confirmed) {
    openAction('block', id);
    return;
  }
  if (!state.blocked.includes(id)) state.blocked.push(id);
  state.likes = state.likes.filter(profileId => profileId !== id);
  state.nopes = state.nopes.filter(profileId => profileId !== id);
  state.matches = state.matches.filter(match => match.id !== id);
  delete state.chats[id];
  delete state.unread[id];
  persistAll();
  updateBadge();
  updateMe();
  navigate('discover');
  showToast('Perfil bloqueado apenas neste navegador.');
}
function reportProfile(id) {
  const p = perfilById(id);
  if (!p) return;
  openAction('report', id);
}
function quickLike(id) {
  const p = perfilById(id);
  state.likes.push(id);
  const isMatch = Math.random() < 0.55;
  state.last = { id, action: 'like', match: isMatch };
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
    <div class="ch-info"><b>${esc(p.nome)}, ${p.idade}</b><span>Resposta automática da demonstração</span></div>`;
  renderMessages();
  setTimeout(() => $('chat-input-field').focus(), 100);
}
function renderMessages() {
  const box = $('chat-messages');
  const chat = state.chats[state.currentChatId] || [];
  if (!chat.length) {
    const p = perfilById(state.currentChatId);
    const ideas = [
      `Oi, ${p.nome}! Vi que você curte ${p.interesses[0]}. Qual seu lugar favorito?`,
      'Oi! Qual foi a melhor coisa do seu dia até agora?',
      'Café, praia ou cinema: qual seria o nosso primeiro encontro?'
    ];
    box.innerHTML = `<div class="icebreakers"><p>Quebre o gelo com uma sugestão:</p>${ideas.map(t =>
      `<button type="button" class="icebreaker" data-text="${esc(t)}" onclick="useIcebreaker(this)">${esc(t)}</button>`).join('')}</div>`;
    return;
  }
  box.innerHTML = chat.map(m => `
    <div class="msg ${m.from}">${esc(m.text)}<span class="msg-time">${fmtTime(m.ts)}</span></div>`).join('');
  box.scrollTop = box.scrollHeight;
}
function useIcebreaker(el) {
  const input = $('chat-input-field');
  input.value = el.dataset.text;
  input.focus();
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
  $('edit-interest').value = state.user.interesseEm || 'Todos';
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
    <button type="button" class="avatar-choice ${state.user.avatar === p.foto ? 'selected' : ''}" data-avatar="${p.foto}" onclick="pickAvatar(this)" aria-label="Usar foto de demonstração de ${esc(p.nome)}">
      <img src="${p.foto}" alt="" />
    </button>`
  ).join('');
}
function pickAvatar(el) {
  state.user.avatar = el.dataset.avatar;
  document.querySelectorAll('#avatar-picker .avatar-choice').forEach(choice => choice.classList.toggle('selected', choice === el));
  persistAll(); updateMe();
}
function saveProfile() {
  const age = Number($('edit-age').value);
  if (!Number.isInteger(age) || age < 18 || age > 99) {
    showToast('Informe uma idade entre 18 e 99 anos');
    return;
  }
  state.user.name = $('edit-name').value.trim() || state.user.name;
  state.user.age = age;
  state.user.city = $('edit-city').value.trim() || state.user.city;
  state.user.bio = $('edit-bio').value.trim();
  state.user.job = $('edit-job').value.trim();
  state.user.interesseEm = $('edit-interest').value;
  persistAll(); updateMe(); renderDeck();
  showToast('Perfil salvo! ✨');
}

// ---------- Badge ----------
function updateBadge() {
  const total = Object.values(state.unread).reduce((a, b) => a + b, 0) + state.matches.filter(m => m.isNew).length;
  [$('bn-badge'), $('nav-badge')].forEach(badge => {
    if (!badge) return;
    if (total > 0) { badge.style.display = 'inline-flex'; badge.textContent = total; }
    else badge.style.display = 'none';
  });
}

// ---------- Init ----------
// Se já logado (demonstração), oferece entrada direta
if (state.user) {
  // Mantém landing visível; usuário pode clicar em Entrar.
}
