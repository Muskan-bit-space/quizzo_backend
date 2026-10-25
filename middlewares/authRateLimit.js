// Bounded, process-local protection for account endpoints. Multi-instance
// deployments should also enforce a shared limit at their gateway.
function authRateLimit({ limit = 40, windowMs = 15 * 60 * 1000, maxClients = 10000, now = Date.now } = {}) {
  const clients = new Map();
  let nextCleanup = 0;
  return (req, res, next) => {
    if (req.method !== "POST") return next();
    const time = now();
    if (time >= nextCleanup) {
      for (const [key, value] of clients) if (value.resetAt <= time) clients.delete(key);
      nextCleanup = time + Math.min(windowMs, 60000);
    }
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let client = clients.get(key);
    if (!client || client.resetAt <= time) {
      if (!client && clients.size >= maxClients) {
        res.set("Retry-After", "60");
        return res.status(429).json({ error: "Account requests are busy. Please try again shortly." });
      }
      client = { count: 0, resetAt: time + windowMs };
      clients.set(key, client);
    }
    const seconds = Math.max(1, Math.ceil((client.resetAt - time) / 1000));
    res.set("RateLimit-Limit", String(limit));
    res.set("RateLimit-Remaining", String(Math.max(0, limit - client.count - 1)));
    res.set("RateLimit-Reset", String(seconds));
    if (client.count >= limit) {
      res.set("Retry-After", String(seconds));
      return res.status(429).json({ error: "Too many account attempts. Please try again later." });
    }
    client.count++;
    next();
  };
}
module.exports = { authRateLimit };
