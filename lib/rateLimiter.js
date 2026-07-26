// Minimal in-memory rate limiter. Good enough for a single-instance
// deployment; if this ever runs across multiple server instances (load
// balanced), swap this for a shared store (Redis) since each instance
// would otherwise track its own separate counts.
function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> array of timestamps

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);
    timestamps.push(now);
    hits.set(ip, timestamps);

    if (timestamps.length > max) {
      return res.status(429).json({ error: 'Too many requests - please slow down and try again shortly.' });
    }
    next();
  };
}

module.exports = { createRateLimiter };
