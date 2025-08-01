// Security Testing Suite
const { test, expect } = require('@playwright/test');

describe('Authentication Security Tests', () => {
  test('Should reject unauthenticated requests', async ({ request }) => {
    // Test protected endpoint without token
    const response = await request.get('/api/v1/accounts');
    expect(response.status()).toBe(401);
  });

  test('Should reject invalid tokens', async ({ request }) => {
    // Test with invalid token
    const response = await request.get('/api/v1/accounts', {
      headers: { 'Authorization': 'Bearer invalid_token' }
    });
    expect(response.status()).toBe(401);
  });

  test('Should implement rate limiting', async ({ request }) => {
    // Attempt multiple failed logins
    const promises = Array(10).fill().map(() => 
      request.post('/api/v1/auth/login', {
        data: { email: 'test@test.com', password: 'wrong' }
      })
    );
    
    const responses = await Promise.all(promises);
    const lastResponse = responses[responses.length - 1];
    
    // Should be rate limited after multiple attempts
    expect(lastResponse.status()).toBe(429);
  });

  test('Should require CSRF token', async ({ request }) => {
    // Test form submission without CSRF token
    const response = await request.post('/api/v1/auth/login', {
      data: { email: 'test@test.com', password: 'password' }
      // Missing CSRF token
    });
    expect(response.status()).toBe(403);
  });

  test('Should set secure cookies', async ({ page }) => {
    // Login and check cookie attributes
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'auth_token');
    
    expect(authCookie).toBeDefined();
    expect(authCookie.httpOnly).toBe(true);
    expect(authCookie.secure).toBe(process.env.NODE_ENV === 'production');
    expect(authCookie.sameSite).toBe('Strict');
  });
});

describe('Authorization Security Tests', () => {
  test('Users can only access their own data', async ({ request }) => {
    // Login as user1
    const user1Login = await request.post('/api/v1/auth/login', {
      data: { email: 'user1@test.com', password: 'password' }
    });
    const user1Token = (await user1Login.json()).access_token;

    // Try to access another user's data (should fail)
    const response = await request.get('/api/v1/accounts/user2_account_id', {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    expect(response.status()).toBe(403); // Forbidden
  });

  test('Should validate user ownership', async ({ request }) => {
    // Test that users can't modify other users' data
    const response = await request.put('/api/v1/accounts/other_user_account', {
      headers: { 'Authorization': 'Bearer valid_token' },
      data: { account_name: 'Hacked Account' }
    });
    expect(response.status()).toBe(403);
  });
});

describe('Input Security Tests', () => {
  test('Should sanitize SQL injection attempts', async ({ request }) => {
    const maliciousInput = "'; DROP TABLE accounts; --";
    const response = await request.post('/api/v1/accounts', {
      headers: { 'Authorization': 'Bearer valid_token' },
      data: { account_name: maliciousInput }
    });
    // Should not crash and should sanitize input
    expect(response.status()).not.toBe(500);
  });

  test('Should prevent XSS attacks', async ({ page }) => {
    const xssScript = '<script>alert("XSS")</script>';
    await page.goto('/accounts');
    await page.fill('[name="account_name"]', xssScript);
    await page.click('[type="submit"]');
    
    // Script should be escaped, not executed
    const alertDialog = page.locator('dialog');
    expect(await alertDialog.count()).toBe(0);
  });
});