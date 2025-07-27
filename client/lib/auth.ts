// lib/auth-actions.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Server actions run on the Next.js server (inside Docker)
// They need to reach nginx through Docker internal networking
const SERVER_API_URL = process.env.SERVER_API_URL || 'http://nginx_proxy:80';

console.log('🔧 Server Action API URL:', SERVER_API_URL);

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  console.log('🔍 Server Action - Login attempt:', { email });

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  try {
    console.log('📡 Making request to:', `${SERVER_API_URL}/api/v1/auth/login`);

    const requestBody = {
      email: email,
      password: password,
    };

    const response = await fetch(`${SERVER_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...requestBody }),
    });

    console.log('📡 Response status:', response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Login failed with status:', response.status);
      let errorMessage = 'Login failed';
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      
      return { error: errorMessage };
    }

    //after parsing, variable data is the whole response object, not the data field inside it.
    let parsedAuthResponse;
    try {
      parsedAuthResponse = JSON.parse(responseText);
      console.log('✅ Parsed response data:', parsedAuthResponse);
    } catch (parseError) {
      return { error: 'Invalid response from server' };
    }

    // Store in httpOnly cookies
    const cookieStore = await cookies();

    const token = parsedAuthResponse.data?.access_token;

    if (!token) {
      console.error('❌ No token in response');
      return { error: 'No authentication token received' };
    }
    
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Fetch and store user data using the centralized getServerUser function
    try {
      const userData = await getServerUser();
      
      if (userData) {
        console.log('✅ Login successful, token and user data stored');
        return { success: true };
      } else {
        console.error('❌ Failed to fetch user data from getServerUser');
        // Still return success since login worked, but user data fetch failed
        // The dashboard will handle fetching user data separately
        return { success: true };
      }
    } catch (userError) {
      console.error('❌ Error fetching user data with getServerUser:', userError);
      // Still return success since login worked, user data can be fetched later
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    return { error: 'Network error. Please try again.' };
  }
}

export async function registerAction(formData: FormData) {
  try {
    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    console.log("🔍 Server Action - Register attempt:", {
      email,
      first_name: firstName,
      last_name: lastName,
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

    console.log('📡 Response status:', response.status);


    if (!response.ok) {
      const errorText = await response.text();
      
      let errorMessage = "Registration failed";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorData.details || "Registration failed";
      } catch {
        errorMessage = errorText || "Registration failed";
      }
      
      console.log("❌ Registration failed with status:", response.status);
      return { error: errorMessage };
    }

    const data = await response.json();
    console.log("✅ Registration successful:", data);

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
    console.error("💥 Registration error:", error);
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
        console.error('Failed to parse user cookie:', e);
      }
    }
    
    // If no user data in cookie, fetch from backend
    try {
      console.log('📡 Fetching user data from:', `${SERVER_API_URL}/api/v1/me`);
      console.log('Token used for /api/v1/me:', token);

      const response = await fetch(`${SERVER_API_URL}/api/v1/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User data.data fetched from backend:', userData.data);
        console.log('✅ User data fetched from backend:', userData );
        
        // Store user data in cookie for future use
        cookieStore.set('auth_user', JSON.stringify(userData.data), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });
        
        return userData.data;
      } else {
        console.error('Failed to fetch user data:', response.status);  
        let errorMessage = 'Failed to fetch user data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        console.error(errorMessage);
        return null;  // Return null if user data fetch fails
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get user from server cookies:', error);
    return null;
  }
}

export async function getServerToken() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth_token')?.value || null;
  } catch (error) {
    console.error('Failed to get token from server cookies:', error);
    return null;
  }
} 

// Logout action
export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    cookieStore.delete("auth_token");
    cookieStore.delete("auth_user");
    console.log("✅ Logout successful");
  } catch (error) {
    console.error("💥 Logout error:", error);
  }
  redirect("/login");
}