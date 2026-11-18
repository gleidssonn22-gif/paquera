/**
 * Paquera - Dating App Worker
 * Full-featured dating platform with swipe, chat, AI matching
 */

import { ChatRoom } from "./chat-room";

export { ChatRoom };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Static assets
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      const path = url.pathname.replace("/api/", "");
      const segments = path.split("/");
      const resource = segments[0];
      const action = segments[1];

      // Auth check (except login/register)
      const token = request.headers.get("Authorization")?.replace("Bearer ", "");
      let userId = null;

      if (token && resource !== "auth") {
        userId = await verifyToken(token, env);
        if (!userId) {
          return json({ error: "Não autorizado" }, 401, corsHeaders);
        }
      }

      // Route handling
      switch (resource) {
        case "auth":
          if (action === "register") return await handleRegister(request, env, corsHeaders);
          if (action === "login") return await handleLogin(request, env, corsHeaders);
          if (action === "me") return await handleMe(userId, env, corsHeaders);
          break;

        case "discover":
          return await handleDiscover(userId, env, corsHeaders);

        case "swipe":
          return await handleSwipe(request, userId, env, corsHeaders);

        case "matches":
          if (action === undefined) return await handleListMatches(userId, env, corsHeaders);
          if (action === "messages") return await handleGetMessages(request, userId, env, corsHeaders);
          break;

        case "profile":
          if (action === undefined) return await handleGetProfile(userId, env, corsHeaders);
          if (action === "update") return await handleUpdateProfile(request, userId, env, corsHeaders);
          break;

        case "chat":
          return await handleChat(request, userId, env, corsHeaders);

        case "push":
          if (action === "subscribe") return await handlePushSubscribe(request, userId, env, corsHeaders);
          break;

        case "online":
          return await handleSetOnline(userId, env, corsHeaders);
      }

      return json({ error: "Rota não encontrada" }, 404, corsHeaders);
    } catch (err) {
      return json({ error: "Erro interno: " + err.message }, 500, corsHeaders);
    }
  },

  async scheduled(event, env) {
    // Update offline users
    const cutoff = Math.floor(Date.now() / 1000) - 300;
    await env.DB.prepare("UPDATE users SET is_online = 0 WHERE last_seen < ?").bind(cutoff).run();
  },

  async queue(batch, env) {
    for (const msg of batch.messages) {
      if (msg.body?.type === "notification") {
        await sendPushNotification(env, msg.body);
      }
    }
  },
};

// === AUTH ===
async function handleRegister(request, env, cors) {
  const { email, password, name, birth_date, gender, city } = await request.json();

  if (!email || !password || !name) {
    return json({ error: "Email, senha e nome são obrigatórios" }, 400, cors);
  }

  // Check if email exists
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return json({ error: "Email já cadastrado" }, 409, cors);
  }

  const hash = await hashPassword(password, env);
  const result = await env.DB.prepare(
    "INSERT INTO users (email, password_hash, name, birth_date, gender, city) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(email, hash, name, birth_date || null, gender || "other", city || "").run();

  const userId = result.meta.last_row_id;
  const token = await signToken({ id: userId }, env);

  return json({ token, user: { id: userId, name, email } }, 200, cors);
}

async function handleLogin(request, env, cors) {
  const { email, password } = await request.json();

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return json({ error: "Email não encontrado" }, 404, cors);

  const hash = await hashPassword(password, env);
  if (hash !== user.password_hash) return json({ error: "Senha incorreta" }, 401, cors);

  const token = await signToken({ id: user.id }, env);
  return json({ token, user: { id: user.id, name: user.name, email: user.email } }, 200, cors);
}

async function handleMe(userId, env, cors) {
  if (!userId) return json({ error: "Não autorizado" }, 401, cors);
  const user = await env.DB.prepare("SELECT id, name, email, photo_url, bio, city, gender, is_premium, is_verified FROM users WHERE id = ?").bind(userId).first();
  return json(user, 200, cors);
}

// === DISCOVER (swipe deck) ===
async function handleDiscover(userId, env, cors) {
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ error: "Usuário não encontrado" }, 404, cors);

  // Get users not yet swiped, within filters
  const swiped = await env.DB.prepare("SELECT target_id FROM swipes WHERE user_id = ?").bind(userId).all();
  const swipedIds = swiped.results.map(s => s.target_id);
  swipedIds.push(userId); // exclude self

  const placeholders = swipedIds.map(() => "?").join(",");
  const query = `
    SELECT id, name, photo_url, photo_url_2, photo_url_3, bio, city, gender, birth_date, is_online, is_verified
    FROM users
    WHERE id NOT IN (${placeholders})
    AND gender = CASE WHEN ? = 'both' THEN gender ELSE ? END
    AND looking_for IN (?, 'both')
    LIMIT 20
  `;

  const targetGender = user.looking_for === "both" ? "both" : user.gender;
  const results = await env.DB.prepare(query).bind(...swipedIds, user.looking_for, targetGender, user.gender).all();

  // Calculate age and add to results
  const profiles = results.results.map(p => ({
    ...p,
    age: p.birth_date ? calcAge(p.birth_date) : null,
    distance: 0
  }));

  return json({ profiles }, 200, cors);
}

// === SWIPE ===
async function handleSwipe(request, userId, env, cors) {
  const { target_id, action } = await request.json();

  if (!action || !target_id) return json({ error: "Dados inválidos" }, 400, cors);

  // Record swipe
  await env.DB.prepare(
    "INSERT OR IGNORE INTO swipes (user_id, target_id, action) VALUES (?, ?, ?)"
  ).bind(userId, target_id, action).run();

  let matched = false;

  if (action === "like") {
    // Check if target also liked user
    const reciprocal = await env.DB.prepare(
      "SELECT * FROM swipes WHERE user_id = ? AND target_id = ? AND action = 'like'"
    ).bind(target_id, userId).first();

    if (reciprocal) {
      // Create match
      const u1 = Math.min(userId, target_id);
      const u2 = Math.max(userId, target_id);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)"
      ).bind(u1, u2).run();

      matched = true;

      // Send notification
      await env.NOTIFICATIONS.send({
        body: { type: "notification", user_id: target_id, title: "Novo match!", body: "Você tem um novo match 💕" }
      });
    }
  }

  return json({ matched }, 200, cors);
}

// === MATCHES ===
async function handleListMatches(userId, env, cors) {
  const matches = await env.DB.prepare(`
    SELECT m.id as match_id, m.created_at,
      u.id as user_id, u.name, u.photo_url, u.is_online, u.is_verified,
      (SELECT COUNT(*) FROM messages WHERE match_id = m.id AND sender_id != ? AND read_at = 0) as unread
    FROM matches m
    JOIN users u ON CASE WHEN m.user1_id = ? THEN u.id = m.user2_id ELSE u.id = m.user1_id END
    WHERE m.user1_id = ? OR m.user2_id = ?
    ORDER BY m.created_at DESC
  `).bind(userId, userId, userId, userId).all();

  return json({ matches: matches.results }, 200, cors);
}

async function handleGetMessages(request, userId, env, cors) {
  const url = new URL(request.url);
  const matchId = url.searchParams.get("match_id");

  const messages = await env.DB.prepare(
    "SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT 100"
  ).bind(matchId).all();

  // Mark as read
  await env.DB.prepare(
    "UPDATE messages SET read_at = ? WHERE match_id = ? AND sender_id != ?"
  ).bind(Math.floor(Date.now() / 1000), matchId, userId).run();

  return json({ messages: messages.results }, 200, cors);
}

// === PROFILE ===
async function handleGetProfile(userId, env, cors) {
  const user = await env.DB.prepare(
    "SELECT id, name, email, birth_date, gender, bio, photo_url, photo_url_2, photo_url_3, city, interests, looking_for, age_min, age_max, max_distance_km, is_premium, is_verified FROM users WHERE id = ?"
  ).bind(userId).first();
  return json(user, 200, cors);
}

async function handleUpdateProfile(request, userId, env, cors) {
  const data = await request.json();
  const allowed = ["name", "bio", "photo_url", "photo_url_2", "photo_url_3", "city", "lat", "lng", "interests", "looking_for", "age_min", "age_max", "max_distance_km", "birth_date", "gender"];

  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  }
  updates.push("updated_at = strftime('%s','now')");
  values.push(userId);

  await env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ success: true }, 200, cors);
}

// === CHAT (Durable Object) ===
async function handleChat(request, userId, env, cors) {
  const url = new URL(request.url);
  const matchId = url.searchParams.get("match_id");

  if (!matchId) return json({ error: "match_id obrigatório" }, 400, cors);

  // Verify user is part of this match
  const match = await env.DB.prepare(
    "SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)"
  ).bind(matchId, userId, userId).first();

  if (!match) return json({ error: "Match não encontrado" }, 404, cors);

  // Forward to Durable Object
  const doId = env.CHAT_ROOM.idFromName(matchId);
  const stub = env.CHAT_ROOM.get(doId);

  // Pass user info via headers
  const newReq = new Request(request, {
    headers: {
      ...Object.fromEntries(request.headers),
      "X-User-Id": userId.toString(),
      "X-Match-Id": matchId,
    }
  });

  return stub.fetch(newReq);
}

// === PUSH NOTIFICATIONS ===
async function handlePushSubscribe(request, userId, env, cors) {
  const { endpoint, keys } = await request.json();

  await env.DB.prepare(
    "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)"
  ).bind(userId, endpoint, keys.p256dh, keys.auth).run();

  return json({ success: true }, 200, cors);
}

async function sendPushNotification(env, data) {
  const subs = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").bind(data.user_id).all();
  // Push notification sending would use Web Push API with VAPID keys
  // This is a placeholder for the push logic
}

// === ONLINE STATUS ===
async function handleSetOnline(userId, env, cors) {
  await env.DB.prepare("UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?")
    .bind(Math.floor(Date.now() / 1000), userId).run();
  return json({ success: true }, 200, cors);
}

// === HELPERS ===
function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function calcAge(birthDate) {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

async function hashPassword(password, env) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + env.JWT_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function signToken(payload, env) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyToken(token, env) {
  try {
    const [header, body, sig] = token.split(".");
    const payload = JSON.parse(atob(body));
    if (payload.exp < Date.now()) return null;

    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;

    return payload.id;
  } catch {
    return null;
  }
}
