import { NextRequest, NextResponse } from 'next/server';
import { getUserSessions, invalidateUserSessions, getSession } from '@/lib/auth/session';
import { getServerUser } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all sessions for the user
    const userId = user.id || user.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }
    const sessions = await getUserSessions(userId);
    
    // Remove sensitive information before sending
    const safeSessions = sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      ipAddress: session.ipAddress ? session.ipAddress.replace(/\.\d+$/, '.***') : 'Unknown',
      userAgent: session.userAgent ? session.userAgent.substring(0, 100) : 'Unknown',
      isCurrent: false 
    }));

    return NextResponse.json({ sessions: safeSessions });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const sessionId = url.searchParams.get('sessionId');

    if (action === 'revoke-all') {
      // Get current session ID to exclude it
      const currentSession = await getSession();
      const currentSessionId = currentSession?.id;
      
      const userId = user.id || user.user_id;
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
      }
      const invalidatedCount = await invalidateUserSessions(userId, currentSessionId);
      return NextResponse.json({ message: `Revoked ${invalidatedCount} sessions` });
    } else if (action === 'revoke-session' && sessionId) {
      const userId = user.id || user.user_id;
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
      }
      await invalidateUserSessions(userId, sessionId);
      return NextResponse.json({ message: 'Session revoked' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}