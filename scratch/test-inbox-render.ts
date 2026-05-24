async function main() {
  const baseUrl = 'https://kobikolay-crm.vercel.app';
  console.log('Logging in to Vercel production...');

  try {
    // 1. Get CSRF Token and Cookie
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = csrfRes.headers.get('set-cookie');
    
    console.log('CSRF Token obtained:', csrfToken);
    console.log('CSRF Cookie:', csrfCookie);

    if (!csrfToken || !csrfCookie) {
      console.error('Failed to get CSRF token or cookie');
      return;
    }

    // Parse the csrf token cookie to pass back
    const csrfCookieValue = csrfCookie.split(';')[0];

    // 2. Perform callback login
    const loginPayload = new URLSearchParams({
      email: 'admin@kobikolay.com',
      password: 'Amazon.90',
      csrfToken: csrfToken,
      callbackUrl: `${baseUrl}/inbox`,
      redirect: 'false'
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookieValue,
        'User-Agent': 'Mozilla/5.0'
      },
      body: loginPayload.toString()
    });

    console.log('Login Status:', loginRes.status);
    const loginText = await loginRes.text();
    console.log('Login Response preview:', loginText.substring(0, 1000));

    const sessionCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
    console.log('Session Cookies:', sessionCookies);

  } catch (e) {
    console.error('Error:', e);
  }
}

main();
