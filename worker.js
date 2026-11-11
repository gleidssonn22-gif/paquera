export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const H = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "Authorization,Content-Type", "content-type": "application/json" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
    const j = (d, s) => new Response(JSON.stringify(d), { status: s || 200, headers: H });
    try {
      const user = await getAuthUser(request, env);
      const path = url.pathname.replace(/^\/api\//, "");
      const [resource, id, action] = path.split("/");
      const m = request.method;

      if (resource === "register" && m === "POST") {
        const b = await request.json();
        if (!b.name || !b.email || !b.password) return j({ error: "Dados incompletos" }, 400);
        if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(b.email).first()) return j({ error: "Email ja cadastrado" }, 409);
        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hash = await hashPassword(b.password, salt);
        const r = await env.DB.prepare("INSERT INTO users (name,email,password_hash,salt,age,gender,city,plan) VALUES (?,?,?,?,?,?,?,?)").bind(b.name, b.email, hash, salt, b.age||null, b.gender||null, b.city||null, "free").run();
        const uid = r.meta.last_row_id;
        await env.DB.prepare("INSERT INTO preferences (user_id) VALUES (?)").bind(uid).run();
        const token = await signToken({ uid, email: b.email, name: b.name, exp: Math.floor(Date.now()/1000)+2592000 }, env.JWT_SECRET);
        return j({ token, user: { id: uid, name: b.name, email: b.email } });
      }

      if (resource === "login" && m === "POST") {
        const b = await request.json();
        const row = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(b.email).first();
        if (!row) return j({ error: "Credenciais invalidas" }, 401);
        if (await hashPassword(b.password, row.salt) !== row.password_hash) return j({ error: "Credenciais invalidas" }, 401);
        const token = await signToken({ uid: row.id, email: row.email, name: row.name, exp: Math.floor(Date.now()/1000)+2592000 }, env.JWT_SECRET);
        return j({ token, user: { id: row.id, name: row.name, email: row.email, bio: row.bio, age: row.age, city: row.city } });
      }

      if (!user) return j({ error: "Nao autorizado" }, 401);

      if (resource === "users" && m === "GET") {
        if (id === "me") {
          const row = await env.DB.prepare("SELECT id,name,email,bio,age,city,gender,plan FROM users WHERE id=?").bind(user.uid).first();
          return j(row || { error: "not found" }, row ? 200 : 404);
        }
        if (id) {
          const row = await env.DB.prepare("SELECT u.id,u.name,u.bio,u.age,u.city,u.gender,(SELECT photo_url FROM user_photos WHERE user_id=u.id ORDER BY id LIMIT 1) as photo FROM users u WHERE u.id=?").bind(parseInt(id)).first();
          return j(row || { error: "not found" }, row ? 200 : 404);
        }
        const liked = await env.DB.prepare("SELECT to_user_id FROM likes WHERE from_user_id=?").bind(user.uid).all();
        const excl = liked.results.map(x => x.to_user_id).concat([user.uid]);
        const ph = excl.length ? excl.map(() => "?").join(",") : "0";
        const rows = await env.DB.prepare("SELECT u.id,u.name,u.bio,u.age,u.city,u.gender,(SELECT photo_url FROM user_photos WHERE user_id=u.id ORDER BY id LIMIT 1) as photo,(SELECT verified FROM profile_verification WHERE user_id=u.id) as verified FROM users u WHERE u.id NOT IN (" + ph + ") ORDER BY u.created_at DESC LIMIT 50").bind(...excl).all();
        return j({ users: rows.results });
      }

      if (resource === "likes" && m === "POST") {
        const to = parseInt((await request.json()).to_user_id);
        try { await env.DB.prepare("INSERT INTO likes (from_user_id,to_user_id) VALUES (?,?)").bind(user.uid, to).run(); } catch (e) {}
        const recip = await env.DB.prepare("SELECT from_user_id FROM likes WHERE from_user_id=? AND to_user_id=?").bind(to, user.uid).first();
        let matched = false;
        if (recip) { matched = true; try { await env.DB.prepare("INSERT INTO matches (user1_id,user2_id) VALUES (?,?)").bind(Math.min(user.uid,to), Math.max(user.uid,to)).run(); } catch (e) {} }
        return j({ ok: true, matched });
      }

      if (resource === "super-likes" && m === "POST") {
        try { await env.DB.prepare("INSERT INTO super_likes (from_user_id,to_user_id) VALUES (?,?)").bind(user.uid, parseInt((await request.json()).to_user_id)).run(); } catch (e) {}
        return j({ ok: true });
      }

      if (resource === "matches" && !id && m === "GET") {
        const rows = await env.DB.prepare("SELECT m.id,m.created_at,CASE WHEN m.user1_id=? THEN m.user2_id ELSE m.user1_id END AS other_id,u.name,u.age,u.city,u.bio,(SELECT photo_url FROM user_photos WHERE user_id=u.id ORDER BY id LIMIT 1) as photo,(SELECT last_seen FROM user_status WHERE user_id=u.id) as last_seen,(SELECT COUNT(*) FROM messages WHERE match_id=m.id) AS msg_count FROM matches m JOIN users u ON u.id=CASE WHEN m.user1_id=? THEN m.user2_id ELSE m.user1_id END WHERE m.user1_id=? OR m.user2_id=? ORDER BY m.created_at DESC").bind(user.uid,user.uid,user.uid,user.uid).all();
        return j({ matches: rows.results });
      }

      if (resource === "matches" && id && action === "messages" && m === "GET") {
        const rows = await env.DB.prepare("SELECT * FROM messages WHERE match_id=? ORDER BY created_at ASC LIMIT 100").bind(parseInt(id)).all();
        return j({ messages: rows.results });
      }

      if (resource === "matches" && id && action === "messages" && m === "POST") {
        const content = ((await request.json()).content || "").slice(0, 2000);
        if (!content) return j({ error: "Mensagem vazia" }, 400);
        let mod = "ok";
        try { const mr = await env.AI.run("@cf/meta/llama-guard-3-8b", { messages: [{ role: "user", content }] }); if (mr && mr.response && /unsafe/i.test(mr.response)) mod = "blocked"; } catch (e) {}
        if (mod === "blocked") return j({ error: "Conteudo bloqueado" }, 422);
        const r = await env.DB.prepare("INSERT INTO messages (match_id,from_user_id,content,type) VALUES (?,?,?,?)").bind(parseInt(id), user.uid, content, "text").run();
        return j({ id: r.meta.last_row_id, moderation: mod });
      }

      if (resource === "ai" && id === "bio" && m === "POST") {
        const b = await request.json();
        const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", { messages: [{ role: "user", content: "Escreva uma bio curta (max 140 chars) em portugues para perfil de app de relacionamento. Nome: " + (b.name||"") + " Interesses: " + ((b.interests||[]).join(", ")) + ". Responda so a bio." }], max_tokens: 200 });
        return j({ bio: r && r.response ? r.response.trim() : "" });
      }
      if (resource === "ai" && id === "icebreaker" && m === "POST") {
        const b = await request.json();
        const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", { messages: [{ role: "user", content: "Crie UMA frase de abertura curta (max 120 chars) em portugues para iniciar conversa. Nome do crush: " + (b.name||"") + ". Responda so a frase." }], max_tokens: 120 });
        return j({ icebreaker: r && r.response ? r.response.trim() : "" });
      }
      if (resource === "ai" && id === "interests" && m === "POST") {
        const b = await request.json();
        const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", { messages: [{ role: "user", content: "Sugira 5 interesses em portugues, palavras separadas por virgula. Texto: " + (b.text||"") + ". Responda so a lista." }], max_tokens: 80 });
        return j({ interests: (r && r.response ? r.response : "").split(/[,;\n]/).map(s => s.trim().toLowerCase()).filter(Boolean).slice(0,5) });
      }

      if (resource === "search" && m === "GET") {
        const q = url.searchParams.get("q") || "";
        let sql = "SELECT id,name,bio,age,city,(SELECT photo_url FROM user_photos WHERE user_id=users.id ORDER BY id LIMIT 1) as photo FROM users WHERE id<>?";
        const args = [user.uid];
        if (q) { sql += " AND (name LIKE ? OR city LIKE ?)"; args.push("%"+q+"%", "%"+q+"%"); }
        sql += " LIMIT 50";
        return j({ users: (await env.DB.prepare(sql).bind(...args).all()).results });
      }

      if (resource === "presence" && id === "heartbeat" && m === "POST") {
        await env.DB.prepare("INSERT INTO user_status (user_id,last_seen,online) VALUES (?,datetime('now'),1) ON CONFLICT(user_id) DO UPDATE SET last_seen=datetime('now'),online=1").bind(user.uid).run();
        return j({ ok: true });
      }
      if (resource === "presence" && !id && m === "GET") {
        const ids = (url.searchParams.get("ids") || "").split(",").map(x => parseInt(x)).filter(Boolean);
        if (!ids.length) return j({ presence: {} });
        const rows = await env.DB.prepare("SELECT user_id,last_seen FROM user_status WHERE user_id IN (" + ids.map(() => "?").join(",") + ")").bind(...ids).all();
        const now = Date.now(); const presence = {};
        (rows.results || []).forEach(r => { const s = r.last_seen ? new Date(r.last_seen.replace(" ","T")+"Z").getTime() : 0; presence[r.user_id] = (now - s) < 120000; });
        ids.forEach(i => { if (!(i in presence)) presence[i] = false; });
        return j({ presence });
      }

      return j({ error: "not found" }, 404);
    } catch (e) { return j({ error: e.message || "internal" }, 500); }
  },
  async scheduled(event, env) { try { await env.DB.prepare("UPDATE user_status SET online=0 WHERE last_seen < datetime('now','-2 minutes')").run(); } catch (e) {} },
  async queue(batch, env) { for (const m of batch.messages) { try { m.ack(); } catch (e) {} } }
};

async function getAuthUser(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try { return await verifyToken(auth.slice(7), env.JWT_SECRET); } catch (e) { return null; }
}
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
async function signToken(payload, secret) {
  const enc = new TextEncoder();
  const body = b64u(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return body + "." + b64bin(String.fromCharCode(...new Uint8Array(sig)));
}
async function verifyToken(token, secret) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, Uint8Array.from(unb64bin(sig), c => c.charCodeAt(0)), enc.encode(body));
  if (!ok) return null;
  const payload = JSON.parse(unb64u(body));
  if (payload.exp && Date.now() > payload.exp * 1000) return null;
  return payload;
}
function b64u(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); }
function unb64u(str) { return decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/")))); }
function b64bin(str) { return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); }
function unb64bin(str) { return atob(str.replace(/-/g, "+").replace(/_/g, "/")); }
