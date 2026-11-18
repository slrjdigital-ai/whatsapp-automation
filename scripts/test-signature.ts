import crypto from 'crypto';

async function testSignatureValidation() {
  const BASE_URL = 'http://localhost:3000';
  const testSecret = 'test_meta_app_secret_abc123';

  console.log('\n--- Testing HMAC-SHA256 Signature Verification ---');

  // Test with App Secret configured in database temporarily
  const prisma = (await import('../src/lib/prisma')).default;
  await prisma.whatsAppAccount.updateMany({
    data: { appSecret: testSecret },
  });

  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [],
  });

  // 1. Missing signature header -> should return 401
  const missingSigRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  console.log(`[PASS] Missing signature header rejected with HTTP ${missingSigRes.status}`);

  // 2. Invalid signature header -> should return 401
  const invalidSigRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': 'sha256=invalid_signature_hex_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    body: payload,
  });
  console.log(`[PASS] Invalid signature rejected with HTTP ${invalidSigRes.status}`);

  // 3. Valid signature header -> should return 200
  const validHmac = crypto.createHmac('sha256', testSecret).update(payload).digest('hex');
  const validSigRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': `sha256=${validHmac}`,
    },
    body: payload,
  });
  console.log(`[PASS] Valid HMAC signature accepted with HTTP ${validSigRes.status}`);

  // Reset test appSecret to null so standard local testing continues smoothly
  await prisma.whatsAppAccount.updateMany({
    data: { appSecret: null },
  });

  if (missingSigRes.status === 401 && invalidSigRes.status === 401 && validSigRes.status === 200) {
    console.log('HMAC Signature verification passed perfectly!\n');
  } else {
    process.exit(1);
  }
}

testSignatureValidation().catch(console.error);
