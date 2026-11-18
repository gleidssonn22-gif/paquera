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

    if (["/.env","/.git","/wp-admin","/xmlrpc","/phpmyadmin","/backup","/.ssh","/.aws","/.docker"].some(p => url.pathname.startsWith(p)))
      return new Response("Not Found", { status: 404 });

    if (url.pathname.startsWith("/api/")) {
      const ua = (request.headers.get("User-Agent") || "").toLowerCase();
      if (["curl","wget","nikto","nmap","masscan","sqlmap"].some(b => ua.includes(b)))
        return new Response("Forbidden", { status: 403 });
    }

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
        if (action === "reset") return await handlePasswordReset(request, env);
        if (action === "reset-confirm") return await handlePasswordResetConfirm(request, env);
      }
      if (resource === "discover") return await handleDiscover(userId, env);
      if (resource === "swipe") return await handleSwipe(request, userId, env);
      if (resource === "superlike") return await handleSuperLike(request, userId, env);
      if (resource === "boost") return await handleBoost(request, userId, env);
      if (resource === "matches") {
        if (!action) return await handleListMatches(userId, env);
        if (action === "messages") return await handleGetMessages(request, userId, env);
      }
      if (resource === "chat") return await handleChat(request, userId, env);
      if (resource === "profile") {
        if (!action) return await handleGetProfile(userId, env);
        if (action === "update") return await handleUpdateProfile(request, userId, env);
        if (action === "views") return await handleProfileViews(userId, env);
        if (action === "photos") return await handlePhotos(request, userId, env);
      }
      if (resource === "coins") {
        if (!action) return await handleGetCoins(userId, env);
        if (action === "transactions") return await handleCoinTransactions(userId, env);
        if (action === "earn") return await handleEarnCoins(request, userId, env);
        if (action === "spend") return await handleSpendCoins(request, userId, env);
      }
      if (resource === "stories") {
        if (!action) return await handleListStories(userId, env);
        if (action === "create") return await handleCreateStory(request, userId, env);
        if (action === "view") return await handleViewStory(request, userId, env);
      }
      if (resource === "achievements") return await handleAchievements(userId, env);
      if (resource === "streak") return await handleStreak(userId, env);
      if (resource === "ranking") return await handleRanking(env);
      if (resource === "blocks") {
        if (!action) return await handleListBlocks(userId, env);
        if (action === "add") return await handleBlock(request, userId, env);
        if (action === "remove") return await handleUnblock(request, userId, env);
      }
      if (resource === "favorites") {
        if (!action) return await handleListFavorites(userId, env);
        if (action === "add") return await handleAddFavorite(request, userId, env);
        if (action === "remove") return await handleRemoveFavorite(request, userId, env);
      }
      if (resource === "gifts") {
        if (!action) return await handleListGifts(env);
        if (action === "send") return await handleSendGift(request, userId, env);
      }
      if (resource === "reactions") return await handleReaction(request, userId, env);
      if (resource === "quiz") {
        if (!action) return await handleGetQuiz(env);
        if (action === "submit") return await handleQuizSubmit(request, userId, env);
        if (action === "results") return await handleQuizResults(userId, env);
      }
      if (resource === "events") {
        if (!action) return await handleListEvents(env);
        if (action === "attend") return await handleAttendEvent(request, userId, env);
      }
      if (resource === "communities") {
        if (!action) return await handleListCommunities(env);
        if (action === "join") return await handleJoinCommunity(request, userId, env);
      }
      if (resource === "referrals") return await handleReferrals(userId, env);
      if (resource === "missions") return await handleMissions(userId, env);
      if (resource === "premium") {
        if (!action) return await handlePremiumStatus(userId, env);
        if (action === "subscribe") return await handleSubscribe(request, userId, env);
      }
      if (resource === "notifications") return await handleNotifications(userId, env);
      if (resource === "online") return await handleSetOnline(userId, env);
      if (resource === "push" && action === "subscribe") return await handlePushSubscribe(request, userId, env);
      if (resource === "voice") {
        if (!action) return await handleListVoiceMessages(request, userId, env);
        if (action === "send") return await handleSendVoice(request, userId, env);
      }
      if (resource === "disappearing") return await handleDisappearingMessage(request, userId, env);
      if (resource === "icebreakers") return await handleIceBreakers(request, userId, env);
      if (resource === "interests") {
        if (!action) return await handleListInterests(env);
        if (action === "set") return await handleSetInterests(request, userId, env);
      }
      if (resource === "settings") {
        if (!action) return await handleGetSettings(userId, env);
        if (action === "update") return await handleUpdateSettings(request, userId, env);
      }
      if (resource === "songs") {
        if (!action) return await handleListSongs(userId, env);
        if (action === "add") return await handleAddSong(request, userId, env);
      }
      if (resource === "friends") {
        if (!action) return await handleListFriends(userId, env);
        if (action === "add") return await handleAddFriend(request, userId, env);
        if (action === "remove") return await handleRemoveFriend(request, userId, env);
      }
      if (resource === "moments") {
        if (!action) return await handleListMoments(userId, env);
        if (action === "create") return await handleCreateMoment(request, userId, env);
        if (action === "like") return await handleLikeMoment(request, userId, env);
      }
      if (resource === "spin") return await handleDailySpin(userId, env);
      if (resource === "daily-question") {
        if (!action) return await handleGetDailyQuestion(env);
        if (action === "answer") return await handleAnswerDailyQuestion(request, userId, env);
      }
      if (resource === "lottery") {
        if (!action) return await handleLotteryInfo(env);
        if (action === "buy") return await handleBuyLotteryTicket(request, userId, env);
      }
      if (resource === "phone") {
        if (action === "verify") return await handlePhoneVerify(request, userId, env);
        if (action === "confirm") return await handlePhoneConfirm(request, userId, env);
      }
      if (resource === "emergency") {
        if (!action) return await handleListEmergency(userId, env);
        if (action === "add") return await handleAddEmergency(request, userId, env);
      }
      if (resource === "fake-report") return await handleFakeReport(request, userId, env);
      if (resource === "saved-searches") {
        if (!action) return await handleListSavedSearches(userId, env);
        if (action === "save") return await handleSaveSearch(request, userId, env);
      }
      if (resource === "share") return await handleSocialShare(request, userId, env);
      if (resource === "daily-summary") return await handleDailySummary(userId, env);
      if (resource === "shop") {
        if (!action) return await handleListShop(env);
        if (action === "buy") return await handleShopBuy(request, userId, env);
      }
      if (resource === "donations") {
        if (!action) return await handleListDonations(env);
        if (action === "donate") return await handleDonate(request, userId, env);
      }
      if (resource === "products") return await handleListProducts(env);
      if (resource === "blog") return await handleBlog(env);
      if (resource === "seo") return await handleSeoPages(env);
      if (resource === "waitlist" && action === "join") return await handleWaitlistJoin(request, env);
      if (resource === "ads") return await handleSponsoredAds(env);
      if (resource === "translations") return await handleTranslations(request, env);
      if (resource === "chat-backup") return await handleChatBackup(request, userId, env);
      if (resource === "data-request") return await handleDataRequest(request, userId, env);
      if (resource === "metrics") return await handlePlatformMetrics(env);
      if (resource === "supporter") return await handleSupporterPayment(request, userId, env);
      if (resource === "admin") {
        if (action === "users") return await handleAdminUsers(env);
        if (action === "actions") return await handleAdminActions(env);
      }
      if (resource === "business") return await handleBusinessSub(env);
      if (resource === "site-config") return await handleSiteConfig(env);
      if (resource === "search") return await handleSearch(request, env);
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
  await env.DB.prepare("INSERT INTO paqueracoins (user_id, balance) VALUES (?, 100)").bind(userId).run().catch(()=>{});
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
  const blocked = await env.DB.prepare("SELECT blocked_id FROM blocks WHERE user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  const excludeIds = [...swiped.results.map(s => s.target_id), ...blocked.results.map(b => b.blocked_id), userId];
  const placeholders = excludeIds.map(() => "?").join(",");
  const targetGender = user.looking_for === "both" ? "both" : user.gender;
  const query = "SELECT id, name, photo_url, photo_url_2, photo_url_3, bio, city, gender, birth_date, is_online, is_verified FROM users WHERE id NOT IN (" + placeholders + ") AND gender = CASE WHEN ? = 'both' THEN gender ELSE ? END AND looking_for IN (?, 'both') ORDER BY is_online DESC, created_at DESC LIMIT 20";
  const results = await env.DB.prepare(query).bind(...excludeIds, user.looking_for, targetGender, user.gender).all();
  const profiles = results.results.map(p => ({ ...p, age: p.birth_date ? calcAge(p.birth_date) : null, distance: 0 }));
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
      await env.DB.prepare("UPDATE paqueracoins SET balance = balance + 10 WHERE user_id = ?").bind(userId).run().catch(()=>{});
    }
  }
  return json({ matched }, 200);
}

async function handleSuperLike(request, userId, env) {
  const body = await request.json();
  if (!body.target_id) return json({ error: "target_id obrigatório" }, 400);
  const credits = await env.DB.prepare("SELECT * FROM super_like_credits WHERE user_id = ?").bind(userId).first().catch(()=>null);
  const used = credits?.daily_used || 0;
  const limit = credits?.daily_limit || 1;
  if (used >= limit) return json({ error: "Sem super likes disponíveis hoje" }, 429);
  await env.DB.prepare("INSERT OR REPLACE INTO super_like_credits (user_id, daily_used, daily_limit) VALUES (?, ?, ?)").bind(userId, used + 1, limit).run().catch(()=>{});
  await env.DB.prepare("INSERT OR IGNORE INTO super_likes (user_id, target_id) VALUES (?, ?)").bind(userId, body.target_id).run().catch(()=>{});
  await env.DB.prepare("INSERT OR IGNORE INTO swipes (user_id, target_id, action) VALUES (?, ?, 'like')").bind(userId, body.target_id).run();
  const reciprocal = await env.DB.prepare("SELECT * FROM swipes WHERE user_id = ? AND target_id = ? AND action = 'like'").bind(body.target_id, userId).first();
  let matched = false;
  if (reciprocal) {
    const u1 = Math.min(userId, body.target_id);
    const u2 = Math.max(userId, body.target_id);
    await env.DB.prepare("INSERT OR IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)").bind(u1, u2).run();
    matched = true;
  }
  return json({ matched, super_liked: true }, 200);
}

async function handleBoost(request, userId, env) {
  const credits = await env.DB.prepare("SELECT * FROM boost_credits WHERE user_id = ?").bind(userId).first().catch(()=>null);
  const used = credits?.used || 0;
  const total = credits?.total || 0;
  if (used >= total) return json({ error: "Sem boosts disponíveis" }, 429);
  await env.DB.prepare("INSERT OR REPLACE INTO boost_credits (user_id, used, total) VALUES (?, ?, ?)").bind(userId, used + 1, total).run().catch(()=>{});
  await env.DB.prepare("INSERT INTO boosts (user_id, expires_at) VALUES (?, ?)").bind(userId, Math.floor(Date.now() / 1000) + 1800).run().catch(()=>{});
  return json({ success: true, message: "Boost ativado por 30 minutos!" }, 200);
}

async function handleGetCoins(userId, env) {
  const coins = await env.DB.prepare("SELECT balance FROM paqueracoins WHERE user_id = ?").bind(userId).first().catch(()=>null);
  return json({ balance: coins?.balance || 0 }, 200);
}

async function handleCoinTransactions(userId, env) {
  const tx = await env.DB.prepare("SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(userId).all().catch(()=>({results:[]}));
  return json({ transactions: tx.results }, 200);
}

async function handleEarnCoins(request, userId, env) {
  const body = await request.json();
  const amount = body.amount || 5;
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance + ? WHERE user_id = ?").bind(amount, userId).run().catch(()=>{});
  await env.DB.prepare("INSERT INTO coin_transactions (user_id, amount, type, reason) VALUES (?, ?, 'earn', ?)").bind(userId, amount, body.reason || "daily").run().catch(()=>{});
  return json({ success: true, earned: amount }, 200);
}

async function handleSpendCoins(request, userId, env) {
  const body = await request.json();
  const amount = body.amount || 10;
  const coins = await env.DB.prepare("SELECT balance FROM paqueracoins WHERE user_id = ?").bind(userId).first().catch(()=>null);
  if ((coins?.balance || 0) < amount) return json({ error: "Saldo insuficiente" }, 400);
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance - ? WHERE user_id = ?").bind(amount, userId).run().catch(()=>{});
  await env.DB.prepare("INSERT INTO coin_transactions (user_id, amount, type, reason) VALUES (?, ?, 'spend', ?)").bind(userId, amount, body.reason || "purchase").run().catch(()=>{});
  return json({ success: true, spent: amount }, 200);
}

async function handleListStories(userId, env) {
  const stories = await env.DB.prepare("SELECT s.*, u.name, u.photo_url FROM stories s JOIN users u ON s.user_id = u.id WHERE s.expires_at > ? ORDER BY s.created_at DESC LIMIT 50").bind(Math.floor(Date.now() / 1000)).all().catch(()=>({results:[]}));
  return json({ stories: stories.results }, 200);
}

async function handleCreateStory(request, userId, env) {
  const body = await request.json();
  const expires = Math.floor(Date.now() / 1000) + 86400;
  await env.DB.prepare("INSERT INTO stories (user_id, content, type, expires_at) VALUES (?, ?, ?, ?)").bind(userId, body.content || "", body.type || "text", expires).run().catch(()=>{});
  return json({ success: true, message: "Story criado!" }, 200);
}

async function handleViewStory(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)").bind(body.story_id, userId).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleAchievements(userId, env) {
  const earned = await env.DB.prepare("SELECT a.* FROM user_badges ub JOIN achievement_templates a ON ub.achievement_id = a.id WHERE ub.user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  const all = await env.DB.prepare("SELECT * FROM achievement_templates").all().catch(()=>({results:[]}));
  return json({ earned: earned.results, available: all.results }, 200);
}

async function handleStreak(userId, env) {
  const today = new Date().toISOString().split("T")[0];
  const streak = await env.DB.prepare("SELECT * FROM streak_log WHERE user_id = ? ORDER BY date DESC LIMIT 1").bind(userId).first().catch(()=>null);
  let currentStreak = 0;
  if (streak) {
    const diff = Math.floor((new Date(today) - new Date(streak.date)) / 86400000);
    if (diff === 0) currentStreak = streak.streak_count;
    else if (diff === 1) {
      currentStreak = streak.streak_count + 1;
      await env.DB.prepare("INSERT INTO streak_log (user_id, date, streak_count) VALUES (?, ?, ?)").bind(userId, today, currentStreak).run().catch(()=>{});
      await env.DB.prepare("UPDATE paqueracoins SET balance = balance + ? WHERE user_id = ?").bind(currentStreak * 5, userId).run().catch(()=>{});
    } else {
      currentStreak = 1;
      await env.DB.prepare("INSERT INTO streak_log (user_id, date, streak_count) VALUES (?, ?, ?)").bind(userId, today, 1).run().catch(()=>{});
    }
  } else {
    currentStreak = 1;
    await env.DB.prepare("INSERT INTO streak_log (user_id, date, streak_count) VALUES (?, ?, ?)").bind(userId, today, 1).run().catch(()=>{});
  }
  return json({ streak: currentStreak, reward: currentStreak * 5 }, 200);
}

async function handleRanking(env) {
  const ranking = await env.DB.prepare("SELECT u.id, u.name, u.photo_url, COUNT(s.id) as likes FROM users u LEFT JOIN swipes s ON u.id = s.target_id AND s.action = 'like' GROUP BY u.id ORDER BY likes DESC LIMIT 50").all();
  return json({ ranking: ranking.results }, 200);
}

async function handleListBlocks(userId, env) {
  const blocks = await env.DB.prepare("SELECT b.*, u.name, u.photo_url FROM blocks b JOIN users u ON b.blocked_id = u.id WHERE b.user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ blocks: blocks.results }, 200);
}

async function handleBlock(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO blocks (user_id, blocked_id) VALUES (?, ?)").bind(userId, body.target_id).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleUnblock(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?").bind(userId, body.target_id).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleListFavorites(userId, env) {
  const favs = await env.DB.prepare("SELECT f.*, u.name, u.photo_url FROM favorites f JOIN users u ON f.target_id = u.id WHERE f.user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ favorites: favs.results }, 200);
}

async function handleAddFavorite(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO favorites (user_id, target_id) VALUES (?, ?)").bind(userId, body.target_id).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleRemoveFavorite(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND target_id = ?").bind(userId, body.target_id).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleListGifts(env) {
  const gifts = await env.DB.prepare("SELECT * FROM gift_catalog WHERE active = 1").all().catch(()=>({results:[]}));
  return json({ gifts: gifts.results }, 200);
}

async function handleSendGift(request, userId, env) {
  const body = await request.json();
  const gift = await env.DB.prepare("SELECT * FROM gift_catalog WHERE id = ?").bind(body.gift_id).first();
  if (!gift) return json({ error: "Presente não encontrado" }, 404);
  const coins = await env.DB.prepare("SELECT balance FROM paqueracoins WHERE user_id = ?").bind(userId).first().catch(()=>null);
  if ((coins?.balance || 0) < gift.price) return json({ error: "PaqueraCoins insuficientes" }, 400);
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance - ? WHERE user_id = ?").bind(gift.price, userId).run().catch(()=>{});
  await env.DB.prepare("INSERT INTO user_gifts (user_id, from_user_id, gift_id) VALUES (?, ?, ?)").bind(body.target_id, userId, body.gift_id).run().catch(()=>{});
  return json({ success: true, message: "Presente enviado! 🎁" }, 200);
}

async function handleReaction(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR REPLACE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)").bind(body.message_id, userId, body.emoji).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleGetQuiz(env) {
  const questions = await env.DB.prepare("SELECT * FROM quiz_questions LIMIT 10").all().catch(()=>({results:[]}));
  return json({ questions: questions.results }, 200);
}

async function handleQuizSubmit(request, userId, env) {
  const body = await request.json();
  for (const answer of body.answers) {
    await env.DB.prepare("INSERT INTO quiz_answers (user_id, question_id, answer) VALUES (?, ?, ?)").bind(userId, answer.question_id, answer.answer).run().catch(()=>{});
  }
  return json({ success: true, message: "Quiz concluído! +50 PaqueraCoins" }, 200);
}

async function handleQuizResults(userId, env) {
  const answers = await env.DB.prepare("SELECT * FROM quiz_answers WHERE user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ answers: answers.results }, 200);
}

async function handleListEvents(env) {
  const events = await env.DB.prepare("SELECT * FROM events WHERE date > ? ORDER BY date ASC LIMIT 20").bind(Math.floor(Date.now() / 1000)).all().catch(()=>({results:[]}));
  return json({ events: events.results }, 200);
}

async function handleAttendEvent(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO event_attendees (event_id, user_id) VALUES (?, ?)").bind(body.event_id, userId).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleListCommunities(env) {
  const communities = await env.DB.prepare("SELECT c.*, COUNT(cm.user_id) as members FROM communities c LEFT JOIN community_members cm ON c.id = cm.community_id GROUP BY c.id LIMIT 50").all().catch(()=>({results:[]}));
  return json({ communities: communities.results }, 200);
}

async function handleJoinCommunity(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO community_members (community_id, user_id) VALUES (?, ?)").bind(body.community_id, userId).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleReferrals(userId, env) {
  const refs = await env.DB.prepare("SELECT * FROM referrals WHERE referrer_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ referrals: refs.results }, 200);
}

async function handleMissions(userId, env) {
  const missions = await env.DB.prepare("SELECT m.*, CASE WHEN um.user_id IS NOT NULL THEN 1 ELSE 0 END as completed FROM missions m LEFT JOIN user_missions um ON m.id = um.mission_id AND um.user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ missions: missions.results }, 200);
}

async function handlePremiumStatus(userId, env) {
  const user = await env.DB.prepare("SELECT is_premium FROM users WHERE id = ?").bind(userId).first();
  return json({ is_premium: user?.is_premium || 0 }, 200);
}

async function handleSubscribe(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("UPDATE users SET is_premium = 1 WHERE id = ?").bind(userId).run().catch(()=>{});
  return json({ success: true, message: "Premium ativado! ⭐" }, 200);
}

async function handleNotifications(userId, env) {
  const notifs = await env.DB.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(userId).all().catch(()=>({results:[]}));
  return json({ notifications: notifs.results }, 200);
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
  const body = await request.json();
  const allowed = ["name","bio","photo_url","photo_url_2","photo_url_3","city","lat","lng","interests","looking_for","age_min","age_max","max_distance_km","birth_date","gender"];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (body[key] !== undefined) { updates.push(key + " = ?"); values.push(body[key]); }
  }
  updates.push("updated_at = strftime('%s','now')");
  values.push(userId);
  await env.DB.prepare("UPDATE users SET " + updates.join(", ") + " WHERE id = ?").bind(...values).run();
  return json({ success: true }, 200);
}

async function handleProfileViews(userId, env) {
  const views = await env.DB.prepare("SELECT v.*, u.name, u.photo_url FROM profile_views v JOIN users u ON v.viewer_id = u.id WHERE v.user_id = ? ORDER BY v.created_at DESC LIMIT 50").bind(userId).all().catch(()=>({results:[]}));
  return json({ views: views.results }, 200);
}

async function handlePhotos(request, userId, env) {
  if (request.method === "GET") {
    const photos = await env.DB.prepare("SELECT * FROM user_photos WHERE user_id = ? ORDER BY position ASC").bind(userId).all().catch(()=>({results:[]}));
    return json({ photos: photos.results }, 200);
  }
  if (request.method === "POST") {
    const body = await request.json();
    await env.DB.prepare("INSERT INTO user_photos (user_id, url, position) VALUES (?, ?, ?)").bind(userId, body.url, body.position || 0).run().catch(()=>{});
    return json({ success: true }, 200);
  }
  return json({ error: "Método não permitido" }, 405);
}

async function handleChat(request, userId, env) {
  const matchId = new URL(request.url).searchParams.get("match_id");
  if (!matchId) return json({ error: "match_id obrigatório" }, 400);
  const match = await env.DB.prepare("SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)").bind(matchId, userId, userId).first();
  if (!match) return json({ error: "Match não encontrado" }, 404);
  const doId = env.CHAT_ROOM.idFromName(matchId);
  const stub = env.CHAT_ROOM.get(doId);
  const newReq = new Request(request, { headers: { ...Object.fromEntries(request.headers), "X-User-Id": userId.toString(), "X-Match-Id": matchId } });
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

async function handleListVoiceMessages(request, userId, env) {
  const matchId = new URL(request.url).searchParams.get("match_id");
  const msgs = await env.DB.prepare("SELECT * FROM voice_messages WHERE match_id = ? ORDER BY created_at ASC").bind(matchId).all().catch(()=>({results:[]}));
  return json({ messages: msgs.results }, 200);
}

async function handleSendVoice(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO voice_messages (match_id, sender_id, url, duration) VALUES (?, ?, ?, ?)").bind(body.match_id, userId, body.url, body.duration || 0).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleDisappearingMessage(request, userId, env) {
  const body = await request.json();
  const expires = Math.floor(Date.now() / 1000) + (body.ttl || 3600);
  await env.DB.prepare("INSERT INTO disappearing_messages (match_id, sender_id, content, expires_at) VALUES (?, ?, ?, ?)").bind(body.match_id, userId, body.content, expires).run().catch(()=>{});
  return json({ success: true, expires_at: expires }, 200);
}

async function handleIceBreakers(request, userId, env) {
  const starters = await env.DB.prepare("SELECT * FROM conversation_starters ORDER BY RANDOM() LIMIT 5").all().catch(()=>({results:[]}));
  return json({ starters: starters.results }, 200);
}

async function handleListInterests(env) {
  const interests = await env.DB.prepare("SELECT * FROM interests ORDER BY name ASC").all().catch(()=>({results:[]}));
  return json({ interests: interests.results }, 200);
}

async function handleSetInterests(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("DELETE FROM user_interests WHERE user_id = ?").bind(userId).run().catch(()=>{});
  for (const id of (body.interest_ids || [])) {
    await env.DB.prepare("INSERT INTO user_interests (user_id, interest_id) VALUES (?, ?)").bind(userId, id).run().catch(()=>{});
  }
  return json({ success: true }, 200);
}

async function handleGetSettings(userId, env) {
  const settings = await env.DB.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(userId).first().catch(()=>null);
  return json({ settings: settings || {} }, 200);
}

async function handleUpdateSettings(request, userId, env) {
  const body = await request.json();
  for (const key of Object.keys(body)) {
    await env.DB.prepare("INSERT OR REPLACE INTO user_settings (user_id, " + key + ") VALUES (?, ?)").bind(userId, body[key]).run().catch(()=>{});
  }
  return json({ success: true }, 200);
}

async function handleListSongs(userId, env) {
  const songs = await env.DB.prepare("SELECT * FROM user_songs WHERE user_id = ? ORDER BY position ASC").bind(userId).all().catch(()=>({results:[]}));
  return json({ songs: songs.results }, 200);
}

async function handleAddSong(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO user_songs (user_id, title, artist, url, position) VALUES (?, ?, ?, ?, ?)").bind(userId, body.title, body.artist, body.url, body.position || 0).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleListFriends(userId, env) {
  const friends = await env.DB.prepare("SELECT f.*, u.name, u.photo_url FROM user_friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ friends: friends.results }, 200);
}

async function handleAddFriend(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").bind(userId, body.friend_id).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleRemoveFriend(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("DELETE FROM user_friends WHERE user_id = ? AND friend_id = ?").bind(userId, body.friend_id).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleListMoments(userId, env) {
  const moments = await env.DB.prepare("SELECT m.*, u.name, u.photo_url FROM moments m JOIN users u ON m.user_id = u.id WHERE m.expires_at > ? ORDER BY m.created_at DESC LIMIT 50").bind(Math.floor(Date.now()/1000)).all().catch(()=>({results:[]}));
  return json({ moments: moments.results }, 200);
}

async function handleCreateMoment(request, userId, env) {
  const body = await request.json();
  const expires = Math.floor(Date.now()/1000) + 86400;
  await env.DB.prepare("INSERT INTO moments (user_id, content, type, expires_at) VALUES (?, ?, ?, ?)").bind(userId, body.content, body.type || "text", expires).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleLikeMoment(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT OR IGNORE INTO moment_likes (moment_id, user_id) VALUES (?, ?)").bind(body.moment_id, userId).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleDailySpin(userId, env) {
  const today = new Date().toISOString().split("T")[0];
  const existing = await env.DB.prepare("SELECT * FROM daily_spins WHERE user_id = ? AND date = ?").bind(userId, today).first().catch(()=>null);
  if (existing) return json({ error: "Você já girou a roleta hoje!" }, 429);
  const prize = Math.floor(Math.random() * 50) + 5;
  await env.DB.prepare("INSERT INTO daily_spins (user_id, date, prize) VALUES (?, ?, ?)").bind(userId, today, prize).run().catch(()=>{});
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance + ? WHERE user_id = ?").bind(prize, userId).run().catch(()=>{});
  return json({ prize, message: "Você ganhou " + prize + " PaqueraCoins! 🎉" }, 200);
}

async function handleGetDailyQuestion(env) {
  const q = await env.DB.prepare("SELECT * FROM daily_questions ORDER BY date DESC LIMIT 1").first().catch(()=>null);
  return json({ question: q }, 200);
}

async function handleAnswerDailyQuestion(request, userId, env) {
  const body = await request.json();
  const today = new Date().toISOString().split("T")[0];
  await env.DB.prepare("INSERT OR REPLACE INTO daily_answers (user_id, question_id, answer, date) VALUES (?, ?, ?, ?)").bind(userId, body.question_id, body.answer, today).run().catch(()=>{});
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance + 5 WHERE user_id = ?").bind(userId).run().catch(()=>{});
  return json({ success: true, reward: 5 }, 200);
}

async function handleLotteryInfo(env) {
  const prizes = await env.DB.prepare("SELECT * FROM lottery_prizes ORDER BY amount DESC").all().catch(()=>({results:[]}));
  return json({ prizes: prizes.results }, 200);
}

async function handleBuyLotteryTicket(request, userId, env) {
  const coins = await env.DB.prepare("SELECT balance FROM paqueracoins WHERE user_id = ?").bind(userId).first().catch(()=>null);
  if ((coins?.balance || 0) < 10) return json({ error: "Precisa de 10 coins" }, 400);
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance - 10 WHERE user_id = ?").bind(userId).run().catch(()=>{});
  const won = Math.random() < 0.3;
  const prize = won ? Math.floor(Math.random() * 100) + 20 : 0;
  await env.DB.prepare("INSERT INTO lottery_tickets (user_id, won, prize) VALUES (?, ?, ?)").bind(userId, won ? 1 : 0, prize).run().catch(()=>{});
  if (prize > 0) await env.DB.prepare("UPDATE paqueracoins SET balance = balance + ? WHERE user_id = ?").bind(prize, userId).run().catch(()=>{});
  return json({ won, prize, message: won ? "Você ganhou " + prize + " coins! 🎰" : "Não foi dessa vez!" }, 200);
}

async function handlePasswordReset(request, env) {
  const body = await request.json();
  const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first();
  if (!user) return json({ error: "Email não encontrado" }, 404);
  const token = btoa(Math.random().toString()).slice(0, 32);
  await env.DB.prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)").bind(user.id, token, Math.floor(Date.now()/1000) + 3600).run().catch(()=>{});
  return json({ success: true, message: "Email de recuperação enviado!", token }, 200);
}

async function handlePasswordResetConfirm(request, env) {
  const body = await request.json();
  const reset = await env.DB.prepare("SELECT * FROM password_resets WHERE token = ? AND expires_at > ?").bind(body.token, Math.floor(Date.now()/1000)).first();
  if (!reset) return json({ error: "Token inválido ou expirado" }, 400);
  const hash = await hashPassword(body.password, env);
  await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, reset.user_id).run();
  await env.DB.prepare("DELETE FROM password_resets WHERE token = ?").bind(body.token).run();
  return json({ success: true, message: "Senha alterada!" }, 200);
}

async function handlePhoneVerify(request, userId, env) {
  const body = await request.json();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await env.DB.prepare("INSERT OR REPLACE INTO phone_verifications (user_id, phone, code, verified) VALUES (?, ?, ?, 0)").bind(userId, body.phone, code).run().catch(()=>{});
  return json({ success: true, message: "Código enviado: " + code }, 200);
}

async function handlePhoneConfirm(request, userId, env) {
  const body = await request.json();
  const ver = await env.DB.prepare("SELECT * FROM phone_verifications WHERE user_id = ? AND code = ?").bind(userId, body.code).first();
  if (!ver) return json({ error: "Código inválido" }, 400);
  await env.DB.prepare("UPDATE phone_verifications SET verified = 1 WHERE user_id = ?").bind(userId).run().catch(()=>{});
  await env.DB.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").bind(userId).run().catch(()=>{});
  return json({ success: true, message: "Telefone verificado! ✅" }, 200);
}

async function handleListEmergency(userId, env) {
  const contacts = await env.DB.prepare("SELECT * FROM emergency_contacts WHERE user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ contacts: contacts.results }, 200);
}

async function handleAddEmergency(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO emergency_contacts (user_id, name, phone, relationship) VALUES (?, ?, ?, ?)").bind(userId, body.name, body.phone, body.relationship || "").run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleFakeReport(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO fake_reports (reporter_id, reported_id, reason, evidence) VALUES (?, ?, ?, ?)").bind(userId, body.reported_id, body.reason || "", body.evidence || "").run().catch(()=>{});
  return json({ success: true, message: "Denúncia enviada." }, 200);
}

async function handleListSavedSearches(userId, env) {
  const searches = await env.DB.prepare("SELECT * FROM saved_searches WHERE user_id = ?").bind(userId).all().catch(()=>({results:[]}));
  return json({ searches: searches.results }, 200);
}

async function handleSaveSearch(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO saved_searches (user_id, name, filters) VALUES (?, ?, ?)").bind(userId, body.name, JSON.stringify(body.filters)).run().catch(()=>{});
  return json({ success: true }, 200);
}

async function handleSocialShare(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO social_shares (user_id, platform, content) VALUES (?, ?, ?)").bind(userId, body.platform, body.content || "").run().catch(()=>{});
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance + 2 WHERE user_id = ?").bind(userId).run().catch(()=>{});
  return json({ success: true, reward: 2 }, 200);
}

async function handleDailySummary(userId, env) {
  const today = new Date().toISOString().split("T")[0];
  const swipes = await env.DB.prepare("SELECT COUNT(*) as c FROM swipes WHERE user_id = ? AND date(created_at) = ?").bind(userId, today).first().catch(()=>({c:0}));
  const matches = await env.DB.prepare("SELECT COUNT(*) as c FROM matches WHERE (user1_id = ? OR user2_id = ?) AND date(created_at) = ?").bind(userId, userId, today).first().catch(()=>({c:0}));
  const messages = await env.DB.prepare("SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND date(created_at) = ?").bind(userId, today).first().catch(()=>({c:0}));
  return json({ swipes: swipes.c, matches: matches.c, messages: messages.c }, 200);
}

async function handleListShop(env) {
  const items = await env.DB.prepare("SELECT * FROM shop_items WHERE active = 1 ORDER BY price ASC").all().catch(()=>({results:[]}));
  return json({ items: items.results }, 200);
}

async function handleShopBuy(request, userId, env) {
  const body = await request.json();
  const item = await env.DB.prepare("SELECT * FROM shop_items WHERE id = ?").bind(body.item_id).first();
  if (!item) return json({ error: "Item não encontrado" }, 404);
  const coins = await env.DB.prepare("SELECT balance FROM paqueracoins WHERE user_id = ?").bind(userId).first().catch(()=>null);
  if ((coins?.balance || 0) < item.price) return json({ error: "Coins insuficientes" }, 400);
  await env.DB.prepare("UPDATE paqueracoins SET balance = balance - ? WHERE user_id = ?").bind(item.price, userId).run().catch(()=>{});
  await env.DB.prepare("INSERT INTO shop_purchases (user_id, item_id, price) VALUES (?, ?, ?)").bind(userId, body.item_id, item.price).run().catch(()=>{});
  return json({ success: true, message: "Compra realizada! 🛍️" }, 200);
}

async function handleListDonations(env) {
  const tiers = await env.DB.prepare("SELECT * FROM donation_tiers ORDER BY amount ASC").all().catch(()=>({results:[]}));
  return json({ tiers: tiers.results }, 200);
}

async function handleDonate(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO donations (user_id, amount, message) VALUES (?, ?, ?)").bind(userId, body.amount, body.message || "").run().catch(()=>{});
  return json({ success: true, message: "Obrigado pela doação! 💝" }, 200);
}

async function handleListProducts(env) {
  const products = await env.DB.prepare("SELECT * FROM digital_products WHERE active = 1").all().catch(()=>({results:[]}));
  return json({ products: products.results }, 200);
}

async function handleBlog(env) {
  const posts = await env.DB.prepare("SELECT * FROM blog_posts ORDER BY created_at DESC LIMIT 20").all().catch(()=>({results:[]}));
  return json({ posts: posts.results }, 200);
}

async function handleSeoPages(env) {
  const pages = await env.DB.prepare("SELECT * FROM seo_pages ORDER BY title ASC").all().catch(()=>({results:[]}));
  return json({ pages: pages.results }, 200);
}

async function handleWaitlistJoin(request, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO waitlist (email, name) VALUES (?, ?)").bind(body.email, body.name || "").run().catch(()=>{});
  return json({ success: true, message: "Você entrou na lista! 🎉" }, 200);
}

async function handleSponsoredAds(env) {
  const ads = await env.DB.prepare("SELECT * FROM sponsored_ads WHERE active = 1 ORDER BY priority DESC LIMIT 5").all().catch(()=>({results:[]}));
  return json({ ads: ads.results }, 200);
}

async function handleTranslations(request, env) {
  const lang = new URL(request.url).searchParams.get("lang") || "pt-BR";
  const translations = await env.DB.prepare("SELECT key, value FROM translations WHERE lang = ?").bind(lang).all().catch(()=>({results:[]}));
  const map = {};
  for (const t of translations.results) map[t.key] = t.value;
  return json({ lang, translations: map }, 200);
}

async function handleChatBackup(request, userId, env) {
  const matchId = new URL(request.url).searchParams.get("match_id");
  const messages = await env.DB.prepare("SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC").bind(matchId).all().catch(()=>({results:[]}));
  await env.DB.prepare("INSERT INTO chat_backups (user_id, match_id, data) VALUES (?, ?, ?)").bind(userId, matchId, JSON.stringify(messages.results)).run().catch(()=>{});
  return json({ success: true, count: messages.results.length }, 200);
}

async function handleDataRequest(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO data_requests (user_id, type, status) VALUES (?, ?, 'pending')").bind(userId, body.type || "export").run().catch(()=>{});
  return json({ success: true, message: "Solicitação registrada." }, 200);
}

async function handlePlatformMetrics(env) {
  const users = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first().catch(()=>({c:0}));
  const matches = await env.DB.prepare("SELECT COUNT(*) as c FROM matches").first().catch(()=>({c:0}));
  const messages = await env.DB.prepare("SELECT COUNT(*) as c FROM messages").first().catch(()=>({c:0}));
  const swipes = await env.DB.prepare("SELECT COUNT(*) as c FROM swipes").first().catch(()=>({c:0}));
  return json({ users: users.c, matches: matches.c, messages: messages.c, swipes: swipes.c }, 200);
}

async function handleSupporterPayment(request, userId, env) {
  const body = await request.json();
  await env.DB.prepare("INSERT INTO supporter_payments (user_id, amount, method) VALUES (?, ?, ?)").bind(userId, body.amount, body.method || "pix").run().catch(()=>{});
  return json({ success: true, message: "Obrigado por apoiar o Paquera! 💝" }, 200);
}

async function handleAdminUsers(env) {
  const users = await env.DB.prepare("SELECT id, name, email, created_at, is_premium, is_verified, is_online FROM users ORDER BY created_at DESC LIMIT 100").all().catch(()=>({results:[]}));
  return json({ users: users.results }, 200);
}

async function handleAdminActions(env) {
  const actions = await env.DB.prepare("SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 50").all().catch(()=>({results:[]}));
  return json({ actions: actions.results }, 200);
}

async function handleBusinessSub(env) {
  const subs = await env.DB.prepare("SELECT * FROM business_subscriptions WHERE active = 1").all().catch(()=>({results:[]}));
  return json({ subscriptions: subs.results }, 200);
}

async function handleSiteConfig(env) {
  const config = await env.DB.prepare("SELECT * FROM site_config").all().catch(()=>({results:[]}));
  const settings = await env.DB.prepare("SELECT * FROM site_settings").all().catch(()=>({results:[]}));
  const map = {};
  for (const c of config.results) map[c.key] = c.value;
  for (const s of settings.results) map[s.key] = s.value;
  return json({ config: map }, 200);
}

async function handleSearch(request, env) {
  const q = new URL(request.url).searchParams.get("q") || "";
  if (!q) return json({ results: [] }, 200);
  try {
    const results = await env.DB.prepare("SELECT id, name, photo_url, city, bio FROM users WHERE name LIKE ? OR bio LIKE ? OR city LIKE ? LIMIT 20").bind("%" + q + "%", "%" + q + "%", "%" + q + "%").all();
    return json({ results: results.results }, 200);
  } catch {
    return json({ results: [] }, 200);
  }
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
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    const data = parts[0] + "." + parts[1];
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    return payload.id;
  } catch { return null; }
}
