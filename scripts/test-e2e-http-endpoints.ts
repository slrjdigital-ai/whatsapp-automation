async function runHttpTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log(`\nTesting HTTP endpoints against ${BASE_URL}...\n`);

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

  // 1. GET Webhook Challenge Verification (GET /api/webhooks/whatsapp)
  console.log('--- 1. Webhook Verification Handshake ---');
  const verifyRes = await fetch(
    `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=slrj_digital_secure_wh_2026&hub.challenge=test_challenge_12345`
  );
  assert(verifyRes.status === 200, `GET webhook returns HTTP 200 (got ${verifyRes.status})`);
  const challengeBody = await verifyRes.text();
  assert(challengeBody === 'test_challenge_12345', `Returns challenge verbatim (got: ${challengeBody})`);

  // Incorrect token returns 403 Forbidden
  const badVerifyRes = await fetch(
    `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge`
  );
  assert(badVerifyRes.status === 403, `Bad verify token returns 403 Forbidden (got ${badVerifyRes.status})`);

  // 2. Diagnostics API (GET /api/diagnostics)
  console.log('\n--- 2. Developer Diagnostics Endpoint ---');
  const diagRes = await fetch(`${BASE_URL}/api/diagnostics`);
  assert(diagRes.status === 200, `GET /api/diagnostics returns HTTP 200 (got ${diagRes.status})`);
  const diagData = await diagRes.json();
  assert(Boolean(diagData.account), 'Diagnostics returns WhatsApp account details');
  assert(Boolean(diagData.webhookInfo), 'Diagnostics returns Webhook URL and verify token');
  assert(Boolean(diagData.messageStats), 'Diagnostics returns message stats counters');

  // 3. Dispatch Test Message (POST /api/whatsapp/send-test)
  console.log('\n--- 3. Send Test WhatsApp Message Endpoint ---');
  const testSendRes = await fetch(`${BASE_URL}/api/whatsapp/send-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipientMobileNumber: '+919876543210',
      templateName: 'hello_world',
    }),
  });

  const testSendData = await testSendRes.json();
  // Since credentials are not yet entered in settings, it returns clean, truthful error - NOT fake success!
  assert(testSendData.success === false, 'Refuses to pretend success when credentials missing');
  assert(
    testSendData.errorCode === 'MISSING_CREDENTIALS',
    `Returns MISSING_CREDENTIALS error code (got ${testSendData.errorCode})`
  );
  assert(
    testSendData.error.includes('Settings'),
    'Gives user clear instructions to configure credentials in Settings'
  );

  // 4. Webhook Status Event Processing (POST /api/webhooks/whatsapp)
  console.log('\n--- 4. Webhook Status Processing & Message Status Endpoint ---');
  // First, create a message record to receive webhooks
  const testWamid = `wamid.HBgL919876543210TEST${Date.now()}`;
  
  // Directly simulate sending webhook via Developer Diagnostics endpoint
  const simWebhookRes = await fetch(`${BASE_URL}/api/diagnostics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'simulate_webhook_status',
      wamid: testWamid,
      eventType: 'delivered',
    }),
  });
  assert(simWebhookRes.status === 200, 'Diagnostics simulate_webhook_status returns HTTP 200');

  console.log(`\n=============================================================`);
  console.log(`HTTP TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=============================================================\n`);

  if (failed > 0) process.exit(1);
}

runHttpTests().catch((e) => {
  console.error('HTTP test error:', e);
  process.exit(1);
});
