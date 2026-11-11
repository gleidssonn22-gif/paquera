/* ============================================
   PAQUERA — App interno (dashboard, chat, etc.)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar toggle (mobile)
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Search input filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            // Filtra cards de match/result conforme a página
            document.querySelectorAll('.match-card, .search-result-card, .chat-item').forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
});

// ===== Card swipe (Discover) =====
function swipeCard(action) {
    const stack = document.getElementById('cardStack');
    if (!stack) return;
    const cards = stack.querySelectorAll('.profile-card:not(.swipe-left):not(.swipe-right)');
    const topCard = cards[cards.length - 1];

    if (!topCard) {
        // Sem mais cards — recarrega
        location.reload();
        return;
    }

    if (action === 'like' || action === 'superlike') {
        topCard.classList.add('swipe-right');
        // 30% de chance de match
        if (Math.random() > 0.7) {
            setTimeout(() => showMatchPopup(), 400);
        }
    } else {
        topCard.classList.add('swipe-left');
    }

    // Remove após animação
    setTimeout(() => topCard.remove(), 400);
}

function showMatchPopup() {
    const popup = document.getElementById('matchPopup');
    if (popup) popup.classList.add('show');
}

function closeMatchPopup() {
    const popup = document.getElementById('matchPopup');
    if (popup) popup.classList.remove('show');
}

// ===== Match tabs =====
function switchMatchTab(tab) {
    document.querySelectorAll('.match-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    // Em produção, filtrar matches por categoria
}

// ===== Chat =====
function sendMessage() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    if (!input || !messages) return;

    const text = input.value.trim();
    if (!text) return;

    // Mensagem enviada
    const msg = document.createElement('div');
    msg.className = 'msg sent';
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    msg.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div><span class="msg-time">${time}</span>`;
    messages.appendChild(msg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Resposta simulada
    setTimeout(() => {
        const replies = [
            'Que legal! 😊',
            'Concordo totalmente!',
            'Me conta mais sobre isso 👀',
            'Adorei! Vamos conversar mais?',
            'Você é muito interessante! 😄',
            'Topa marcar um café? ☕',
        ];
        const reply = replies[Math.floor(Math.random() * replies.length)];
        const replyMsg = document.createElement('div');
        replyMsg.className = 'msg received';
        replyMsg.innerHTML = `<div class="msg-bubble">${reply}</div><span class="msg-time">${time}</span>`;
        messages.appendChild(replyMsg);
        messages.scrollTop = messages.scrollHeight;
    }, 1000 + Math.random() * 1500);
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

// ===== Settings tabs =====
function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('settings-' + tab).classList.add('active');
}

// ===== Age range filter =====
function updateAgeRange() {
    const min = document.getElementById('ageMinRange');
    const max = document.getElementById('ageMaxRange');
    if (!min || !max) return;
    if (parseInt(min.value) > parseInt(max.value)) {
        min.value = max.value;
    }
    document.getElementById('ageMin').textContent = min.value;
    document.getElementById('ageMax').textContent = max.value;
}

// ===== Utility =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
