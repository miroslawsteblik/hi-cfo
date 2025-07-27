// lib/api-client.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SERVER_API_URL = process.env.SERVER_API_URL || 'http://nginx_proxy:80';

// Helper function to make authenticated requests to Go backend
export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  console.log('🔍 Auth Debug:', {
    endpoint,
    hasToken: !!token,
    tokenPrefix: token?.substring(0, 10) + '...'
  });
  
  if (!token) {
    console.warn('❌ No auth token found, redirecting to login');
    redirect('/login');
  }

  const response = await fetch(`${SERVER_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    console.warn('❌ 401 Unauthorized response from backend:', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      hasToken: !!token
    });
    redirect('/login');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  // Handle empty responses (like 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  // Check if response has content before trying to parse JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  return response.json();
}