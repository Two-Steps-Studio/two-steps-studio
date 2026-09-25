import { NextResponse } from "next/server";
import { apiRateLimitExceeded } from "@/lib/api-response";

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  live: { requests: 100, windowMs: 60000 },    // Same as default
  test: { requests: 200, windowMs: 60000 },    // Higher limit for test keys
  admin: { requests: 5, windowMs: 60000 },     // Admin console login/exec: tight, brute-force-resistant
  register: { requests: 5, windowMs: 600000 }, // 5 signups per 10 min per IP: each one sends a real Resend email
  newsletter: { requests: 10, windowMs: 600000 }, // unsubscribe takes only an email, no token yet - see newsletter/route.ts
};

// ============================================
// RATE LIMIT STORE
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (for production, consider Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  keyType: keyof typeof RATE_LIMITS = 'live'
): { allowed: boolean; retryAfter?: number } {
  // Clean up expired entries periodically
  if (Math.random() < 0.1) {
    cleanupExpiredEntries();
  }

  const config = RATE_LIMITS[keyType] || RATE_LIMITS.default;
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists or window has expired, create new entry
  if (!entry || now >= entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true };
  }

  // If limit exceeded, deny request
  if (entry.count >= config.requests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);
  return { allowed: true };
}

/**
 * Rate limit middleware for API routes
 * Uses API key ID as the identifier
 */
export async function rateLimitByApiKey(
  apiKeyId: number,
  keyType: 'live' | 'test' = 'live'
): Promise<NextResponse | null> {
  const identifier = `api_key:${apiKeyId}`;
  const result = checkRateLimit(identifier, keyType);

  if (!result.allowed) {
    return apiRateLimitExceeded(result.retryAfter || 60);
  }

  return null;
}

/**
 * Rate limit middleware by IP address
 * Fallback for requests without API keys
 */
export async function rateLimitByIp(ip: string): Promise<NextResponse | null> {
  const identifier = `ip:${ip}`;
  const result = checkRateLimit(identifier, 'live');

  if (!result.allowed) {
    return apiRateLimitExceeded(result.retryAfter || 60);
  }

  return null;
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  keyType: 'live' | 'test' = 'live'
): { remaining: number; resetTime: number } {
  const config = RATE_LIMITS[keyType] || RATE_LIMITS.default;
  const entry = rateLimitStore.get(identifier);
  const now = Date.now();

  if (!entry || now >= entry.resetTime) {
    return {
      remaining: config.requests,
      resetTime: now + config.windowMs,
    };
  }

  return {
    remaining: Math.max(0, config.requests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for an identifier (admin function)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^localhost$/;

/**
 * Extract and validate the client IP from request headers, for use as a
 * rate-limit key. Mirrors proxy.ts's getClientIp() - without this, a raw
 * `x-forwarded-for` value lets a caller pick their own rate-limit bucket by
 * sending a different (even fake) value on every request.
 */
export function getSanitizedClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (IP_REGEX.test(ip)) {
      return ip;
    }
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    const ip = realIp.trim();
    if (IP_REGEX.test(ip)) {
      return ip;
    }
  }
  return "unknown";
}
