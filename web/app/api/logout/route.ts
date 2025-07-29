import { NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/session';
import { ErrorLogger, FinancialAppError, ErrorCode } from '@/lib/errors';

export async function POST() {
  try {
    // Invalidate session
    await invalidateSession();
    
    // Create response with redirect
    const response = NextResponse.json({ success: true });
    
    // Clear all authentication cookies by setting them to expired
    const cookieOptions = {
      path: '/',
      expires: new Date(0), // Past date to delete
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      httpOnly: true
    };
    
    // Clear each cookie individually
    response.cookies.set('access_token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('auth_token', '', cookieOptions);
    response.cookies.set('auth_user', '', cookieOptions);
    response.cookies.set('csrf_token', '', cookieOptions);
    
    ErrorLogger.getInstance().logInfo("Logout successful via API route", { context: 'logout_api' });
    
    return response;
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'Logout API error',
      details: { originalError: error, context: 'logout_api' }
    }));
    
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}