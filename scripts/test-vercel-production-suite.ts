async function testVercelProductionSuite() {
  const BASE_URL = 'http://localhost:3000';
  console.log('\n=============================================================');
  console.log('SLRJ DIGITAL: VERCEL PRODUCTION DEPLOYMENT VALIDATION SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. WhatsApp Webhook Accessibility (Must be publicly open through middleware)
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Webhook Public Access (Middleware Bypass) ---');
  const getVerifyUrl = `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=slrj_digital_secure_wh_2026&hub.challenge=VERCEL_PROD_CHALLENGE_777`;
  const getVerifyRes = await fetch(getVerifyUrl);
  assert(getVerifyRes.status === 200, `GET /api/webhooks/whatsapp returns HTTP 200 (got ${getVerifyRes.status})`);
  const bodyText = await getVerifyRes.text();
  assert(bodyText === 'VERCEL_PROD_CHALLENGE_777', `Challenge echoed properly: "${bodyText}"`);

  // -------------------------------------------------------------------------
  // 2. Middleware Security (Protected Endpoints Block Unauthenticated Access)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Middleware Security & Auth Enforcement ---');
  // API route without cookie must return 401
  const unauthApiRes = await fetch(`${BASE_URL}/api/contacts`);
  assert(unauthApiRes.status === 401, `Protected API /api/contacts blocked with HTTP 401 (got ${unauthApiRes.status})`);

  // Protected UI page without cookie must redirect (or follow redirect to login)
  const unauthPageRes = await fetch(`${BASE_URL}/campaigns/new`, { redirect: 'manual' });
  assert(
    unauthPageRes.status === 307 || unauthPageRes.status === 302,
    `Protected page redirects unauthenticated visitor to login (got HTTP ${unauthPageRes.status})`
  );
  const locationHeader = unauthPageRes.headers.get('location') || '';
  assert(locationHeader.includes('/login'), `Redirect destination includes /login (got: ${locationHeader})`);

  // Public portal /consent must be accessible
  const consentPageRes = await fetch(`${BASE_URL}/consent`);
  assert(consentPageRes.status === 200, `Customer consent portal is publicly accessible (got HTTP ${consentPageRes.status})`);

  // -------------------------------------------------------------------------
  // 3. Vercel Cron Endpoint (/api/cron/campaigns)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Vercel Background Cron Endpoint ---');
  const cronRes = await fetch(`${BASE_URL}/api/cron/campaigns`);
  assert(cronRes.status === 200, `Cron endpoint returns HTTP 200 (got ${cronRes.status})`);
  const cronData = await cronRes.json();
  assert(cronData.success === true, 'Cron execution succeeded');
  assert(typeof cronData.processedCampaigns === 'number', `Reported processed campaigns: ${cronData.processedCampaigns}`);

  // -------------------------------------------------------------------------
  // 4. Authenticated Session Flow & Diagnostics
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Admin Authentication Flow & Diagnostics ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@slrjdigital.in',
      password: 'Admin@123456',
    }),
  });

  assert(loginRes.status === 200, `Admin login returns HTTP 200 (got ${loginRes.status})`);
  const setCookie = loginRes.headers.get('set-cookie');
  assert(Boolean(setCookie && setCookie.includes('slrj_auth_token')), 'Authentication cookie slrj_auth_token issued');

  // Request protected diagnostics with the auth cookie
  const diagRes = await fetch(`${BASE_URL}/api/diagnostics`, {
    headers: { Cookie: setCookie || '' },
  });
  assert(diagRes.status === 200, `Authenticated request to /api/diagnostics returns HTTP 200 (got ${diagRes.status})`);

  console.log('\n=============================================================');
  console.log(`VERCEL VALIDATION SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

testVercelProductionSuite().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
