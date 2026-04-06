const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of rateLimitMap) {
    if (value.resetAt < now) rateLimitMap.delete(key);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function rateLimitByIp(
  ip: string,
  limit = 60,
  windowMs = 60 * 1000
): { success: boolean; remaining: number } {
  return rateLimit(`ip:${ip}`, limit, windowMs);
}

export function rateLimitByOrg(
  orgId: string,
  action: string,
  limit = 100,
  windowMs = 60 * 1000
): { success: boolean; remaining: number } {
  return rateLimit(`org:${orgId}:${action}`, limit, windowMs);
}
