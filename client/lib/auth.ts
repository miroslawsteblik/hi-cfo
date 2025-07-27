
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FinancialAppError, ErrorCode, ErrorLogger } from './errors';
import { validateCSRFToken } from './csrf';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from './rate-limit';
import { createSession, invalidateSession, getSession } from './session';

// Server actions run on the Next.js server (inside Docker)
// They need to reach nginx through Docker internal networking
const SERVER_API_URL = process.env.SERVER_API_URL || 'http://nginx_proxy:80';

export async function loginAction(formData: FormData) {
  // CSRF Protection
  const csrfToken = formData.get('csrf_token') as string;
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Invalid security token. Please refresh the page.' };
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Check rate limiting
  const rateCheck = await checkRateLimit(email);
  if (!rateCheck.allowed) {
    if (rateCheck.lockedUntil) {
      const lockMinutes = Math.ceil((rateCheck.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return { 
        error: `Account temporarily locked due to multiple failed attempts. Try again in ${lockMinutes} minutes.` 
      };
    }
  }

  try {
    const requestBody = {
      email: email,
      password: password,
    };

    const response = await fetch(`${SERVER_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Record failed login attempt
      await recordFailedAttempt(email);
      
      const errorText = await response.text();
      let errorMessage = 'Login failed';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new FinancialAppError({
        code: ErrorCode.AUTHENTICATION_FAILED,
        message: errorMessage,
        details: { status: response.status, context: 'login_action' }
      });
    }

    const parsedAuthResponse = await response.json();

    // Store in httpOnly cookies
    const cookieStore = await cookies();

    const accessToken = parsedAuthResponse.data?.access_token;
    const refreshToken = parsedAuthResponse.data?.refresh_token;

    if (!accessToken) {
      const error = new FinancialAppError({
        code: ErrorCode.AUTHENTICATION_FAILED,
        message: 'No authentication token received',
        details: { context: 'login_action' }
      });
      await ErrorLogger.getInstance().logError(error);
      return { error: error.message };
    }
    
    // Store access token (short-lived)
    cookieStore.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Store refresh token (longer-lived) if provided
    if (refreshToken) {
      cookieStore.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    // Clear failed attempts on successful login
    await clearFailedAttempts(email);
    
    // Create user session
    const userData = parsedAuthResponse.data?.user;
    if (userData) {
      await createSession(userData.id || userData.user_id, email);
    }
    
    ErrorLogger.getInstance().logInfo('Login successful, token stored', { context: 'login_action' });
    return { success: true };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.NETWORK_ERROR,
      message: 'Login failed due to network or server error',
      details: { originalError: error, context: 'login_action' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return { error: 'Network error. Please try again.' };
  }
}

export async function registerAction(formData: FormData) {
  // CSRF Protection
  const csrfToken = formData.get('csrf_token') as string;
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Invalid security token. Please refresh the page.' };
  }

  try {
    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    ErrorLogger.getInstance().logInfo("Server Action - Register attempt", {
      email,
      first_name: firstName,
      last_name: lastName,
      context: 'register_action'
    });
    
    // Client-side validation
    if (!firstName || !lastName || !email || !password) {
      return { error: "All fields are required" };
    }
    
    if (password !== confirmPassword) {
      return { error: "Passwords do not match" };
    }
    
    if (password.length < 6) {
      return { error: "Password must be at least 6 characters long" };
    }
    
    // Prepare request body matching backend UserRequest struct
    const requestBody = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
    };

    const response = await fetch(`${SERVER_API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      let errorMessage = "Registration failed";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorData.details || "Registration failed";
      } catch {
        errorMessage = errorText || "Registration failed";
      }
      
      throw new FinancialAppError({
        code: ErrorCode.VALIDATION_ERROR,
        message: errorMessage,
        details: { status: response.status, context: 'register_action' }
      });
    }

    const data = await response.json();
    ErrorLogger.getInstance().logInfo("Registration successful", { context: 'register_action' });

    // Set authentication cookies
    const cookieStore = await cookies();
    if (data.access_token) {
      cookieStore.set("access_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 2, // 2 hours
      });
    }

    if (data.refresh_token) {
      cookieStore.set("refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return { success: true, user: data.user };
  } catch (error) {
    const appError = new FinancialAppError({
      code: ErrorCode.NETWORK_ERROR,
      message: 'Registration failed due to network or server error',
      details: { originalError: error, context: 'register_action' }
    });
    await ErrorLogger.getInstance().logError(appError);
    return { error: "Network error. Please try again." };
  }
}

export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('auth_user')?.value;
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return null;
    }
    
    // If we have user data in cookie, return it
    if (userCookie) {
      try {
        return JSON.parse(userCookie);
      } catch (e) {
        await ErrorLogger.getInstance().logError(new FinancialAppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Failed to parse user cookie',
          details: { originalError: e, context: 'get_server_user' }
        }));
      }
    }
    
    // If no user data in cookie, fetch from backend using direct fetch (not API client)
    try {
      const response = await fetch(`${SERVER_API_URL}/api/v1/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `auth_token=${token}`,
        },
        cache: 'no-store', // Prevent caching issues
      });
      
      if (response.ok) {
        const userData = await response.json();
        return userData.data;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'Failed to get user from server cookies',
      details: { originalError: error, context: 'get_server_user' }
    }));
    return null;
  }
}

export async function getServerToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('auth_token')?.value;
    
    if (accessToken) {
      return accessToken;
    }
    
    // Try to refresh the token
    const refreshedToken = await refreshAccessToken();
    return refreshedToken;
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'Failed to get token from server cookies',
      details: { originalError: error, context: 'get_server_token' }
    }));
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;
    
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${SERVER_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid, clear all auth cookies
      cookieStore.delete('auth_token');
      cookieStore.delete('refresh_token');
      cookieStore.delete('auth_user');
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.data?.access_token;
    const newRefreshToken = data.data?.refresh_token;

    if (newAccessToken) {
      // Store new access token
      cookieStore.set('auth_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 15, // 15 minutes
        path: '/',
      });

      // Update refresh token if provided
      if (newRefreshToken) {
        cookieStore.set('refresh_token', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });
      }

      return newAccessToken;
    }

    return null;
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'Failed to refresh access token',
      details: { originalError: error, context: 'refresh_access_token' }
    }));
    return null;
  }
}

// Logout action
export async function logoutAction() {
  try {
    // Invalidate session
    await invalidateSession();
    
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    cookieStore.delete("auth_token");
    cookieStore.delete("auth_user");
    cookieStore.delete("csrf_token");
    
    ErrorLogger.getInstance().logInfo("Logout successful", { context: 'logout_action' });
  } catch (error) {
    await ErrorLogger.getInstance().logError(new FinancialAppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'Logout error',
      details: { originalError: error, context: 'logout_action' }
    }));
  }
  redirect("/login");
}