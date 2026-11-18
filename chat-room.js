/**
 * ChatRoom - Durable Object for real-time chat
 */
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const userId = parseInt(request.headers.get("X-User-Id"));

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.sessions.set(userId, server);

      server.accept();
      server.serializeAttachment({ userId });

      server.addEventListener("message", async (event) => {
        const data = JSON.parse(event.data);
        const matchId = request.headers.get("X-Match-Id");

        // Save message to D1
        await this.env.DB.prepare(
          "INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)"
        ).bind(matchId, userId, data.content).run();

        // Broadcast to all connected users
        const msg = JSON.stringify({
          type: "message",
          sender_id: userId,
          content: data.content,
          time: Date.now()
        });

        for (const [uid, session] of this.sessions) {
          try { session.send(msg); } catch (e) {}
        }
      });

      server.addEventListener("close", () => {
        this.sessions.delete(userId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // REST: get/send message
    if (request.method === "POST") {
      const { content } = await request.json();
      const matchId = request.headers.get("X-Match-Id");

      await this.env.DB.prepare(
        "INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)"
      ).bind(matchId, userId, content).run();

      // Broadcast
      for (const [uid, session] of this.sessions) {
        if (uid !== userId) {
          try {
            session.send(JSON.stringify({ type: "message", sender_id: userId, content, time: Date.now() }));
          } catch (e) {}
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Method not allowed", { status: 405 });
  }
}
