import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface Session {
  id: string;
  userId: string;
  email: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
}

// In production, store this in Redis or database
const sessionStore = new Map<string, Session>();

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string, email: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const sessionId = generateSessionId();
  const now = new Date();
  
  const session: Session = {
    id: sessionId,
    userId,
    email,
    createdAt: now,
    lastActivity: now,
    ipAddress,
    userAgent,
    isValid: true
  };
  
  sessionStore.set(sessionId, session);
  
  // Store session ID in httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  
  return sessionId;
}

export async function getSession(sessionId?: string): Promise<Session | null> {
  if (!sessionId) {
    const cookieStore = await cookies();
    sessionId = cookieStore.get('session_id')?.value;
  }
  
  if (!sessionId) {
    return null;
  }
  
  const session = sessionStore.get(sessionId);
  if (!session || !session.isValid) {
    return null;
  }
  
  // Check if session has expired (7 days of inactivity)
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  if (Date.now() - session.lastActivity.getTime() > maxAge) {
    session.isValid = false;
    return null;
  }
  
  // Update last activity
  session.lastActivity = new Date();
  sessionStore.set(sessionId, session);
  
  return session;
}

export async function invalidateSession(sessionId?: string): Promise<void> {
  if (!sessionId) {
    const cookieStore = await cookies();
    sessionId = cookieStore.get('session_id')?.value;
  }
  
  if (sessionId) {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.isValid = false;
      sessionStore.set(sessionId, session);
    }
    
    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete('session_id');
  }
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const sessions: Session[] = [];
  
  for (const [, session] of sessionStore) {
    if (session.userId === userId && session.isValid) {
      sessions.push(session);
    }
  }
  
  return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}

export async function invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  let invalidatedCount = 0;
  
  for (const [sessionId, session] of sessionStore) {
    if (session.userId === userId && session.isValid && sessionId !== exceptSessionId) {
      session.isValid = false;
      sessionStore.set(sessionId, session);
      invalidatedCount++;
    }
  }
  
  return invalidatedCount;
}

export async function cleanExpiredSessions(): Promise<number> {
  let cleanedCount = 0;
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  
  for (const [sessionId, session] of sessionStore) {
    if (now - session.lastActivity.getTime() > maxAge) {
      sessionStore.delete(sessionId);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}