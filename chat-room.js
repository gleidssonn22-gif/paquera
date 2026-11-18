export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return this.handleHttp(request);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    await this.handleSession(server, request);
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleHttp(request) {
    const method = request.method;
    const userId = request.headers.get("X-User-Id");
    const matchId = request.headers.get("X-Match-Id");

    if (method === "POST") {
      const { content } = await request.json();
      await this.env.DB.prepare("INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)").bind(matchId, parseInt(userId), content).run();
      const msg = { type: "message", sender_id: parseInt(userId), content, created_at: Math.floor(Date.now() / 1000) };
      this.broadcast(JSON.stringify(msg));
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (method === "GET") {
      const messages = await this.env.DB.prepare("SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT 100").bind(matchId).all();
      return new Response(JSON.stringify({ messages: messages.results }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405 });
  }

  async handleSession(ws, request) {
    ws.accept();
    const userId = request.headers.get("X-User-Id");
    this.sessions.set(ws, userId);

    ws.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          const matchId = request.headers.get("X-Match-Id");
          await this.env.DB.prepare("INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)").bind(matchId, parseInt(userId), data.content).run();
          this.broadcast(JSON.stringify({ type: "message", sender_id: parseInt(userId), content: data.content, created_at: Math.floor(Date.now() / 1000) }));
        }
      } catch (e) {}
    });

    ws.addEventListener("close", () => {
      this.sessions.delete(ws);
    });
  }

  broadcast(message) {
    for (const ws of this.sessions.keys()) {
      try { ws.send(message); } catch (e) {}
    }
  }
}
