const path = require("path");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(3000, () => {
  console.log("HTTP server running on http://localhost:3000");
});

// ---- WebSocket server ----
const wss = new WebSocketServer({ server });
const HISTORY_LIMIT = 200;
const history = []; // {id, from, text, ts}

function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });
}

wss.on("connection", (ws) => {
  // Send history to the newly connected client
  ws.send(JSON.stringify({ type: "history", messages: history }));

  ws.on("message", (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === "message" && parsed.text && parsed.from) {
        const entry = {
          id: cryptoRandomId(),
          from: String(parsed.from).slice(0, 32),
          text: String(parsed.text).slice(0, 2000),
          ts: Date.now()
        };
        history.push(entry);
        if (history.length > HISTORY_LIMIT) history.shift();
        broadcast({ type: "message", message: entry });
      }
    } catch (e) {
      // ignore malformed payloads
    }
  });
});

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
