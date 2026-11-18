import { ChatRoom } from "./chat-room";
export { ChatRoom };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const ua = (request.headers.get("User-Agent") || "").toLowerCase();
    if (["bot","crawler","spider","scan","curl","wget","nikto","nmap"].some(b => ua.includes(b)))
      return new Response("Forbidden", { status: 403 });

    if (["/.env","/.git","/wp-admin","/xmlrpc","/phpmyadmin","/admin","/config","/backup","/.ssh"].some(p => url.pathname.startsWith(p)))
      return new Response("Not Found", { status: 404 });

    if (!url.pathname.startsWith("/api/")) {
      const resp = await env.ASSETS.fetch(request);
      const nr = new Response(resp.body, resp);
      const ext = url.pathname.split(".").pop()?.toLowerCase();
      if (["css","js","png","jpg","jpeg","gif","svg","ico","woff","woff2","ttf","webp","avif"].includes(ext))
        nr.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      else if (url.pathname.endsWith(".html"))
        nr.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      nr.headers.set("X-Content-Type-Options", "nosniff");
      nr.headers.set("X-Frame-Options", "DENY");
      return nr;
    }

    try {
      const path = url.pathname.replace("/api/", "");
      const seg = path.split("/");
      const resource = seg[0];
      const action = seg[1];
      const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
      let userId = null;
      if (token && resource !== "auth") {
        userId = await verifyToken(token, env);
        if (!userId) return json({ error: "Não autorizado" }, 401);
      }

      if (resource === "auth" && (action === "login" || action === "register")) {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const key = "rate_" + action + "_" + ip;
        const count = parseInt(await env.SITE_KV.get(key) || "0");
        if (count >= 5) return json({ error: "Muitas tentativas. Tente em 1 minuto." }, 429);
        await env.SITE_KV.put(key, String(count + 1), { expirationTtl: 60 });
      }

      if (resource === "auth") {
        if (action === "register") return await handleRegister(request, env);
        if (action === "login") return await handleLogin(request, env);
        if (action === "me") return await handleMe(userId, env);
      }
      if (resource === "discover") return await handleDiscover(userId, env);
      if (resource === "swipe") return await handleSwipe(request, userId, env);
      if (resource === "matches") {
        if (!action) return await handleListMatches(userId, env);
        if (action === "messages") return await handleGetMessages(request, userId, env);
      }
      if (resource === "profile") {
        if (!action) return await handleGetProfile(userId, env);
        if (action === "update") return await handleUpdateProfile(request, userId, env);
      }
      if (resource === "chat") return await handleChat(request, userId, env);
      if (resource === "push" && action === "subscribe") return await handlePushSubscribe(request, userId, env);
      if (resource === "online") return await handleSetOnline(userId, env);
      return json({ error: "Rota não encontrada" }, 404);
    } catch (err) {
      return json({ error: "Erro interno" }, 500);
    }
  },

  async scheduled(event, env) {
    try {
      const cutoff = Math.floor(Date.now() / 1000) - 300;
      await env.DB.prepare("UPDATE users SET is_online = 0 WHERE last_seen < ?").bind(cutoff).run();
    } catch (e) {}
  },

  async queue(batch, env) {
    for (const msg of batch.messages) {
      try {
        if (msg.body && msg.body.type === "notification") {
          await env.DB.prepare("SELECT id FROM push_subscriptions WHERE user_id = ?").bind(msg.body.user_id).first();
        }
      } catch (e) {}
    }
  }
};

async function handleRegister(request, env) {
  const body = await request.json();
  if (!body.email || !body.password || !body.name) return json({ error: "Email, senha e nome são obrigatórios" }, 400);
  if (body.password.length < 6) return json({ error: "Senha deve ter no mínimo 6 caracteres" }, 400);
  if (!body.email.includes("@")) return json({ error: "Email inválido" }, 400);
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first();
  if (existing) return json({ error: "Email já cadastrado" }, 409);
  const hash = await hashPassword(body.password, env);
  const result = await env.DB.prepare("INSERT INTO users (email, password_hash, name, birth_date, gender, city) VALUES (?, ?, ?, ?, ?, ?)").bind(body.email, hash, body.name, body.birth_date || null, body.gender || "other", body.city || "").run();
  const userId = result.meta.last_row_id;
  const token = await signToken({ id: userId }, env);
  return json({ token, user: { id: userId, name: body.name, email: body.email } }, 200);
}

async function handleLogin(request, env) {
  const body = await request.json();
  if (!body.email || !body.password) return json({ error: "Email e senha obrigatórios" }, 400);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
  if (!user) return json({ error: "Email não encontrado" }, 404);
  const hash = await hashPassword(body.password, env);
  if (hash !== user.password_hash) return json({ error: "Senha incorreta" }, 401);
  const token = await signToken({ id: user.id }, env);
  return json({ token, user: { id: user.id, name: user.name, email: user.email } }, 200);
}

async function handleMe(userId, env) {
  if (!userId) return json({ error: "Não autorizado" }, 401);
  const user = await env.DB.prepare("SELECT id, name, email, photo_url, bio, city, gender, is_premium, is_verified FROM users WHERE id = ?").bind(userId).first();
  return json(user, 200);
}

async function handleDiscover(userId, env) {
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ error: "Usuário não encontrado" }, 404);
  const swiped = await env.DB.prepare("SELECT target_id FROM swipes WHERE user_id = ?").bind(userId).all();
  const swipedIds = swiped.results.map(s => s.target_id);
  swipedIds.push(userId);
  const placeholders = swipedIds.map(() => "?").join(",");
  const targetGender = user.looking_for === "both" ? "both" : user.gender;
  const query = "SELECT id, name, photo_url, photo_url_2, photo_url_3, bio, city, gender, birth_date, is_online, is_verified FROM users WHERE id NOT IN (" + placeholders + ") AND gender = CASE WHEN ? = 'both' THEN gender ELSE ? END AND looking_for IN (?, 'both') LIMIT 20";
  const results = await env.DB.prepare(query).bind(...swipedIds, user.looking_for, targetGender, user.gender).all();
  const profiles = results.results.map(p => ({ id: p.id, name: p.name, photo_url: p.photo_url, bio: p.bio, city: p.city, gender: p.gender, birth_date: p.birth_date, is_online: p.is_online, is_verified: p.is_verified, age: p.birth_date ? calcAge(p.birth_date) : null, distance: 0 }));
  return json({ profiles }, 200);
}

async function handleSwipe(request, userId, env) {
  const body = await request.json();
  if (!body.action || !body.target_id) return json({ error: "Dados inválidos" }, 400);
  if (body.action !== "like" && body.action !== "pass") return json({ error: "Ação inválida" }, 400);
  await env.DB.prepare("INSERT OR IGNORE INTO swipes (user_id, target_id, action) VALUES (?, ?, ?)").bind(userId, body.target_id, body.action).run();
  let matched = false;
  if (body.action === "like") {
    const reciprocal = await env.DB.prepare("SELECT * FROM swipes WHERE user_id = ? AND target_id = ? AND action = 'like'").bind(body.target_id, userId).first();
    if (reciprocal) {
      const u1 = Math.min(userId, body.target_id);
      const u2 = Math.max(userId, body.target_id);
      await env.DB.prepare("INSERT OR IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)").bind(u1, u2).run();
      matched = true;
      await env.NOTIFICATIONS.send({ body: { type: "notification", user_id: body.target_id } });
    }
  }
  return json({ matched }, 200);
}

async function handleListMatches(userId, env) {
  const matches = await env.DB.prepare("SELECT m.id as match_id, m.created_at, u.id as user_id, u.name, u.photo_url, u.is_online, u.is_verified, (SELECT COUNT(*) FROM messages WHERE match_id = m.id AND sender_id != ? AND read_at = 0) as unread FROM matches m JOIN users u ON CASE WHEN m.user1_id = ? THEN u.id = m.user2_id ELSE u.id = m.user1_id END WHERE m.user1_id = ? OR m.user2_id = ? ORDER BY m.created_at DESC").bind(userId, userId, userId, userId).all();
  return json({ matches: matches.results }, 200);
}

async function handleGetMessages(request, userId, env) {
  const matchId = new URL(request.url).searchParams.get("match_id");
  if (!matchId) return json({ error: "match_id obrigatório" }, 400);
  const messages = await env.DB.prepare("SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT 100").bind(matchId).all();
  await env.DB.prepare("UPDATE messages SET read_at = ? WHERE match_id = ? AND sender_id != ?").bind(Math.floor(Date.now() / 1000), matchId, userId).run();
  return json({ messages: messages.results }, 200);
}

async function handleGetProfile(userId, env) {
  const user = await env.DB.prepare("SELECT id, name, email, birth_date, gender, bio, photo_url, photo_url_2, photo_url_3, city, interests, looking_for, age_min, age_max, max_distance_km, is_premium, is_verified FROM users WHERE id = ?").bind(userId).first();
  return json(user, 200);
}

async function handleUpdateProfile(request, userId, env) {
  const data = await request.json();
  const allowed = ["name", "bio", "photo_url", "photo_url_2", "photo_url_3", "city", "lat", "lng", "interests", "looking_for", "age_min", "age_max", "max_distance_km", "birth_date", "gender"];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) { updates.push(key + " = ?"); values.push(data[key]); }
  }
  updates.push("updated_at = strftime('%s','now')");
  values.push(userId);
  await env.DB.prepare("UPDATE users SET " + updates.join(", ") + " WHERE id = ?").bind(...values).run();
  return json({ success: true }, 200);
}

async function handleChat(request, userId, env) {
  const matchId = new URL(request.url).searchParams.get("match_id");
  if (!matchId) return json({ error: "match_id obrigatório" }, 400);
  const match = await env.DB.prepare("SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)").bind(matchId, userId, userId).first();
  if (!match) return json({ error: "Match não encontrado" }, 404);
  const doId = env.CHAT_ROOM.idFromName(matchId);
  const stub = env.CHAT_ROOM.get(doId);
  const headers = new Headers(request.headers);
  headers.set("X-User-Id", userId.toString());
  headers.set("X-Match-Id", matchId);
  const newReq = new Request(request.url, { method: request.method, headers, body: request.body });
  return stub.fetch(newReq);
}

async function handlePushSubscribe(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)").bind(userId, body.endpoint, body.keys.p256dh, body.keys.auth).run();
  return json({ success: true }, 200);
}

async function handleSetOnline(userId, env) {
  await env.DB.prepare("UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?").bind(Math.floor(Date.now() / 1000), userId).run();
  return json({ success: true }, 200);
}

function calcAge(birthDate) {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

async function hashPassword(password, env) {
  const data = new TextEncoder().encode(password + env.JWT_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function signToken(payload, env) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 }));
  const data = header + "." + body;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return data + "." + btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyToken(token, env) {
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    const data = parts[0] + "." + parts[1];
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    return payload.id;
  } catch (e) { return null; }
}
