import { cookies } from 'next/headers';
import crypto from 'crypto';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });
  
  return token;
}

export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('csrf_token')?.value || null;
}

export async function validateCSRFToken(providedToken: string): Promise<boolean> {
  const storedToken = await getCSRFToken();
  if (!storedToken || !providedToken) {
    return false;
  }
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  try {
    const storedBuffer = Buffer.from(storedToken, 'hex');
    const providedBuffer = Buffer.from(providedToken, 'hex');
    
    if (storedBuffer.length !== providedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(storedBuffer, providedBuffer);
  } catch {
    return false;
  }
}