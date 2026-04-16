const express = require("express");

let serverStarted = false;

function startTopggWebhookServer(client) {
  if (serverStarted) return;
  serverStarted = true;

  const app = express();
  app.use(express.json());

  app.get("/", (_, res) => {
    res.status(200).send("onepiece-bot ok");
  });

  app.get("/health", (_, res) => {
    res.status(200).json({
      ok: true,
      bot: client?.user?.tag || null,
    });
  });

  app.post("/topgg", (req, res) => {
    try {
      console.log("[TOPGG] Vote payload received:", req.body || {});
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[TOPGG] Webhook error:", error);
      return res.status(500).json({ ok: false });
    }
  });

  const port = Number(process.env.PORT || process.env.WEBHOOK_PORT || 3000);
  const host = "0.0.0.0";

  app.listen(port, host, () => {
    console.log(`[WEB] Listening on ${host}:${port}`);
  });
}

module.exports = {
  startTopggWebhookServer,
};