import crypto from 'crypto';
import prisma from '../src/lib/prisma';

async function testWebhookSuite() {
  const BASE_URL = 'http://localhost:3000';
  const VERIFY_TOKEN = 'slrj_digital_secure_wh_2026';

  console.log('\n=============================================================');
  console.log('SLRJ DIGITAL: META WHATSAPP CLOUD API WEBHOOK TEST SUITE');
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
  // 1. GET Webhook Verification Handshake (Meta Step 2 Verification)
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing GET /api/webhooks/whatsapp (Meta Handshake) ---');

  const challengeStr = 'META_CHALLENGE_STRING_ABCD_1234';
  const getSuccessUrl = `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
    VERIFY_TOKEN
  )}&hub.challenge=${encodeURIComponent(challengeStr)}`;

  const getRes = await fetch(getSuccessUrl);
  assert(getRes.status === 200, `GET verification returned HTTP 200 (got ${getRes.status})`);
  const challengeReceived = await getRes.text();
  assert(challengeReceived === challengeStr, `Challenge echoed verbatim: "${challengeReceived}"`);

  const contentType = getRes.headers.get('content-type') || '';
  assert(contentType.includes('text/plain'), `Content-Type is text/plain (got: ${contentType})`);

  // Invalid Token Test
  const getFailTokenUrl = `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=invalid_token_xyz&hub.challenge=${challengeStr}`;
  const getFailRes = await fetch(getFailTokenUrl);
  assert(getFailRes.status === 403, `Invalid verify token rejected with HTTP 403 Forbidden (got ${getFailRes.status})`);

  // Invalid Mode Test
  const getFailModeUrl = `${BASE_URL}/api/webhooks/whatsapp?hub.mode=unsubscribe&hub.verify_token=${encodeURIComponent(
    VERIFY_TOKEN
  )}&hub.challenge=${challengeStr}`;
  const getFailModeRes = await fetch(getFailModeUrl);
  assert(getFailModeRes.status === 403, `Invalid hub.mode rejected with HTTP 403 Forbidden (got ${getFailModeRes.status})`);

  // -------------------------------------------------------------------------
  // 2. POST Webhook Delivery Status Updates (Sent -> Delivered -> Read)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing POST /api/webhooks/whatsapp (Status Updates) ---');

  // Seed a message record in SUBMITTED state with exact WAMID
  const testWamid = `wamid.HBgL918466974408WH${Date.now()}`;
  const messageRecord = await prisma.message.create({
    data: {
      whatsappMessageId: testWamid,
      recipientNumber: '+918466974408',
      senderNumber: 'SLRJ DIGITAL (+91 84669 74408)',
      direction: 'OUTBOUND',
      messageType: 'TEMPLATE',
      templateName: 'hello_world',
      content: 'Template: hello_world',
      submissionStatus: 'SUBMITTED',
      deliveryStatus: 'SUBMITTED',
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });

  // Step 2a: Deliver "sent" event from Meta
  const sentPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '918466974408',
                phone_number_id: '109847291847192',
              },
              statuses: [
                {
                  id: testWamid,
                  status: 'sent',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  recipient_id: '918466974408',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const sentPostRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sentPayload),
  });
  assert(sentPostRes.status === 200, `POST sent status returned HTTP 200 (got ${sentPostRes.status})`);

  let dbMsg = await prisma.message.findUnique({ where: { whatsappMessageId: testWamid } });
  assert(dbMsg?.deliveryStatus === 'SENT', `Message status updated to SENT (got: ${dbMsg?.deliveryStatus})`);
  assert(dbMsg?.sentAt !== null, 'sentAt timestamp recorded from Meta event');

  // Step 2b: Deliver "delivered" event from Meta
  const deliveredPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '918466974408',
                phone_number_id: '109847291847192',
              },
              statuses: [
                {
                  id: testWamid,
                  status: 'delivered',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  recipient_id: '918466974408',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const delivPostRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deliveredPayload),
  });
  assert(delivPostRes.status === 200, 'POST delivered status returned HTTP 200');

  dbMsg = await prisma.message.findUnique({ where: { whatsappMessageId: testWamid } });
  assert(dbMsg?.deliveryStatus === 'DELIVERED', `Message status updated to DELIVERED (got: ${dbMsg?.deliveryStatus})`);
  assert(dbMsg?.deliveredAt !== null, 'deliveredAt timestamp recorded from Meta event');

  // Step 2c: Deliver "read" event from Meta
  const readPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '918466974408',
                phone_number_id: '109847291847192',
              },
              statuses: [
                {
                  id: testWamid,
                  status: 'read',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  recipient_id: '918466974408',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const readPostRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(readPayload),
  });
  assert(readPostRes.status === 200, 'POST read status returned HTTP 200');

  dbMsg = await prisma.message.findUnique({ where: { whatsappMessageId: testWamid } });
  assert(dbMsg?.deliveryStatus === 'READ', `Message status updated to READ (got: ${dbMsg?.deliveryStatus})`);
  assert(dbMsg?.readAt !== null, 'readAt timestamp recorded from Meta event');

  // Step 2d: Test Duplicate Event Idempotency
  // Re-send delivered event; status must NOT regress from READ to DELIVERED
  await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deliveredPayload),
  });
  dbMsg = await prisma.message.findUnique({ where: { whatsappMessageId: testWamid } });
  assert(dbMsg?.deliveryStatus === 'READ', 'Duplicate out-of-order event did NOT downgrade READ status');

  // -------------------------------------------------------------------------
  // 3. POST Webhook Delivery Failure Tracking
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing POST /api/webhooks/whatsapp (Failure Events) ---');
  const failWamid = `wamid.HBgL918466974408FAIL${Date.now()}`;
  await prisma.message.create({
    data: {
      whatsappMessageId: failWamid,
      recipientNumber: '+918466974408',
      direction: 'OUTBOUND',
      messageType: 'TEMPLATE',
      content: 'Template: hello_world',
      submissionStatus: 'SUBMITTED',
      deliveryStatus: 'SUBMITTED',
      status: 'SUBMITTED',
    },
  });

  const failedPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '918466974408',
                phone_number_id: '109847291847192',
              },
              statuses: [
                {
                  id: failWamid,
                  status: 'failed',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  recipient_id: '918466974408',
                  errors: [
                    {
                      code: 131026,
                      title: 'Message Undeliverable',
                      message: 'Message undeliverable to recipient handset',
                    },
                  ],
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const failPostRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(failedPayload),
  });
  assert(failPostRes.status === 200, 'POST failure event returned HTTP 200');

  const failedDbMsg = await prisma.message.findUnique({ where: { whatsappMessageId: failWamid } });
  assert(failedDbMsg?.deliveryStatus === 'FAILED', 'Message marked as FAILED');
  assert(failedDbMsg?.errorCode === '131026', 'Meta Error Code 131026 recorded');
  assert(Boolean(failedDbMsg?.errorDescription), 'Error description recorded');

  // -------------------------------------------------------------------------
  // 4. POST Inbound Customer Messages & STOP Opt-Out Handling
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing POST Inbound Message & STOP Opt-Out Detection ---');
  const inboundCustomerPhone = '+919988776655';
  const inboundCustomerDigits = '919988776655';
  const inboundMsgId = `wamid.HBgL${inboundCustomerDigits}INBOUND${Date.now()}`;

  // Create Contact to observe consent update
  const testContact = await prisma.contact.upsert({
    where: { mobileNumber: inboundCustomerPhone },
    update: { consentStatus: 'OPTED_IN' },
    create: {
      fullName: 'Inbound Test User',
      mobileNumber: inboundCustomerPhone,
      countryCode: '91',
      nationalNumber: '9988776655',
      consentStatus: 'OPTED_IN',
    },
  });

  const inboundPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '918466974408',
                phone_number_id: '109847291847192',
              },
              contacts: [{ profile: { name: 'Inbound Customer' }, wa_id: inboundCustomerDigits }],
              messages: [
                {
                  from: inboundCustomerDigits,
                  id: inboundMsgId,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: 'STOP' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const inboundRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inboundPayload),
  });
  assert(inboundRes.status === 200, 'POST inbound message returned HTTP 200');

  // Verify inbound message saved
  const inboundDb = await prisma.message.findUnique({ where: { whatsappMessageId: inboundMsgId } });
  assert(Boolean(inboundDb), 'Inbound message record saved in database');
  assert(inboundDb?.direction === 'INBOUND', 'Direction is INBOUND');
  assert(inboundDb?.content === 'STOP', 'Content recorded as STOP');

  // Verify suppression list entry added
  const suppressionEntry = await prisma.suppressionList.findUnique({ where: { mobileNumber: inboundCustomerPhone } });
  assert(Boolean(suppressionEntry), 'Customer automatically added to Suppression List on STOP');
  assert(suppressionEntry?.reason === 'USER_STOP', 'Suppression reason is USER_STOP');

  // Verify Contact consent updated to OPTED_OUT
  const updatedContact = await prisma.contact.findUnique({ where: { id: testContact.id } });
  assert(updatedContact?.consentStatus === 'OPTED_OUT', 'Contact consent automatically set to OPTED_OUT');

  // Clean up test records
  await prisma.message.deleteMany({
    where: { whatsappMessageId: { in: [testWamid, failWamid, inboundMsgId] } },
  });
  await prisma.suppressionList.deleteMany({ where: { mobileNumber: inboundCustomerPhone } });
  await prisma.contact.deleteMany({ where: { id: testContact.id } });

  console.log('\n=============================================================');
  console.log(`WEBHOOK TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

testWebhookSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
