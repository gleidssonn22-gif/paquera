// ============================================================
// PAQUERA — Recursos extras da demonstração
// (pergunta do dia, respostas de perfil, compatibilidade, encontro às cegas,
//  expiração de matches, ideias de encontro, dicas de segurança, convites)
// Carregado depois de app.js; tudo fica salvo apenas no navegador.
// ============================================================

const EXPIRA_MS = 24 * 60 * 60 * 1000;
const REVELAR_APOS = 6; // mensagens trocadas para revelar a foto no modo às cegas

// ---------- Selects preenchidos por dados ----------
function fillSelect(id, options) {
  const el = $(id);
  if (el) el.innerHTML = options.map(o => `<option>${esc(o)}</option>`).join('');
}
fillSelect('signup-goal', OBJETIVOS);
fillSelect('edit-goal', OBJETIVOS);

// ---------- Modo encontro às cegas ----------
function isBlind(id) {
  return Boolean(state.user && state.user.blind) && (state.chats[id] || []).length < REVELAR_APOS;
}
function blurClass(id) { return isBlind(id) ? 'blurred' : ''; }

// ---------- Expiração de matches (24 h sem mensagem sua) ----------
function hasMyMessage(id) { return (state.chats[id] || []).some(m => m.from === 'me'); }
function expireMatches() {
  const agora = Date.now();
  const antes = state.matches.length;
  const expirados = state.matches.filter(m => agora - m.ts > EXPIRA_MS && !hasMyMessage(m.id));
  if (!expirados.length) return;
  state.matches = state.matches.filter(m => !expirados.includes(m));
  expirados.forEach(m => { delete state.unread[m.id]; });
  persistAll(); updateBadge();
  showToast(expirados.length === 1 ? '1 match expirou por falta de conversa' : `${expirados.length} matches expiraram por falta de conversa`);
  return antes - state.matches.length;
}
function expiraTexto(m) {
  if (hasMyMessage(m.id)) return '';
  const restante = m.ts + EXPIRA_MS - Date.now();
  if (restante <= 0) return '⏳ expira já';
  const horas = Math.ceil(restante / 3600000);
  return horas <= 1 ? '⏳ menos de 1 h' : `⏳ ${horas} h`;
}

// ---------- Compatibilidade explicada ----------
function compatReasons(p) {
  const u = state.user || {};
  const motivos = [];
  const comuns = commonInterests(p);
  if (comuns.length) motivos.push(`${comuns.length} ${comuns.length === 1 ? 'interesse' : 'interesses'} em comum: ${comuns.slice(0, 3).join(', ')}`);
  if (u.objetivo && p.objetivo && u.objetivo === p.objetivo && u.objetivo !== 'Ainda não sei') motivos.push(`Os dois procuram: ${p.objetivo.toLowerCase()}`);
  const minhaCidade = normalizeText((u.city || '').split(',')[0]);
  if (minhaCidade && normalizeText(p.cidade).startsWith(minhaCidade)) motivos.push('Vocês estão na mesma cidade');
  else if (p.distancia <= 10) motivos.push(`Fica a apenas ${p.distancia} km de você`);
  const diff = Math.abs((u.age || p.idade) - p.idade);
  if (u.age && diff <= 5) motivos.push(diff === 0 ? 'Têm a mesma idade' : `Idades próximas (${diff} ${diff === 1 ? 'ano' : 'anos'} de diferença)`);
  return motivos;
}
function compatHTML(p) {
  const motivos = compatReasons(p);
  if (!motivos.length) return '';
  return `<div class="pd-section"><h4>Por que combinam</h4><ul class="compat-list">${motivos.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
}
function promptsHTML(p) {
  if (!p.prompts || !p.prompts.length) return '';
  return `<div class="pd-section"><h4>Respostas</h4>${p.prompts.map(x =>
    `<div class="prompt-card"><span>${esc(x.q)}</span><p>${esc(x.a)}</p></div>`).join('')}</div>`;
}

// ---------- Campos de respostas do perfil (edição) ----------
function fillPromptFields() {
  const atuais = (state.user && state.user.prompts) || [];
  [1, 2].forEach(n => {
    const sel = $('edit-pq' + n), inp = $('edit-pa' + n);
    if (!sel || !inp) return;
    sel.innerHTML = PROMPT_PERGUNTAS.map(q => `<option>${esc(q)}</option>`).join('');
    const item = atuais[n - 1];
    sel.value = item ? item.q : PROMPT_PERGUNTAS[n - 1];
    inp.value = item ? item.a : '';
  });
  $('edit-goal').value = (state.user && state.user.objetivo) || OBJETIVOS[0];
  $('edit-blind').checked = Boolean(state.user && state.user.blind);
}
function readPromptFields() {
  return [1, 2].map(n => ({ q: $('edit-pq' + n).value, a: $('edit-pa' + n).value.trim().slice(0, 120) })).filter(x => x.a);
}

// ---------- Pergunta do dia ----------
function diaAtual() {
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}
function perguntaDoDia() { return PERGUNTAS_DO_DIA[diaAtual() % PERGUNTAS_DO_DIA.length]; }
function respostaDoDia() {
  const salvo = load(LS.daily, null);
  return salvo && salvo.day === diaAtual() ? salvo.answer : '';
}
function renderDaily() {
  const box = $('daily-question');
  if (!box) return;
  const resp = respostaDoDia();
  box.innerHTML = `
    <span class="dq-label">💬 Pergunta do dia</span>
    <p class="dq-q">${esc(perguntaDoDia())}</p>
    ${resp
      ? `<p class="dq-a">Sua resposta: <b>${esc(resp)}</b></p><button type="button" class="btn btn-ghost btn-sm" onclick="editDaily()">Editar</button>`
      : `<div class="dq-form"><input id="daily-input" type="text" maxlength="100" placeholder="Responda em poucas palavras" onkeydown="if(event.key==='Enter')saveDaily()"><button type="button" class="btn btn-primary btn-sm" onclick="saveDaily()">Responder</button></div>`}`;
}
function saveDaily() {
  const v = $('daily-input').value.trim();
  if (!v) { showToast('Escreva sua resposta'); return; }
  save(LS.daily, { day: diaAtual(), answer: v.slice(0, 100) });
  renderDaily();
  showToast('Resposta salva! Use-a para puxar assunto nas conversas.');
}
function editDaily() {
  save(LS.daily, null);
  renderDaily();
  const el = $('daily-input'); if (el) el.focus();
}
function dailyIcebreakers(p) {
  const lista = [`Pergunta do dia: ${perguntaDoDia()} 🙂`];
  const r = respostaDoDia();
  if (r) lista.unshift(`Pergunta do dia: ${perguntaDoDia()} Eu respondi: ${r}. E você?`);
  return lista;
}

// ---------- Quem curtiu você / Premium (prévia de demonstração) ----------
function premiumAtivo() { return load(LS.premium, false) === true; }
function quemCurtiu() {
  const dia = diaAtual();
  const fora = new Set([...state.likes, ...state.blocked, ...state.matches.map(m => m.id)]);
  return PERFIS.filter(p => !fora.has(p.id))
    .sort((a, b) => ((a.id + dia) % 12) - ((b.id + dia) % 12))
    .slice(0, 3);
}
function renderLikesYou() {
  const box = $('likes-you');
  if (!box) return;
  const lista = quemCurtiu();
  if (!lista.length) { box.innerHTML = ''; return; }
  const aberto = premiumAtivo();
  box.innerHTML = `
    <button type="button" class="likes-card" onclick="openLikesYou()">
      <span class="lk-avatars">${lista.map(p => `<img class="${aberto ? '' : 'blurred'}" src="${p.foto}" alt="" width="40" height="40">`).join('')}</span>
      <span class="lk-text"><b>${lista.length} ${lista.length === 1 ? 'pessoa curtiu' : 'pessoas curtiram'} você</b>
        <small>${aberto ? 'Toque para ver quem são' : 'Recurso Premium (prévia de demonstração)'}</small></span>
    </button>`;
}
function openLikesYou() {
  if (!premiumAtivo()) { openPremium(); return; }
  $('likes-list').innerHTML = quemCurtiu().map(p => `
    <button type="button" class="conv-item" onclick="openLikeProfile(${p.id})">
      <span class="conv-avatar"><img src="${p.foto}" alt=""></span>
      <span class="conv-body"><b>${esc(p.nome)}, ${p.idade}</b><span>${esc(p.cidade)}</span></span>
    </button>`).join('');
  $('likes-dialog').showModal();
}
function openLikeProfile(id) { closeDialog('likes-dialog'); navigate('profile', id); }
function openPremium() { $('premium-dialog').showModal(); }
function activatePremiumDemo() {
  save(LS.premium, true);
  closeDialog('premium-dialog');
  renderLikesYou();
  showToast('Recurso liberado para teste neste navegador (sem cobrança)');
}

// ---------- Ideias de encontro ----------
function openIdeas() {
  const p = perfilById(state.currentChatId);
  if (!p) return;
  const comuns = commonInterests(p);
  let ideias = comuns.map(i => IDEIAS_ENCONTRO[i]).filter(Boolean);
  if (ideias.length < 3) ideias = [...ideias, ...IDEIAS_GERAIS];
  ideias = [...new Set(ideias)].slice(0, 5);
  $('ideas-title').textContent = `Ideias de encontro com ${p.nome}`;
  $('ideas-list').innerHTML = ideias.map(i => `<li>${esc(i)}</li>`).join('');
  $('ideas-dialog').showModal();
}

// ---------- Cabeçalho do chat e dicas de segurança ----------
function renderChatHeader(p) {
  const bloqueada = isBlind(p.id);
  $('chat-header').innerHTML = `
    <button class="icon-btn" onclick="navigate('matches')" aria-label="Voltar" style="margin-right:4px;">←</button>
    <img class="${blurClass(p.id)}" src="${p.foto}" alt="${bloqueada ? 'Foto oculta no modo encontro às cegas' : esc(p.nome)}" />
    <div class="ch-info"><b>${esc(p.nome)}, ${p.idade}</b><span>${bloqueada ? `Foto revelada após ${REVELAR_APOS} mensagens` : 'Resposta automática da demonstração'}</span></div>
    <button type="button" class="btn btn-outline btn-sm ch-ideas" onclick="openIdeas()">📍 Ideias de encontro</button>`;
}
function renderChatSafety() {
  const el = $('chat-safety');
  if (!el) return;
  el.hidden = Boolean(load(LS.safety, false));
}
function dismissChatSafety() {
  save(LS.safety, true);
  renderChatSafety();
}
function warnSensitive(text) {
  const risco = /\b(pix|cpf|rg|senha|cart[aã]o|conta banc[aá]ria|empr[eé]stimo|transfer[eê]ncia)\b/i.test(text)
    || /\b\d{2}\s?9?\d{4}[-\s]?\d{4}\b/.test(text);
  if (risco) showToast('Cuidado: evite compartilhar dados pessoais ou financeiros.');
}

// ---------- Convidar amigos ----------
async function inviteFriends() {
  const url = location.origin + '/';
  const text = 'Conheça o Paquera, uma demonstração de site de relacionamentos.';
  try {
    if (navigator.share) { await navigator.share({ title: 'Paquera', text, url }); return; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    showToast('Link copiado! Cole onde quiser compartilhar.');
  } catch {
    showToast('Não foi possível compartilhar agora.');
  }
}

// ---------- Links diretos para avisos legais (#privacidade, #termos) ----------
function openFromHash() {
  const h = location.hash.replace('#', '');
  if (h === 'privacidade') openInfo('privacy');
  else if (h === 'termos') openInfo('terms');
}
openFromHash();
window.addEventListener('hashchange', openFromHash);
