import { NextResponse } from 'next/server';
import { setCSRFToken } from '@/lib/auth/csrf';

export async function GET() {
  try {
    const token = await setCSRFToken();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
  }
}