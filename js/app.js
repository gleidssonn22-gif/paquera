// Paquera - Shared App JavaScript
const API = "/api";
let authToken = localStorage.getItem("paquera_token");
let currentUser = null;

// API helper
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro");
  return data;
}

// Auth check
async function checkAuth() {
  if (!authToken) {
    window.location.href = "/entrar.html";
    return false;
  }
  try {
    currentUser = await api("/auth/me");
    return true;
  } catch {
    localStorage.removeItem("paquera_token");
    window.location.href = "/entrar.html";
    return false;
  }
}

// Online status ping
function startOnlinePing() {
  if (!authToken) return;
  api("/online", { method: "POST" }).catch(() => {});
  setInterval(() => api("/online", { method: "POST" }).catch(() => {}), 60000);
}

// Toast notification
function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    padding: 12px 24px; border-radius: 12px; z-index: 999;
    background: ${type === "error" ? "#ff4757" : type === "success" ? "#2ed573" : "#6c5ce7"};
    color: white; font-size: 14px; font-weight: 600;
    animation: fadeIn 0.3s ease; max-width: 90%;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Swipe functionality
class SwipeDeck {
  constructor(container, profiles, onSwipe) {
    this.container = container;
    this.profiles = profiles;
    this.onSwipe = onSwipe;
    this.index = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    const remaining = this.profiles.slice(this.index, this.index + 3);

    remaining.reverse().forEach((profile, i) => {
      const card = this.createCard(profile);
      card.style.zIndex = remaining.length - i;
      if (i === remaining.length - 1) this.attachDrag(card, profile);
      this.container.appendChild(card);
    });

    if (remaining.length === 0) {
      this.container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);text-align:center;padding:20px;">
          <div><div style="font-size:48px;margin-bottom:12px;">💔</div>
          <p>Não há mais perfis no momento.<br>Volte mais tarde!</p></div>
        </div>`;
    }
  }

  createCard(profile) {
    const card = document.createElement("div");
    card.className = "swipe-card fade-in";
    const photo = profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=400&background=6c5ce7&color=fff&bold=true`;
    const age = profile.age ? `, ${profile.age}` : "";
    card.innerHTML = `
      <div class="like-badge">LIKE</div>
      <div class="nope-badge">NOPE</div>
      <img src="${photo}" alt="${profile.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=400&background=6c5ce7&color=fff'">
      <div class="card-info">
        <h2>${profile.name}${age} ${profile.is_verified ? '<span class="verified">✔️</span>' : ""}</h2>
        ${profile.city ? `<p style="color:#aaa;font-size:13px;">📍 ${profile.city}</p>` : ""}
        <p class="bio">${profile.bio || "Sem descrição"}</p>
      </div>
    `;
    return card;
  }

  attachDrag(card, profile) {
    let startX = 0, currentX = 0, dragging = false;

    const onStart = (e) => {
      dragging = true;
      startX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
      card.classList.add("dragging");
    };

    const onMove = (e) => {
      if (!dragging) return;
      currentX = (e.type === "touchmove" ? e.touches[0].clientX : e.clientX) - startX;
      const rotation = currentX * 0.05;
      card.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;
      card.classList.toggle("show-like", currentX > 100);
      card.classList.toggle("show-nope", currentX < -100);
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove("dragging");

      if (currentX > 100) {
        card.style.transform = "translateX(500px) rotate(30deg)";
        card.style.opacity = "0";
        setTimeout(() => this.next("like", profile), 300);
      } else if (currentX < -100) {
        card.style.transform = "translateX(-500px) rotate(-30deg)";
        card.style.opacity = "0";
        setTimeout(() => this.next("pass", profile), 300);
      } else {
        card.style.transform = "";
        card.classList.remove("show-like", "show-nope");
      }
    };

    card.addEventListener("mousedown", onStart);
    card.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
  }

  next(action, profile) {
    this.onSwipe(profile.id, action).then(result => {
      if (result.matched) showMatchPopup(profile);
    });
    this.index++;
    this.render();
  }

  pass() {
    if (this.profiles[this.index]) {
      this.onSwipe(this.profiles[this.index].id, "pass");
      this.index++;
      this.render();
    }
  }

  like() {
    if (this.profiles[this.index]) {
      this.onSwipe(this.profiles[this.index].id, "like").then(result => {
        if (result.matched) showMatchPopup(this.profiles[this.index - 1] || this.profiles[this.index]);
      });
      this.index++;
      this.render();
    }
  }
}

// Match popup
function showMatchPopup(profile) {
  const popup = document.createElement("div");
  popup.className = "match-popup show";
  const myPhoto = currentUser?.photo_url || "https://ui-avatars.com/api/?name=Eu&size=120&background=ff4458&color=fff";
  const theirPhoto = profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=120&background=6c5ce7&color=fff`;
  popup.innerHTML = `
    <div class="match-content">
      <h1>É um Match! 💕</h1>
      <div class="match-avatars">
        <img src="${myPhoto}" alt="Você">
        <img src="${theirPhoto}" alt="${profile.name}">
      </div>
      <p style="color:var(--text-muted);margin-bottom:24px;">Você e ${profile.name} se curtiram!</p>
      <button class="btn btn-primary" onclick="window.location.href='/chat.html'">Conversar</button>
      <button class="btn btn-outline" style="margin-left:8px;" onclick="this.closest('.match-popup').remove()">Continuar</button>
    </div>
  `;
  document.body.appendChild(popup);
}

// Logout
function logout() {
  localStorage.removeItem("paquera_token");
  window.location.href = "/entrar.html";
}
