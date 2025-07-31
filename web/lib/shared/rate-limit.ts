import { cookies } from 'next/headers';

interface LoginAttempt {
  timestamp: number;
  ip?: string;
}

interface RateLimitData {
  attempts: LoginAttempt[];
  lockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour

// In production, this should be stored in Redis or database
// For now, using in-memory storage (will reset on server restart)
const rateLimitStore = new Map<string, RateLimitData>();

export async function checkRateLimit(email: string, clientIP?: string): Promise<{ allowed: boolean; remainingAttempts?: number; lockedUntil?: Date }> {
  const key = email.toLowerCase();
  const now = Date.now();
  
  const data = rateLimitStore.get(key) || { attempts: [] };
  
  // Check if account is currently locked
  if (data.lockedUntil && now < data.lockedUntil) {
    return {
      allowed: false,
      lockedUntil: new Date(data.lockedUntil)
    };
  }
  
  // Remove old attempts outside the window
  data.attempts = data.attempts.filter(
    attempt => now - attempt.timestamp < ATTEMPT_WINDOW
  );
  
  // Check if too many attempts
  if (data.attempts.length >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCK_DURATION;
    rateLimitStore.set(key, data);
    
    return {
      allowed: false,
      lockedUntil: new Date(data.lockedUntil)
    };
  }
  
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - data.attempts.length
  };
}

export async function recordFailedAttempt(email: string, clientIP?: string): Promise<void> {
  const key = email.toLowerCase();
  const now = Date.now();
  
  const data = rateLimitStore.get(key) || { attempts: [] };
  
  // Add new failed attempt
  data.attempts.push({
    timestamp: now,
    ip: clientIP
  });
  
  // Remove old attempts
  data.attempts = data.attempts.filter(
    attempt => now - attempt.timestamp < ATTEMPT_WINDOW
  );
  
  rateLimitStore.set(key, data);
}

export async function clearFailedAttempts(email: string): Promise<void> {
  const key = email.toLowerCase();
  rateLimitStore.delete(key);
}

export async function getRemainingLockTime(email: string): Promise<number> {
  const key = email.toLowerCase();
  const data = rateLimitStore.get(key);
  
  if (!data?.lockedUntil) {
    return 0;
  }
  
  const remaining = data.lockedUntil - Date.now();
  return Math.max(0, remaining);
}