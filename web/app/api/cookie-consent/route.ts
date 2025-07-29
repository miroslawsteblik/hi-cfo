import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CookieConsent, DEFAULT_CONSENT } from '@/lib/cookie-consent';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const consentCookie = cookieStore.get('cookie_consent');
    
    if (consentCookie) {
      const consent = JSON.parse(consentCookie.value);
      return NextResponse.json({ consent });
    }
    
    return NextResponse.json({ consent: null });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get consent' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const consent = await request.json();
    
    // Validate consent object
    if (!consent || typeof consent !== 'object') {
      return NextResponse.json({ error: 'Invalid consent data' }, { status: 400 });
    }

    // Ensure essential cookies are always enabled
    const validatedConsent: CookieConsent = {
      ...consent,
      essential: true,
      timestamp: Date.now(),
      version: DEFAULT_CONSENT.version
    };

    // Set cookie with 1 year expiration
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('cookie_consent', JSON.stringify(validatedConsent), {
      expires,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false // Allow client-side access for the consent banner
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }
}